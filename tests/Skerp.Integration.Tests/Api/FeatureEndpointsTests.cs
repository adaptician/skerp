using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;

namespace Skerp.Integration.Tests.Api;

/// <summary><c>GET /api/v1/features</c> mirrors the release toggles the server reads from configuration.</summary>
public sealed class FeatureEndpointsTests(SkerpApiFactory factory) : IClassFixture<SkerpApiFactory>
{
    private const string PurchaseOrders = "Feature_PurchaseOrders";

    [Fact]
    public async Task GetFeatures_WithTheToggleOff_ListsNothing()
    {
        using var client = factory.WithWebHostBuilder(b => b.UseSetting($"FeatureManagement:{PurchaseOrders}", "false"))
            .CreateClient();

        var body = await client.GetFromJsonAsync<ResultBody<EnabledFeatures>>("/api/v1/features");

        body!.IsSuccess.Should().BeTrue();
        body.Value!.Enabled.Should().BeEmpty();
    }

    [Fact]
    public async Task GetFeatures_WithTheToggleOn_ListsIt()
    {
        using var client = factory.WithWebHostBuilder(b => b.UseSetting($"FeatureManagement:{PurchaseOrders}", "true"))
            .CreateClient();

        var response = await client.GetAsync("/api/v1/features");
        var body = await response.Content.ReadFromJsonAsync<ResultBody<EnabledFeatures>>();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body!.Value!.Enabled.Should().Equal(PurchaseOrders);
    }

    private sealed record EnabledFeatures(IReadOnlyList<string> Enabled);
}
