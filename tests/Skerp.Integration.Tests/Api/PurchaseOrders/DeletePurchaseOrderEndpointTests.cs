using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Skerp.Domain.Customers;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;
using Skerp.Infrastructure.Persistence;

namespace Skerp.Integration.Tests.Api.PurchaseOrders;

/// <summary>
/// <c>DELETE /api/v1/purchase-orders/{id}</c> on real SQLite (brief: Pending permits soft delete only,
/// non-Pending blocks it completely, deleted orders are excluded from queries).
/// </summary>
public sealed class DeletePurchaseOrderEndpointTests(PurchaseOrdersApiFactory factory) : IClassFixture<PurchaseOrdersApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task PendingOrder_IsSoftDeletedWithItsLinesOnly()
    {
        var order = await CreateOrderAsync();

        var response = await _client.DeleteAsync($"/api/v1/purchase-orders/{order.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await response.Content.ReadAsStringAsync()).Should().BeEmpty();

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.Set<PurchaseOrder>().IgnoreQueryFilters().SingleAsync(o => o.Id == order.Id);
        stored.IsDeleted.Should().BeTrue();
        stored.DeletedAt.Should().NotBeNull();
        var lines = await db.Set<PurchaseOrderLineItem>().IgnoreQueryFilters().Where(l => l.PurchaseOrderId == order.Id).ToListAsync();
        lines.Should().HaveCount(2).And.OnlyContain(l => l.IsDeleted && l.DeletedAt != null);

        (await db.Set<Customer>().SingleAsync(c => c.Id == order.Customer.Id)).IsDeleted.Should().BeFalse();
        var productIds = lines.Select(l => l.ProductId).ToList();
        (await db.Set<Product>().CountAsync(p => productIds.Contains(p.Id))).Should().Be(2);
        (await db.Set<PurchaseOrderStatusChange>().CountAsync(s => s.PurchaseOrderId == order.Id)).Should().Be(1);
    }

    [Fact]
    public async Task DeletedOrder_IsExcludedFromQueriesAndIsNotFound()
    {
        var order = await CreateOrderAsync();
        (await _client.DeleteAsync($"/api/v1/purchase-orders/{order.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);

        var list = await _client.PostAsJsonAsync("/api/v1/purchase-orders/list", new { search = order.Reference, skipCount = 0, maxResultCount = 10 });
        (await list.Content.ReadFromJsonAsync<ResultBody<PageDto>>())!.Value!.TotalCount.Should().Be(0);

        (await _client.GetAsync($"/api/v1/purchase-orders/{order.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await _client.DeleteAsync($"/api/v1/purchase-orders/{order.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await _client.PutAsJsonAsync($"/api/v1/purchase-orders/{order.Id}", new
        {
            currencyId = 1,
            lineItems = new[] { new { product = new { sku = "GONE01", name = "Gone" }, quantity = 1, price = 1m } },
        })).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await _client.PutAsJsonAsync($"/api/v1/purchase-orders/{order.Id}/status", new { statusId = 20 }))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData(20)]
    [InlineData(90)]
    public async Task NonPendingOrder_Returns422AndNothingChanges(short statusId)
    {
        var order = await CreateOrderAsync();
        (await _client.PutAsJsonAsync($"/api/v1/purchase-orders/{order.Id}/status", new { statusId }))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var response = await _client.DeleteAsync($"/api/v1/purchase-orders/{order.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("PurchaseOrder.NotDeletable");
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.Set<PurchaseOrder>().AnyAsync(o => o.Id == order.Id)).Should().BeTrue();
        (await db.Set<PurchaseOrderLineItem>().CountAsync(l => l.PurchaseOrderId == order.Id)).Should().Be(2);
    }

    [Fact]
    public async Task UnknownOrMalformedId_Returns404Or400()
    {
        (await _client.DeleteAsync($"/api/v1/purchase-orders/{Guid.NewGuid()}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await _client.DeleteAsync("/api/v1/purchase-orders/nope")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ListRows_SayWhetherTheyMayBeDeleted()
    {
        var pending = await CreateOrderAsync();
        var confirmed = await CreateOrderAsync();
        (await _client.PutAsJsonAsync($"/api/v1/purchase-orders/{confirmed.Id}/status", new { statusId = 20 }))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var rows = new List<RowDto>();
        foreach (var reference in new[] { pending.Reference, confirmed.Reference })
        {
            var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders/list", new { search = reference, skipCount = 0, maxResultCount = 10 });
            rows.AddRange((await response.Content.ReadFromJsonAsync<ResultBody<PageDto>>())!.Value!.Data);
        }

        rows.Should().HaveCount(2);
        rows.Single(r => r.Id == pending.Id).IsDeletable.Should().BeTrue();
        rows.Single(r => r.Id == confirmed.Id).IsDeletable.Should().BeFalse();
    }

    private async Task<OrderDto> CreateOrderAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders", new
        {
            reference = $"PO-DL-{suffix}",
            customer = new { name = $"Delete {suffix}", email = "delete@example.com" },
            currencyId = 1,
            statusId = 10,
            lineItems = new[]
            {
                new { product = new { sku = $"DA{suffix}", name = "Delicious Soda" }, quantity = 1, price = 1m },
                new { product = new { sku = $"DB{suffix}", name = "Delicious Candy" }, quantity = 2, price = 3m },
            },
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<ResultBody<OrderDto>>())!.Value!;
    }

    private sealed record NamedDto(short Id, string Name);

    private sealed record CustomerDto(Guid Id, string Name);

    private sealed record OrderDto(Guid Id, string Reference, CustomerDto Customer, bool IsDeletable);

    private sealed record RowDto(Guid Id, NamedDto Status, bool IsDeletable);

    private sealed record PageDto(IReadOnlyList<RowDto> Data, int TotalCount);
}
