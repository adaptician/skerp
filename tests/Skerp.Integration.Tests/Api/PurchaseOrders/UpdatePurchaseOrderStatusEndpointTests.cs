using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Skerp.Domain.PurchaseOrders;
using Skerp.Infrastructure.Persistence;

namespace Skerp.Integration.Tests.Api.PurchaseOrders;

/// <summary><c>PUT /api/v1/purchase-orders/{id}/status</c> on real SQLite, with its history rows.</summary>
public sealed class UpdatePurchaseOrderStatusEndpointTests(PurchaseOrdersApiFactory factory) : IClassFixture<PurchaseOrdersApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task ConfirmThenFulfil_UpdatesTheRowAndAppendsHistory()
    {
        var id = await CreateOrderAsync();

        var confirmed = await PutStatusAsync(id, 20);
        var confirmedRow = await confirmed.Content.ReadFromJsonAsync<ResultBody<RowDto>>();
        var fulfilled = await PutStatusAsync(id, 60);
        var fulfilledRow = await fulfilled.Content.ReadFromJsonAsync<ResultBody<RowDto>>();

        confirmed.StatusCode.Should().Be(HttpStatusCode.OK);
        confirmedRow!.Value!.Status.Name.Should().Be("Confirmed");
        confirmedRow.Value.AllowedStatusIds.Should().Equal(60, 90);
        fulfilledRow!.Value!.Status.Name.Should().Be("Fulfilled");
        fulfilledRow.Value.AllowedStatusIds.Should().BeEmpty();
        fulfilledRow.Value.LineItemCount.Should().Be(1);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var history = await db.Set<PurchaseOrderStatusChange>()
            .Where(s => s.PurchaseOrderId == id)
            .OrderBy(s => s.Id)
            .Select(s => s.StatusId)
            .ToListAsync();
        history.Should().Equal(StatusId.Pending, StatusId.Confirmed, StatusId.Fulfilled);
    }

    [Fact]
    public async Task InvalidTransition_Returns422AndLeavesTheStatus()
    {
        var id = await CreateOrderAsync();

        var response = await PutStatusAsync(id, 60);
        var body = await response.Content.ReadFromJsonAsync<ResultBody>();

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        body!.Error!.Code.Should().Be("PurchaseOrder.InvalidStatusTransition");
        body.Error.Description.Should().Contain("A Pending order can only be Confirmed or Cancelled");
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.Set<PurchaseOrder>().SingleAsync(o => o.Id == id)).CurrentStatusId.Should().Be(StatusId.Pending);
        (await db.Set<PurchaseOrderStatusChange>().CountAsync(s => s.PurchaseOrderId == id)).Should().Be(1);
    }

    [Fact]
    public async Task CancelledOrder_RefusesEveryStatus()
    {
        var id = await CreateOrderAsync();
        (await PutStatusAsync(id, 90)).StatusCode.Should().Be(HttpStatusCode.OK);

        foreach (var status in new short[] { 10, 20, 60, 90 })
        {
            (await PutStatusAsync(id, status)).StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        }
    }

    [Theory]
    [InlineData(11)]
    [InlineData(0)]
    public async Task UndefinedStatus_Returns400(short statusId)
    {
        var response = await PutStatusAsync(await CreateOrderAsync(), statusId);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("PurchaseOrder.InvalidStatus");
    }

    [Fact]
    public async Task UnknownOrMalformedId_Returns404Or400()
    {
        (await _client.PutAsJsonAsync($"/api/v1/purchase-orders/{Guid.NewGuid()}/status", new { statusId = 20 }))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await _client.PutAsJsonAsync("/api/v1/purchase-orders/nope/status", new { statusId = 20 }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ListRows_CarryTheStatusesTheyMayMoveTo()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders/list", new { skipCount = 0, maxResultCount = 100 });
        var page = (await response.Content.ReadFromJsonAsync<ResultBody<PageDto>>())!.Value!;

        page.Data.Where(r => r.Status.Id == 10).Should().OnlyContain(r => r.AllowedStatusIds.SequenceEqual(new short[] { 20, 90 }));
        page.Data.Where(r => r.Status.Id is 60 or 90).Should().OnlyContain(r => r.AllowedStatusIds.Count == 0);
    }

    private Task<HttpResponseMessage> PutStatusAsync(Guid id, short statusId) =>
        _client.PutAsJsonAsync($"/api/v1/purchase-orders/{id}/status", new { statusId });

    private async Task<Guid> CreateOrderAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders", new
        {
            reference = $"PO-ST-{suffix}",
            customer = new { name = $"Status {suffix}", email = "status@example.com" },
            currencyId = 1,
            statusId = 10,
            lineItems = new[] { new { product = new { sku = $"ST{suffix}", name = "Delicious Soda" }, quantity = 1, price = 1m } },
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<ResultBody<RowDto>>())!.Value!.Id;
    }

    private sealed record NamedDto(short Id, string Name);

    private sealed record RowDto(Guid Id, NamedDto Status, int LineItemCount, IReadOnlyList<short> AllowedStatusIds);

    private sealed record PageDto(IReadOnlyList<RowDto> Data, int TotalCount);
}
