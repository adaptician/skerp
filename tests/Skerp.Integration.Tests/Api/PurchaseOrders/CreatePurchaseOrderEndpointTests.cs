using System.Net;
using System.Net.Http.Json;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Skerp.Domain.Customers;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;
using Skerp.Infrastructure.Persistence;

namespace Skerp.Integration.Tests.Api.PurchaseOrders;

/// <summary>
/// Create, calculate and the three lookups over HTTP, against real SQLite, behind the release toggle.
/// </summary>
public sealed class CreatePurchaseOrderEndpointTests(PurchaseOrdersApiFactory factory) : IClassFixture<PurchaseOrdersApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Create_ValidOrder_Returns201AndStoresItPendingWithServerTotals()
    {
        var suffix = UniqueSuffix();
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders", new
        {
            reference = $" po-it-{suffix} ",
            customer = new { name = $"  New   Customer {suffix} ", email = $"buyer{suffix}@example.com" },
            currencyId = 1,
            statusId = 10,
            lineItems = new[]
            {
                new { product = new { sku = $"a{suffix}", name = "Delicious Soda" }, quantity = 5, price = 9.99m },
                new { product = new { sku = $"b{suffix}", name = "Delicious Candy" }, quantity = 3, price = 12.99m },
            },
            notes = (string?)null,
        });

        var body = await response.Content.ReadFromJsonAsync<ResultBody<OrderDto>>();
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        body!.Value!.Reference.Should().Be($"PO-IT-{suffix}");
        body.Value.Status.Should().Be(new NamedDto(10, "Pending"));
        body.Value.Currency.Should().Be(new NamedDto(1, "ZAR"));
        body.Value.LineItems.Select(l => l.Total).Should().Equal(49.95m, 38.97m);
        body.Value.LineItems.Select(l => l.Sku).Should().Equal($"A{suffix}", $"B{suffix}");
        body.Value.Total.Should().Be(88.92m);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.Set<PurchaseOrder>().Include(o => o.Customer).SingleAsync(o => o.Id == body.Value.Id);
        stored.Total.Should().Be(88.92m);
        stored.CurrentStatusId.Should().Be(StatusId.Pending);
        stored.Customer!.Name.Should().Be($"New Customer {suffix}");
        (await db.Set<PurchaseOrderStatusChange>().CountAsync(s => s.PurchaseOrderId == stored.Id)).Should().Be(1);
        (await db.Set<Product>().CountAsync(p => p.Sku == $"A{suffix}" || p.Sku == $"B{suffix}")).Should().Be(2);
    }

    [Fact]
    public async Task Create_TotalsInTheRequest_AreIgnored()
    {
        var suffix = UniqueSuffix();
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders", new
        {
            reference = $"PO-IT-{suffix}",
            customer = new { name = $"Customer {suffix}", email = $"c{suffix}@example.com" },
            currencyId = 1,
            statusId = 10,
            total = 1_000_000m,
            lineItems = new[] { new { product = new { sku = $"T{suffix}", name = "Delicious Soda" }, quantity = 2, price = 1.25m, total = 999m } },
        });

        var body = await response.Content.ReadFromJsonAsync<ResultBody<OrderDto>>();
        body!.Value!.Total.Should().Be(2.50m);
        body.Value.LineItems.Single().Total.Should().Be(2.50m);
    }

    [Fact]
    public async Task Create_DuplicateReference_Returns409AndCreatesNothing()
    {
        var suffix = UniqueSuffix();
        (await PostOrderAsync($"PO-DUP-{suffix}", $"First {suffix}", $"S1{suffix}")).StatusCode.Should().Be(HttpStatusCode.Created);

        var response = await PostOrderAsync($"po-dup-{suffix}", $"Second {suffix}", $"S2{suffix}");
        var body = await response.Content.ReadFromJsonAsync<ResultBody>();

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        body!.Error!.Code.Should().Be("PurchaseOrder.DuplicateReferenceNumber");
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.Set<Customer>().AnyAsync(c => c.Name == $"Second {suffix}")).Should().BeFalse();
        (await db.Set<Product>().AnyAsync(p => p.Sku == $"S2{suffix}")).Should().BeFalse();
    }

    [Fact]
    public async Task Create_CustomerNameThatExistsIgnoringCase_Returns409()
    {
        var suffix = UniqueSuffix();
        await PostOrderAsync($"PO-C1-{suffix}", $"Alpha {suffix}", $"C1{suffix}");

        var response = await PostOrderAsync($"PO-C2-{suffix}", $"ALPHA {suffix}".ToUpperInvariant(), $"C2{suffix}");
        var body = await response.Content.ReadFromJsonAsync<ResultBody>();

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        body!.Error!.Code.Should().Be("Customer.DuplicateName");
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.Set<Product>().AnyAsync(p => p.Sku == $"C2{suffix}")).Should().BeFalse();
        (await AvailabilityAsync($"PO-C2-{suffix}")).IsAvailable.Should().BeTrue();
    }

    [Fact]
    public async Task Create_SkuThatExists_Returns409()
    {
        var suffix = UniqueSuffix();
        var response = await PostOrderAsync($"PO-SKU-{suffix}", $"Sku {suffix}", "sda001");
        var body = await response.Content.ReadFromJsonAsync<ResultBody>();

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        body!.Error!.Code.Should().Be("Product.DuplicateSku");
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.Set<Customer>().AnyAsync(c => c.Name == $"Sku {suffix}")).Should().BeFalse();
        (await AvailabilityAsync($"PO-SKU-{suffix}")).IsAvailable.Should().BeTrue();
    }

    [Theory]
    [InlineData("/api/v1/purchase-orders", "{\"reference\": \"PO-OFF-1\"}")]
    [InlineData("/api/v1/purchase-orders/calculate", "{\"lineItems\": []}")]
    [InlineData("/api/v1/purchase-orders", "{ not json")]
    public async Task Posts_WithTheToggleOff_Return404EvenWhenUnbindable(string url, string json)
    {
        using var client = factory
            .WithWebHostBuilder(b => b.UseSetting("FeatureManagement:Feature_PurchaseOrders", "false"))
            .CreateClient();
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync(url, content);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("General.NotFound");
    }

    [Theory]
    [InlineData(20)]
    [InlineData(60)]
    [InlineData(90)]
    public async Task Create_NonPendingStatus_Returns400AndPersistsNothing(int statusId)
    {
        var reference = $"PO-ST-{UniqueSuffix()}";
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders", new
        {
            reference,
            customer = new { name = $"Status {reference}", email = "status@example.com" },
            currencyId = 1,
            statusId,
            lineItems = new[] { new { product = new { sku = reference, name = "Delicious Soda" }, quantity = 1, price = 1m } },
        });
        var body = await response.Content.ReadFromJsonAsync<ResultBody>();

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body!.Error!.Code.Should().Be("PurchaseOrder.InitialStatusMustBePending");
        (await AvailabilityAsync(reference)).IsAvailable.Should().BeTrue();
    }

    [Fact]
    public async Task Create_101LineItems_Returns400()
    {
        var suffix = UniqueSuffix();
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders", new
        {
            reference = $"PO-MAX-{suffix}",
            customer = new { name = $"Max {suffix}", email = "max@example.com" },
            currencyId = 1,
            statusId = 10,
            lineItems = Enumerable.Range(0, 101)
                .Select(i => new { product = new { sku = $"M{i}{suffix}", name = "Delicious Soda" }, quantity = 1, price = 1m }),
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("PurchaseOrder.InvalidLineItemCount");
    }

    [Fact]
    public async Task Create_MalformedJson_Returns400ResultBody()
    {
        using var content = new StringContent("{\"reference\": \"PO-1\", \"lineItems\": [{\"quantity\": \"many\"}]}", Encoding.UTF8, "application/json");

        var response = await _client.PostAsync("/api/v1/purchase-orders", content);
        var body = await response.Content.ReadFromJsonAsync<ResultBody>();

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body!.Error!.Code.Should().Be("General.BadRequest");
    }

    [Fact]
    public async Task Calculate_ReturnsServerTotalsKeyedByTheCallersIds()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders/calculate", new
        {
            lineItems = new[]
            {
                new { id = "temp-1", quantity = 5, price = 9.99m },
                new { id = "temp-2", quantity = 3, price = 12.99m },
            },
        });
        var body = await response.Content.ReadFromJsonAsync<ResultBody<TotalsDto>>();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body!.Value!.LineItems.Should().Equal(new LineTotalDto("temp-1", 49.95m), new LineTotalDto("temp-2", 38.97m));
        body.Value.Total.Should().Be(88.92m);
    }

    [Fact]
    public async Task Calculate_RoundsTheGrandTotalWithBankersRounding()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/purchase-orders/calculate", new
        {
            lineItems = new[] { new { id = "a", quantity = 1, price = 10.125m } },
        });

        (await response.Content.ReadFromJsonAsync<ResultBody<TotalsDto>>())!.Value!.Total.Should().Be(10.12m);
    }

    [Fact]
    public async Task ReferenceAvailability_NormalisesAndReportsSeededReferencesAsTaken()
    {
        var taken = await AvailabilityAsync(" po-2026-001 ");
        var free = await AvailabilityAsync($"po-free-{UniqueSuffix()}");

        taken.Should().Be(new AvailabilityDto("PO-2026-001", false));
        free.IsAvailable.Should().BeTrue();
        free.Reference.Should().StartWith("PO-FREE-");
    }

    [Fact]
    public async Task ReferenceAvailability_InvalidReference_Returns400()
    {
        var response = await _client.GetAsync("/api/v1/purchase-orders/reference-availability?reference=PO%202026");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code
            .Should().Be("PurchaseOrder.ReferenceInvalidCharacters");
    }

    [Fact]
    public async Task CustomerLookup_MatchesAnyPartOfTheNameIgnoringCase()
    {
        var body = await _client.GetFromJsonAsync<ResultBody<LookupDto<CustomerDto>>>("/api/v1/customers/lookup?name=STUDIOS");

        body!.Value!.Data.Should().Contain(c => c.Name == "Alpha Studios" && c.Email == "orders@alphastudios.co.za");
    }

    [Fact]
    public async Task ProductLookup_MatchesSkuPrefixAfterNormalising()
    {
        var body = await _client.GetFromJsonAsync<ResultBody<LookupDto<ProductDto>>>("/api/v1/products/lookup?sku=%20sda");

        body!.Value!.Data.Should().ContainSingle(p => p.Sku == "SDA001" && p.Name == "Delicious Soda");
    }

    [Theory]
    [InlineData("/api/v1/purchase-orders/reference-availability?reference=PO-2026-001")]
    [InlineData("/api/v1/customers/lookup?name=Alpha")]
    [InlineData("/api/v1/products/lookup?sku=SDA")]
    public async Task Endpoints_WithTheToggleOff_Return404(string url)
    {
        using var client = factory
            .WithWebHostBuilder(b => b.UseSetting("FeatureManagement:Feature_PurchaseOrders", "false"))
            .CreateClient();

        var response = await client.GetAsync(url);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await response.Content.ReadFromJsonAsync<ResultBody>())!.Error!.Code.Should().Be("General.NotFound");
    }

    private static string UniqueSuffix() => Guid.NewGuid().ToString("N")[..10].ToUpperInvariant();

    private Task<HttpResponseMessage> PostOrderAsync(string reference, string customerName, string sku) =>
        _client.PostAsJsonAsync("/api/v1/purchase-orders", new
        {
            reference,
            customer = new { name = customerName, email = "buyer@example.com" },
            currencyId = 1,
            statusId = 10,
            lineItems = new[] { new { product = new { sku, name = "Delicious Soda" }, quantity = 1, price = 1m } },
        });

    private async Task<AvailabilityDto> AvailabilityAsync(string reference)
    {
        var body = await _client.GetFromJsonAsync<ResultBody<AvailabilityDto>>(
            $"/api/v1/purchase-orders/reference-availability?reference={Uri.EscapeDataString(reference)}");
        return body!.Value!;
    }

    private sealed record NamedDto(short Id, string Name);

    private sealed record LineItemDto(Guid Id, string Sku, string Name, int Quantity, decimal Price, decimal Total);

    private sealed record OrderDto(Guid Id, string Reference, NamedDto Currency, NamedDto Status, IReadOnlyList<LineItemDto> LineItems, decimal Total);

    private sealed record LineTotalDto(string Id, decimal Total);

    private sealed record TotalsDto(IReadOnlyList<LineTotalDto> LineItems, decimal Total);

    private sealed record AvailabilityDto(string Reference, bool IsAvailable);

    private sealed record LookupDto<TItem>(IReadOnlyList<TItem> Data);

    private sealed record CustomerDto(Guid Id, string Name, string Email);

    private sealed record ProductDto(Guid Id, string Sku, string Name);
}
