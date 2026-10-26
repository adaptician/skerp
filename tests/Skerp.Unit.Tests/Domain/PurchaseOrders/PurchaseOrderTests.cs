using FluentAssertions;
using Skerp.Domain.Customers;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;

namespace Skerp.Unit.Tests.Domain.PurchaseOrders;

public class PurchaseOrderTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 23, 9, 0, 0, TimeSpan.Zero);
    private static readonly Customer Alpha = Customer.Create("Alpha Studios", "orders@alpha.co.za").Value;
    private static readonly Product Soda = Product.Create("SDA001", "Delicious Soda").Value;
    private static readonly Product Candy = Product.Create("CAN001", "Delicious Candy").Value;

    [Fact]
    public void Create_ValidOrder_StartsPendingWithCalculatedTotalsAndOneStatusChange()
    {
        var order = PurchaseOrder.Create(
            " po-2026-100 ",
            Alpha,
            CurrencyId.Zar,
            notes: null,
            [new(Soda, 5, 9.99m), new(Candy, 3, 12.99m)],
            Now).Value;

        order.Reference.Should().Be("PO-2026-100");
        order.CustomerId.Should().Be(Alpha.Id);
        order.CurrentStatusId.Should().Be(StatusId.Pending);
        order.LineItems.Select(l => l.Total).Should().Equal(49.95m, 38.97m);
        order.Total.Should().Be(88.92m);
        order.StatusChanges.Should().ContainSingle()
            .Which.Should().Match<PurchaseOrderStatusChange>(s => s.StatusId == StatusId.Pending && s.ChangedAt == Now);
    }

    [Theory]
    [InlineData(null, "PurchaseOrder.ReferenceRequired")]
    [InlineData("PO 2026 001", "PurchaseOrder.ReferenceInvalidCharacters")]
    public void Create_InvalidReference_Fails(string? reference, string expectedCode)
    {
        Create(reference, [new(Soda, 1, 1m)]).Error.Code.Should().Be(expectedCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public void Create_LineItemCountOutsideOneToOneHundred_Fails(int count)
    {
        var lines = Enumerable.Range(0, count).Select(_ => new PurchaseOrder.NewLineItem(Soda, 1, 1m)).ToList();

        Create("PO-2026-100", lines).Error.Code.Should().Be("PurchaseOrder.InvalidLineItemCount");
    }

    [Fact]
    public void Create_OneHundredLineItems_IsAllowed()
    {
        var lines = Enumerable.Range(0, 100).Select(_ => new PurchaseOrder.NewLineItem(Soda, 1, 1m)).ToList();

        Create("PO-2026-100", lines).IsSuccess.Should().BeTrue();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(1001)]
    public void Create_QuantityOutOfRange_Fails(int quantity)
    {
        Create("PO-2026-100", [new(Soda, quantity, 1m)]).Error.Code.Should().Be("PurchaseOrder.InvalidQuantity");
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-9.99")]
    [InlineData("0.009")]
    [InlineData("1.23456")]
    [InlineData("1000000000")]
    public void Create_PriceOutOfRangeOrTooPrecise_Fails(string price)
    {
        Create("PO-2026-100", [new(Soda, 1, decimal.Parse(price, System.Globalization.CultureInfo.InvariantCulture))])
            .Error.Code.Should().Be("PurchaseOrder.InvalidPrice");
    }

    [Fact]
    public void Create_UndefinedCurrency_Fails()
    {
        PurchaseOrder.Create("PO-2026-100", Alpha, (CurrencyId)9, null, [new(Soda, 1, 1m)], Now)
            .Error.Code.Should().Be("PurchaseOrder.InvalidCurrency");
    }

    [Fact]
    public void Create_NotesLongerThan512_Fail()
    {
        PurchaseOrder.Create("PO-2026-100", Alpha, CurrencyId.Zar, new string('n', 513), [new(Soda, 1, 1m)], Now)
            .Error.Code.Should().Be("PurchaseOrder.NotesTooLong");
    }

    [Fact]
    public void Create_BlankNotes_AreStoredAsNull()
    {
        PurchaseOrder.Create("PO-2026-100", Alpha, CurrencyId.Zar, "   ", [new(Soda, 1, 1m)], Now)
            .Value.Notes.Should().BeNull();
    }

    private static Skerp.Domain.Shared.Result<PurchaseOrder> Create(string? reference, IReadOnlyList<PurchaseOrder.NewLineItem> lines) =>
        PurchaseOrder.Create(reference, Alpha, CurrencyId.Zar, null, lines, Now);
}
