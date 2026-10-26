using FluentAssertions;
using MediatR;
using NSubstitute;
using Skerp.Application.Abstractions.Data;
using Skerp.Application.Abstractions.Time;
using Skerp.Application.Behaviors;
using Skerp.Application.PurchaseOrders;
using Skerp.Application.PurchaseOrders.Create;
using Skerp.Application.PurchaseOrders.LineItems;
using Skerp.Application.PurchaseOrders.Monitoring;
using Skerp.Domain.Customers;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;

namespace Skerp.Unit.Tests.Application.PurchaseOrders;

/// <summary>
/// The brief's minimum creation tests, run through the same pipeline the API uses: the validation
/// behaviour, then the handler with substituted repositories.
/// </summary>
public class CreatePurchaseOrderTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 23, 9, 0, 0, TimeSpan.Zero);

    private readonly IPurchaseOrderRepository _purchaseOrders = Substitute.For<IPurchaseOrderRepository>();
    private readonly ICustomerRepository _customers = Substitute.For<ICustomerRepository>();
    private readonly IProductRepository _products = Substitute.For<IProductRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IDateTimeOffsetProvider _clock = Substitute.For<IDateTimeOffsetProvider>();
    private readonly IPurchaseOrderChangeNotifier _changeNotifier = Substitute.For<IPurchaseOrderChangeNotifier>();

    public CreatePurchaseOrderTests()
    {
        _clock.UtcNow.Returns(Now);
        _products.FindByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns([]);
        _products.FindExistingSkusAsync(Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>()).Returns([]);
    }

    [Fact]
    public async Task ValidOrder_IsCreatedPendingWithServerTotals()
    {
        var result = await SendAsync(ValidCommand());

        result.IsSuccess.Should().BeTrue();
        result.Value.Reference.Should().Be("PO-2026-100");
        result.Value.Status.Should().Be(new NamedValue(10, "Pending"));
        result.Value.LineItems.Select(l => l.Total).Should().Equal(49.95m, 38.97m);
        result.Value.Total.Should().Be(88.92m);
        _purchaseOrders.Received(1).Add(Arg.Is<PurchaseOrder>(o => o.StatusChanges.Count == 1));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _changeNotifier.Received(1).NotifyAsync(
            new PurchaseOrderChange(result.Value.Id, PurchaseOrderChangeKind.Created),
            Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task NullReference_FailsAsInvalidRequest(string? reference)
    {
        await ShouldFailValidation(ValidCommand() with { Reference = reference }, "PurchaseOrder.ReferenceRequired");
    }

    [Fact]
    public async Task ReferenceWithSpaces_FailsAsInvalidRequest()
    {
        await ShouldFailValidation(ValidCommand() with { Reference = "PO 2026 001" }, "PurchaseOrder.ReferenceInvalidCharacters");
    }

    [Fact]
    public async Task ExistingReference_FailsAsDuplicate()
    {
        _purchaseOrders.ReferenceExistsAsync("PO-2026-100", Arg.Any<CancellationToken>()).Returns(true);

        var result = await SendAsync(ValidCommand() with { Reference = " po-2026-100 " });

        result.Error.Should().Be(PurchaseOrderErrors.DuplicateReferenceNumber);
        await ShouldNotSave();
    }

    [Fact]
    public async Task NullCustomerName_FailsAsInvalidRequest()
    {
        await ShouldFailValidation(
            ValidCommand() with { Customer = new CustomerInput(null, null, "orders@alpha.co.za") },
            "Customer.NameRequired");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not-an-email")]
    [InlineData("orders@alpha")]
    public async Task NullOrInvalidCustomerEmail_FailsAsInvalidRequest(string? email)
    {
        await ShouldFailValidation(
            ValidCommand() with { Customer = new CustomerInput(null, "Alpha Studios", email) },
            "Customer.InvalidEmail");
    }

    [Fact]
    public async Task ExistingCustomerName_FailsAsDuplicate()
    {
        _customers.NameExistsAsync("Alpha Studios", Arg.Any<CancellationToken>()).Returns(true);

        var result = await SendAsync(ValidCommand() with { Customer = new CustomerInput(null, "  Alpha   Studios ", "x@alpha.co.za") });

        result.Error.Should().Be(CustomerErrors.DuplicateName);
        await ShouldNotSave();
    }

    [Fact]
    public async Task CustomerIdWithNameAndEmail_FailsAsInvalidRequest()
    {
        await ShouldFailValidation(
            ValidCommand() with { Customer = new CustomerInput(Guid.NewGuid(), "Alpha Studios", "orders@alpha.co.za") },
            "Customer.Ambiguous");
    }

    [Fact]
    public async Task LineWithAnId_FailsAsInvalidRequest()
    {
        await ShouldFailValidation(
            WithLines(new LineItemInput(Guid.NewGuid(), NewProduct("SDA001"), 1, 1m)),
            "PurchaseOrder.UnknownLineItem");
    }

    [Fact]
    public async Task ExistingCustomer_IsUsedAsStored()
    {
        var stored = Customer.Create("Alpha Studios", "orders@alpha.co.za").Value;
        _customers.FindByIdAsync(stored.Id, Arg.Any<CancellationToken>()).Returns(stored);

        var result = await SendAsync(ValidCommand() with { Customer = new CustomerInput(stored.Id, "Renamed", null) });

        result.Value.Customer.Should().Be(new CustomerSummary(stored.Id, "Alpha Studios", "orders@alpha.co.za"));
        _customers.DidNotReceive().Add(Arg.Any<Customer>());
    }

    [Theory]
    [InlineData(null, "9.99")]
    [InlineData(0, "9.99")]
    [InlineData(-1, "9.99")]
    public async Task NullOrNonPositiveQuantity_FailsAsInvalidRequest(int? quantity, string price)
    {
        await ShouldFailValidation(
            WithLines(new LineItemInput(null, NewProduct("SDA001"), quantity, decimal.Parse(price, System.Globalization.CultureInfo.InvariantCulture))),
            "PurchaseOrder.InvalidQuantity");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("0")]
    [InlineData("-0.01")]
    public async Task NullOrNonPositivePrice_FailsAsInvalidRequest(string? price)
    {
        await ShouldFailValidation(
            WithLines(new LineItemInput(null, NewProduct("SDA001"), 1, price is null ? null : decimal.Parse(price, System.Globalization.CultureInfo.InvariantCulture))),
            "PurchaseOrder.InvalidPrice");
    }

    [Fact]
    public async Task NullSku_FailsAsInvalidRequest()
    {
        await ShouldFailValidation(
            WithLines(new LineItemInput(null, new ProductInput(null, null, "Delicious Soda"), 1, 1m)),
            "Product.SkuRequired");
    }

    [Fact]
    public async Task NullProductName_FailsAsInvalidRequest()
    {
        await ShouldFailValidation(
            WithLines(new LineItemInput(null, new ProductInput(null, "SDA001", null), 1, 1m)),
            "Product.NameRequired");
    }

    [Fact]
    public async Task ProductIdWithSkuAndName_FailsAsInvalidRequest()
    {
        await ShouldFailValidation(
            WithLines(new LineItemInput(null, new ProductInput(Guid.NewGuid(), "SDA001", "Delicious Soda"), 1, 1m)),
            "Product.Ambiguous");
    }

    [Fact]
    public async Task ExistingSku_FailsAsDuplicate()
    {
        _products.FindExistingSkusAsync(Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>())
            .Returns(["SDA001"]);

        var result = await SendAsync(WithLines(new LineItemInput(null, NewProduct("sda001"), 1, 1m)));

        result.Error.Should().Be(ProductErrors.DuplicateSku);
        await ShouldNotSave();
    }

    [Fact]
    public async Task SameNewSkuTwiceInOneRequest_FailsAsDuplicate()
    {
        var result = await SendAsync(WithLines(
            new LineItemInput(null, NewProduct("SDA001"), 1, 1m),
            new LineItemInput(null, NewProduct("sda001"), 2, 1m)));

        result.Error.Should().Be(ProductErrors.DuplicateSku);
    }

    [Fact]
    public async Task UnknownProductId_FailsAsNotFound()
    {
        var result = await SendAsync(WithLines(new LineItemInput(null, new ProductInput(Guid.NewGuid(), null, null), 1, 1m)));

        result.Error.Should().Be(ProductErrors.NotFound);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public async Task ZeroOrMoreThanOneHundredLineItems_FailsAsInvalidRequest(int count)
    {
        var lines = Enumerable.Range(0, count)
            .Select(i => new LineItemInput(null, NewProduct($"SKU{i:000}"), 1, 1m))
            .ToArray();

        await ShouldFailValidation(WithLines(lines), "PurchaseOrder.InvalidLineItemCount");
    }

    [Fact]
    public async Task NullLineItems_FailsAsInvalidRequest()
    {
        await ShouldFailValidation(ValidCommand() with { LineItems = null }, "PurchaseOrder.InvalidLineItemCount");
    }

    [Theory]
    [InlineData((short)20)]
    [InlineData((short)60)]
    [InlineData((short)90)]
    [InlineData((short)11)]
    [InlineData(null)]
    public async Task NonPendingStatus_FailsAsInvalidRequest(short? statusId)
    {
        await ShouldFailValidation(ValidCommand() with { StatusId = statusId }, "PurchaseOrder.InitialStatusMustBePending");
    }

    [Theory]
    [InlineData((short)0)]
    [InlineData((short)4)]
    public async Task UndefinedCurrency_FailsAsInvalidRequest(short currencyId)
    {
        await ShouldFailValidation(ValidCommand() with { CurrencyId = currencyId }, "PurchaseOrder.InvalidCurrency");
    }

    private static CreatePurchaseOrderCommand ValidCommand() => new(
        Reference: "PO-2026-100",
        Customer: new CustomerInput(null, "Alpha Studios", "orders@alpha.co.za"),
        CurrencyId: (short)CurrencyId.Zar,
        StatusId: (short)StatusId.Pending,
        LineItems:
        [
            new LineItemInput(null, NewProduct("SDA001"), 5, 9.99m),
            new LineItemInput(null, NewProduct("CAN001"), 3, 12.99m),
        ],
        Notes: null);

    private static CreatePurchaseOrderCommand WithLines(params LineItemInput[] lines) => ValidCommand() with { LineItems = lines };

    private static ProductInput NewProduct(string sku) => new(null, sku, "Delicious " + sku);

    private async Task ShouldFailValidation(CreatePurchaseOrderCommand command, string expectedCode)
    {
        var result = await SendAsync(command);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
        result.Error.Code.Should().Be(expectedCode);
        await ShouldNotSave();
    }

    private async Task ShouldNotSave()
    {
        _purchaseOrders.DidNotReceive().Add(Arg.Any<PurchaseOrder>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        await _changeNotifier.DidNotReceiveWithAnyArgs().NotifyAsync(default!, default);
    }

    private Task<Result<PurchaseOrderResponse>> SendAsync(CreatePurchaseOrderCommand command)
    {
        var handler = new CreatePurchaseOrderCommandHandler(
            _purchaseOrders,
            _customers,
            new LineItemProductResolver(_products),
            _unitOfWork,
            _clock,
            _changeNotifier);
        var pipeline = new ValidationBehavior<CreatePurchaseOrderCommand, Result<PurchaseOrderResponse>>(
            [new CreatePurchaseOrderCommandValidator()]);

        return pipeline.Handle(command, ct => handler.Handle(command, ct), CancellationToken.None);
    }
}
