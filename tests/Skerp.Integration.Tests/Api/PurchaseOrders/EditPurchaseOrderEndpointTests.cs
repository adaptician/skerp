using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;
using Skerp.Infrastructure.Persistence;

namespace Skerp.Integration.Tests.Api.PurchaseOrders;

/// <summary><c>PUT /api/v1/purchase-orders/{id}</c> on real SQLite: line diffing and soft deletes.</summary>
public sealed class EditPurchaseOrderEndpointTests(PurchaseOrdersApiFactory factory) : IClassFixture<PurchaseOrdersApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task ChangeRemoveAndAdd_UpdatesTheRowAndSoftDeletesTheRemovedLine()
    {
        var order = await CreateOrderAsync();
        var (a, b) = (order.LineItems[0], order.LineItems[1]);
        var suffix = Suffix();

        var response = await PutAsync(order.Id, new
        {
            currencyId = 2,
            notes = "Side entrance",
            lineItems = new object[]
            {
                new { id = a.Id, product = new { id = a.ProductId }, quantity = 2, price = 24.5m },
                new { product = new { sku = $" ed{suffix} ", name = "  salted   kettle chips " }, quantity = 12, price = 18.75m },
            },
        });
        var row = (await response.Content.ReadFromJsonAsync<ResultBody<RowDto>>())!.Value!;

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        row.Total.Should().Be(274m);
        row.Currency.Name.Should().Be("USD");
        row.LineItemCount.Should().Be(2);
        row.IsEditable.Should().BeTrue();

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var lines = await db.Set<PurchaseOrderLineItem>().IgnoreQueryFilters()
            .Where(l => l.PurchaseOrderId == order.Id).Include(l => l.Product).ToListAsync();
        lines.Should().HaveCount(3);
        lines.Single(l => l.Id == a.Id).Should().Match<PurchaseOrderLineItem>(l => l.Quantity == 2 && l.Total == 49m && !l.IsDeleted);
        lines.Single(l => l.Id == b.Id).Should().Match<PurchaseOrderLineItem>(l => l.IsDeleted && l.DeletedAt != null);
        lines.Single(l => l.Id != a.Id && l.Id != b.Id).Product!.Should().Match<Product>(p =>
            p.Sku == $"ED{suffix}" && p.Name == "salted kettle chips");
        (await db.Set<Product>().AnyAsync(p => p.Id == b.ProductId)).Should().BeTrue("removing a line never touches its product");
        (await db.Set<PurchaseOrder>().SingleAsync(o => o.Id == order.Id)).Notes.Should().Be("Side entrance");
    }

    [Fact]
    public async Task UnchangedRequest_WritesNoLineItem()
    {
        var order = await CreateOrderAsync();
        var before = await StampsAsync(order.Id);

        var response = await PutAsync(order.Id, new { currencyId = 1, lineItems = Unchanged(order) });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await StampsAsync(order.Id)).Should().BeEquivalentTo(before);
    }

    [Fact]
    public async Task CurrencyAndNotesOnly_UpdateTheOrderAndLeaveTheLines()
    {
        var order = await CreateOrderAsync();
        var before = await StampsAsync(order.Id);

        var response = await PutAsync(order.Id, new { currencyId = 3, notes = "Ring first", lineItems = Unchanged(order) });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var after = await StampsAsync(order.Id);
        after.Lines.Should().Equal(before.Lines);
        after.Order.Should().NotBe(before.Order);
        after.Total.Should().Be(before.Total);
    }

    [Fact]
    public async Task NewLineForAnExistingProduct_LinksTheProductUnchanged()
    {
        var order = await CreateOrderAsync();
        var a = order.LineItems[0];
        Product before;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            before = await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Set<Product>().AsNoTracking().SingleAsync(p => p.Id == a.ProductId);
        }

        var response = await PutAsync(order.Id, new
        {
            currencyId = 1,
            lineItems = Unchanged(order).Append(new { id = (Guid?)null, product = new { id = a.ProductId }, quantity = 1, price = 2m }),
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        await using var check = factory.Services.CreateAsyncScope();
        var db = check.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.Set<PurchaseOrderLineItem>().CountAsync(l => l.PurchaseOrderId == order.Id && l.ProductId == a.ProductId)).Should().Be(2);
        var product = await db.Set<Product>().SingleAsync(p => p.Id == a.ProductId);
        (product.Sku, product.Name, product.LastModifiedAt).Should().Be((before.Sku, before.Name, before.LastModifiedAt));
    }

    [Theory]
    [InlineData("currency", "PurchaseOrder.InvalidCurrency")]
    [InlineData("notes", "PurchaseOrder.NotesTooLong")]
    [InlineData("duplicate", "PurchaseOrder.DuplicateLineItem")]
    [InlineData("quantity", "PurchaseOrder.InvalidQuantity")]
    [InlineData("price", "PurchaseOrder.InvalidPrice")]
    [InlineData("removed", "PurchaseOrder.UnknownLineItem")]
    public async Task InvalidEdit_Returns400AndNothingChanges(string fault, string expectedCode)
    {
        var order = await CreateOrderAsync();
        var (a, b) = (order.LineItems[0], order.LineItems[1]);
        if (fault == "removed")
        {
            // Remove B first, so its id now names a soft-deleted line.
            (await PutAsync(order.Id, new { currencyId = 1, lineItems = Unchanged(order).Take(1) })).StatusCode.Should().Be(HttpStatusCode.OK);
        }

        var before = await StampsAsync(order.Id);
        var line = (Guid id, Guid productId, int quantity, decimal price) => new { id = (Guid?)id, product = new { id = productId }, quantity, price };
        var lines = fault switch
        {
            "duplicate" => new[] { line(a.Id, a.ProductId, 1, 1m), line(a.Id, a.ProductId, 2, 1m) },
            "quantity" => new[] { line(a.Id, a.ProductId, 0, 1m) },
            "price" => new[] { line(a.Id, a.ProductId, 1, 0.001m) },
            "removed" => new[] { line(a.Id, a.ProductId, a.Quantity, a.Price), line(b.Id, b.ProductId, 1, 1m) },
            _ => new[] { line(a.Id, a.ProductId, a.Quantity, a.Price) },
        };

        var response = await PutAsync(order.Id, new
        {
            currencyId = fault == "currency" ? 9 : 1,
            notes = fault == "notes" ? new string('n', 513) : null,
            lineItems = lines,
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be(expectedCode);
        (await StampsAsync(order.Id)).Should().BeEquivalentTo(before);
    }

    [Fact]
    public async Task ConfirmedOrder_Returns422AndNothingChanges()
    {
        var order = await CreateOrderAsync();
        (await _client.PutAsJsonAsync($"/api/v1/purchase-orders/{order.Id}/status", new { statusId = 20 }))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        var suffix = Suffix();

        var response = await PutAsync(order.Id, new
        {
            currencyId = 2,
            lineItems = new[] { new { product = new { sku = $"NE{suffix}", name = "Never Made" }, quantity = 1, price = 1m } },
        });

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("PurchaseOrder.NotEditable");
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.Set<PurchaseOrder>().SingleAsync(o => o.Id == order.Id)).CurrencyId.Should().Be(CurrencyId.Zar);
        (await db.Set<PurchaseOrderLineItem>().CountAsync(l => l.PurchaseOrderId == order.Id)).Should().Be(2);
        (await db.Set<Product>().AnyAsync(p => p.Sku == $"NE{suffix}")).Should().BeFalse();
    }

    [Fact]
    public async Task LineIdFromAnotherOrder_Returns400()
    {
        var order = await CreateOrderAsync();
        var other = await CreateOrderAsync();
        var foreign = other.LineItems[0];

        var response = await PutAsync(order.Id, new
        {
            currencyId = 1,
            lineItems = new[] { new { id = foreign.Id, product = new { id = foreign.ProductId }, quantity = 1, price = 1m } },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("PurchaseOrder.UnknownLineItem");
    }

    [Fact]
    public async Task ChangedProductOnAnExistingLine_Returns400()
    {
        var order = await CreateOrderAsync();
        var (a, b) = (order.LineItems[0], order.LineItems[1]);

        var response = await PutAsync(order.Id, new
        {
            currencyId = 1,
            lineItems = new[] { new { id = a.Id, product = new { id = b.ProductId }, quantity = 1, price = 1m } },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("PurchaseOrder.LineItemProductChanged");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public async Task LineCountOutsideOneToOneHundred_Returns400(int count)
    {
        var order = await CreateOrderAsync();
        var line = order.LineItems[0];

        var response = await PutAsync(order.Id, new
        {
            currencyId = 1,
            lineItems = Enumerable.Range(0, count).Select(_ => new { product = new { id = line.ProductId }, quantity = 1, price = 1m }),
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("PurchaseOrder.InvalidLineItemCount");
    }

    [Fact]
    public async Task UnknownOrMalformedId_Returns404Or400()
    {
        var body = new { currencyId = 1, lineItems = new[] { new { product = new { sku = "XYL001", name = "Xylophone" }, quantity = 1, price = 1m } } };

        (await PutAsync(Guid.NewGuid(), body)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await _client.PutAsJsonAsync("/api/v1/purchase-orders/nope", body)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetById_CarriesTheCustomerEmailAndIsEditable()
    {
        var order = await CreateOrderAsync();

        var response = await _client.GetAsync($"/api/v1/purchase-orders/{order.Id}?maxResultCount=100");
        var body = (await response.Content.ReadFromJsonAsync<ResultBody<OrderDto>>())!.Value!;

        body.Customer.Email.Should().Be("edit@example.com");
        body.IsEditable.Should().BeTrue();
    }

    private Task<HttpResponseMessage> PutAsync(Guid id, object body) =>
        _client.PutAsJsonAsync($"/api/v1/purchase-orders/{id}", body);

    private static IEnumerable<object> Unchanged(OrderDto order) =>
        order.LineItems.Select(l => new { id = (Guid?)l.Id, product = new { id = l.ProductId }, quantity = l.Quantity, price = l.Price });

    /// <summary>The order row's and every line's (deleted ones too) modification stamps, and the total.</summary>
    private async Task<Stamps> StampsAsync(Guid orderId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var order = await db.Set<PurchaseOrder>().AsNoTracking().SingleAsync(o => o.Id == orderId);
        var lines = await db.Set<PurchaseOrderLineItem>().IgnoreQueryFilters()
            .Where(l => l.PurchaseOrderId == orderId)
            .OrderBy(l => l.Id)
            .Select(l => l.LastModifiedAt)
            .ToListAsync();
        return new Stamps(order.LastModifiedAt, order.Total, lines);
    }

    private sealed record Stamps(DateTimeOffset? Order, decimal Total, IReadOnlyList<DateTimeOffset?> Lines);

    private async Task<OrderDto> CreateOrderAsync()
    {
        var suffix = Suffix();
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders", new
        {
            reference = $"PO-ED-{suffix}",
            customer = new { name = $"Edit {suffix}", email = "edit@example.com" },
            currencyId = 1,
            statusId = 10,
            lineItems = new[]
            {
                new { product = new { sku = $"EA{suffix}", name = "Delicious Soda" }, quantity = 5, price = 9.99m },
                new { product = new { sku = $"EB{suffix}", name = "Delicious Candy" }, quantity = 3, price = 12.99m },
            },
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<ResultBody<OrderDto>>())!.Value!;
    }

    private static string Suffix() => Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

    private sealed record NamedDto(short Id, string Name);

    private sealed record CustomerDto(Guid Id, string Name, string Email);

    private sealed record LineDto(Guid Id, Guid ProductId, int Quantity, decimal Price);

    private sealed record OrderDto(Guid Id, CustomerDto Customer, IReadOnlyList<LineDto> LineItems, bool IsEditable);

    private sealed record RowDto(Guid Id, NamedDto Currency, decimal Total, int LineItemCount, bool IsEditable);
}
