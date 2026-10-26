using System.Net;
using System.Net.Http.Json;
using System.Text;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Skerp.Domain.PurchaseOrders;
using Skerp.Infrastructure.Persistence;
using Skerp.Infrastructure.Persistence.Seeders;

namespace Skerp.Integration.Tests.Api.PurchaseOrders;

/// <summary>
/// The list and get-by-id endpoints over HTTP on real SQLite: paging, sorting, every filter, lazy
/// line items, refusals and soft-delete exclusion. The demo seed provides 30 orders.
/// </summary>
public sealed class ListPurchaseOrdersEndpointTests(PurchaseOrdersApiFactory factory) : IClassFixture<PurchaseOrdersApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task List_FirstPage_IsTenNewestFirstWithTheTotalCount()
    {
        var page = await ListAsync(new { skipCount = 0 });

        page.Data.Should().HaveCount(10);
        page.TotalCount.Should().BeGreaterThanOrEqualTo(PurchaseOrderSeeder.OrderCount);
        page.Data.Select(o => o.CreatedAt).Should().BeInDescendingOrder();
        page.Data.Should().OnlyContain(o => o.Customer.Name.Length > 0 && o.Currency.Name.Length == 3 && o.Total > 0);
    }

    [Fact]
    public async Task List_PagesDoNotOverlap()
    {
        var first = await ListAsync(new { skipCount = 0, maxResultCount = 5 });
        var second = await ListAsync(new { skipCount = 5, maxResultCount = 5 });

        first.Data.Select(o => o.Id).Should().NotIntersectWith(second.Data.Select(o => o.Id));
        first.Data[^1].CreatedAt.Should().BeOnOrAfter(second.Data[0].CreatedAt);
    }

    [Fact]
    public async Task List_SearchIsNormalisedAndMatchesPartOfTheReference()
    {
        var exact = await ListAsync(new { skipCount = 0, search = " po-2026-001 " });
        var partial = await ListAsync(new { skipCount = 0, search = "2026-00", maxResultCount = 100 });

        exact.Data.Should().ContainSingle().Which.Reference.Should().Be("PO-2026-001");
        partial.Data.Should().HaveCount(9).And.OnlyContain(o => o.Reference.StartsWith("PO-2026-00", StringComparison.Ordinal));
    }

    [Fact]
    public async Task List_CustomersAndStatusCombine()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var first = await CreateOrderAsync($"PO-F1-{suffix}", $"Filter One {suffix}");
        var second = await CreateOrderAsync($"PO-F2-{suffix}", $"Filter Two {suffix}");
        await CreateOrderAsync($"PO-F3-{suffix}", $"Filter Three {suffix}");

        var page = await ListAsync(new { skipCount = 0, statusId = 10, customerIds = new[] { first.Customer.Id, second.Customer.Id } });

        page.Data.Select(o => o.Reference).Should().BeEquivalentTo([$"PO-F1-{suffix}", $"PO-F2-{suffix}"]);
        page.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task List_StatusFilterReturnsOnlyThatStatus()
    {
        var page = await ListAsync(new { skipCount = 0, statusId = 60, maxResultCount = 100 });

        page.Data.Should().NotBeEmpty().And.OnlyContain(o => o.Status.Name == "Fulfilled");
    }

    [Fact]
    public async Task List_CreatedRangeIsInclusive()
    {
        var all = await ListAsync(new { skipCount = 0, maxResultCount = 100 });
        var min = all.Data[9].CreatedAt;
        var max = all.Data[3].CreatedAt;

        var page = await ListAsync(new { skipCount = 0, createdMin = min, createdMax = max, maxResultCount = 100 });

        page.Data.Select(o => o.Id).Should().Equal(all.Data.Skip(3).Take(7).Select(o => o.Id));
    }

    [Fact]
    public async Task List_SortsByTotalAscending()
    {
        var page = await ListAsync(new { skipCount = 0, sorting = "total asc", maxResultCount = 100 });

        page.Data.Select(o => o.Total).Should().BeInAscendingOrder();
    }

    [Theory]
    [InlineData("{\"skipCount\": 0, \"maxResultCount\": 101}", "General.InvalidMaxResultCount")]
    [InlineData("{\"skipCount\": -1}", "General.InvalidSkipCount")]
    [InlineData("{}", "General.InvalidSkipCount")]
    [InlineData("{\"skipCount\": 0, \"sorting\": \"price asc\"}", "PurchaseOrder.InvalidSorting")]
    [InlineData("{\"skipCount\": 0, \"statusId\": 11}", "PurchaseOrder.InvalidStatus")]
    [InlineData("{\"skipCount\": 0, \"search\": \"PO 2026\"}", "PurchaseOrder.ReferenceInvalidCharacters")]
    [InlineData("{\"skipCount\": 0, \"createdMin\": \"2026-10-20T00:00:00Z\", \"createdMax\": \"2026-10-19T00:00:00Z\"}", "PurchaseOrder.InvalidDateRange")]
    [InlineData("{\"skipCount\": 0, \"customerIds\": [\"not-a-guid\"]}", "General.BadRequest")]
    public async Task List_InvalidRequest_Returns400WithACode(string json, string code)
    {
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _client.PostAsync("/api/v1/purchase-orders/list", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be(code);
    }

    [Fact]
    public async Task List_ElevenCustomers_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders/list", new
        {
            skipCount = 0,
            customerIds = Enumerable.Range(0, 11).Select(_ => Guid.NewGuid()),
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("PurchaseOrder.TooManyCustomerFilters");
    }

    [Fact]
    public async Task Get_LoadsLineItemsTwentyAtATime()
    {
        var id = (await ListAsync(new { skipCount = 0, search = PurchaseOrderSeeder.ManyLinesReference })).Data.Single().Id;

        var first = await GetAsync($"/api/v1/purchase-orders/{id}");
        var rest = await GetAsync($"/api/v1/purchase-orders/{id}?skipCount=20");

        first.LineItems.Should().HaveCount(20);
        first.LineItemCount.Should().Be(25);
        rest.LineItems.Should().HaveCount(5);
        first.LineItems.Select(l => l.Id).Should().NotIntersectWith(rest.LineItems.Select(l => l.Id));
        first.LineItems.Should().OnlyContain(l => l.Total == l.Quantity * l.Price);
    }

    [Fact]
    public async Task Get_UnknownId_Returns404()
    {
        var response = await _client.GetAsync($"/api/v1/purchase-orders/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("PurchaseOrder.NotFound");
    }

    [Fact]
    public async Task Get_MalformedId_Returns400()
    {
        var response = await _client.GetAsync("/api/v1/purchase-orders/not-a-guid");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("PurchaseOrder.InvalidId");
    }

    [Fact]
    public async Task SoftDeletedOrder_IsNeverListedOrReturned()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var order = await CreateOrderAsync($"PO-DEL-{suffix}", $"Deleted {suffix}");
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Remove(await db.Set<PurchaseOrder>().SingleAsync(o => o.Id == order.Id));
            await db.SaveChangesAsync();
        }

        (await ListAsync(new { skipCount = 0, search = $"PO-DEL-{suffix}" })).Data.Should().BeEmpty();
        (await _client.GetAsync($"/api/v1/purchase-orders/{order.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private async Task<PageDto> ListAsync(object request)
    {
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders/list", request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<ResultBody<PageDto>>())!.Value!;
    }

    private async Task<OrderDto> GetAsync(string url) =>
        (await _client.GetFromJsonAsync<ResultBody<OrderDto>>(url))!.Value!;

    private async Task<OrderDto> CreateOrderAsync(string reference, string customerName)
    {
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders", new
        {
            reference,
            customer = new { name = customerName, email = "list@example.com" },
            currencyId = 1,
            statusId = 10,
            lineItems = new[] { new { product = new { sku = reference, name = "Delicious Soda" }, quantity = 2, price = 3.5m } },
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<ResultBody<OrderDto>>())!.Value!;
    }

    private sealed record NamedDto(short Id, string Name);

    private sealed record CustomerDto(Guid Id, string Name);

    private sealed record ListItemDto(Guid Id, string Reference, DateTimeOffset CreatedAt, CustomerDto Customer, NamedDto Currency, NamedDto Status, decimal Total, int LineItemCount);

    private sealed record PageDto(IReadOnlyList<ListItemDto> Data, int TotalCount);

    private sealed record LineItemDto(Guid Id, string Sku, string Name, int Quantity, decimal Price, decimal Total);

    private sealed record OrderDto(Guid Id, string Reference, CustomerDto Customer, IReadOnlyList<LineItemDto> LineItems, int LineItemCount);
}
