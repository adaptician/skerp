using System.Net;
using System.Net.Http.Json;
using System.Threading.Channels;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;

namespace Skerp.Integration.Tests.Api.PurchaseOrders;

/// <summary>
/// The Monitor Mode hub at <c>/api/v1/hubs/purchase-orders</c>: every committed create, edit, status
/// change and delete reaches a connected client as <c>{ id, change }</c>; a refused request sends nothing.
/// </summary>
public sealed class PurchaseOrderMonitorHubTests(PurchaseOrdersApiFactory factory)
    : IClassFixture<PurchaseOrdersApiFactory>, IAsyncLifetime
{
    private const string HubPath = "/api/v1/hubs/purchase-orders";

    /// <summary>Long enough for a broadcast on the in-memory test server; a missing one fails fast enough.</summary>
    private static readonly TimeSpan Wait = TimeSpan.FromSeconds(5);

    private readonly HttpClient _client = factory.CreateClient();
    private readonly Channel<ChangeDto> _received = Channel.CreateUnbounded<ChangeDto>();
    private HubConnection _connection = null!;

    public async Task InitializeAsync()
    {
        _connection = Connect(factory);
        _connection.On<ChangeDto>("PurchaseOrderChanged", change => _received.Writer.TryWrite(change));
        await _connection.StartAsync();
    }

    public async Task DisposeAsync() => await _connection.DisposeAsync();

    [Fact]
    public async Task Create_IsPushedAsCreated()
    {
        var id = await CreateOrderAsync();

        (await NextChangeForAsync(id)).Should().Be(new ChangeDto(id, "created"));
    }

    [Fact]
    public async Task Edit_IsPushedAsEdited()
    {
        var id = await CreateOrderAsync();
        await NextChangeForAsync(id);

        var response = await _client.PutAsJsonAsync($"/api/v1/purchase-orders/{id}", new
        {
            currencyId = 2,
            notes = "Monitored",
            lineItems = new[] { new { product = new { sku = $"ME{Suffix()}", name = "Delicious Water" }, quantity = 1, price = 2m } },
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await NextChangeForAsync(id)).Should().Be(new ChangeDto(id, "edited"));
    }

    [Fact]
    public async Task StatusChange_IsPushedAsStatusChanged()
    {
        var id = await CreateOrderAsync();
        await NextChangeForAsync(id);

        (await PutStatusAsync(id, 20)).StatusCode.Should().Be(HttpStatusCode.OK);

        (await NextChangeForAsync(id)).Should().Be(new ChangeDto(id, "statusChanged"));
    }

    [Fact]
    public async Task Delete_IsPushedAsDeleted()
    {
        var id = await CreateOrderAsync();
        await NextChangeForAsync(id);

        (await _client.DeleteAsync($"/api/v1/purchase-orders/{id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await NextChangeForAsync(id)).Should().Be(new ChangeDto(id, "deleted"));
    }

    [Fact]
    public async Task RefusedRequests_PushNothing()
    {
        var id = await CreateOrderAsync();
        await NextChangeForAsync(id);

        (await PutStatusAsync(id, 60)).StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await PutStatusAsync(id, 11)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await PutStatusAsync(Guid.NewGuid(), 20)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        // A change that does succeed afterwards is the next message, so nothing was sent in between.
        (await PutStatusAsync(id, 90)).StatusCode.Should().Be(HttpStatusCode.OK);

        (await NextChangeForAsync(id)).Should().Be(new ChangeDto(id, "statusChanged"));
        _received.Reader.TryRead(out _).Should().BeFalse();
    }

    [Fact]
    public async Task WithTheToggleOff_TheHubAnswers404()
    {
        await using var disabled = factory.WithWebHostBuilder(b => b.UseSetting("FeatureManagement:Feature_PurchaseOrders", "false"));
        using var client = disabled.CreateClient();

        var response = await client.PostAsync($"{HubPath}/negotiate?negotiateVersion=1", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private static HubConnection Connect(WebApplicationFactory<Program> app) =>
        new HubConnectionBuilder()
            .WithUrl(new Uri(app.Server.BaseAddress, HubPath), options =>
            {
                // The in-memory test server carries plain HTTP only.
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => app.Server.CreateHandler();
            })
            .Build();

    /// <summary>The next pushed change for <paramref name="id"/>; changes from other tests' orders are skipped.</summary>
    private async Task<ChangeDto> NextChangeForAsync(Guid id)
    {
        using var timeout = new CancellationTokenSource(Wait);
        while (true)
        {
            var change = await _received.Reader.ReadAsync(timeout.Token);
            if (change.Id == id)
            {
                return change;
            }
        }
    }

    private Task<HttpResponseMessage> PutStatusAsync(Guid id, short statusId) =>
        _client.PutAsJsonAsync($"/api/v1/purchase-orders/{id}/status", new { statusId });

    private async Task<Guid> CreateOrderAsync()
    {
        var suffix = Suffix();
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders", new
        {
            reference = $"PO-MO-{suffix}",
            customer = new { name = $"Monitor {suffix}", email = "monitor@example.com" },
            currencyId = 1,
            statusId = 10,
            lineItems = new[] { new { product = new { sku = $"MO{suffix}", name = "Delicious Soda" }, quantity = 1, price = 1m } },
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<ResultBody<IdDto>>())!.Value!.Id;
    }

    private static string Suffix() => Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

    private sealed record ChangeDto(Guid Id, string Change);

    private sealed record IdDto(Guid Id);
}
