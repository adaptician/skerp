using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;

namespace Skerp.Integration.Tests.Api;

/// <summary>The API is versioned by URL segment (api.md → Versioning); <c>/api/v1</c> is version 1.0.</summary>
public sealed class ApiVersioningTests(SkerpApiFactory factory) : IClassFixture<SkerpApiFactory>
{
    private const string PurchaseOrders = "Feature_PurchaseOrders";

    [Theory]
    [InlineData("/api/v1/features")]
    [InlineData("/api/v1.0/features")]
    public async Task GetFeatures_WithVersionOneInTheUrl_Succeeds(string path)
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri(path, UriKind.Relative));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.GetValues("api-supported-versions").Should().Equal("1.0");
    }

    [Theory]
    [InlineData("/api/v1.0/does-not-exist")]
    [InlineData("/api/v2/does-not-exist")]
    [InlineData("/api/v2/features")]
    public async Task UnknownRoute_UnderAnyVersion_ReturnsNotFoundResultBody(string path)
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri(path, UriKind.Relative));
        var body = await response.Content.ReadFromJsonAsync<ResultBody>();

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        body!.Error!.Code.Should().Be("General.NotFound");
    }

    [Fact]
    public async Task PurchaseOrders_WithTheToggleOffAndAnExplicitMinorVersion_Answer404()
    {
        using var client = factory.WithWebHostBuilder(b => b.UseSetting($"FeatureManagement:{PurchaseOrders}", "false"))
            .CreateClient();

        var response = await client.PostAsync(new Uri("/api/v1.0/purchase-orders/list", UriKind.Relative), content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SwaggerDocument_DescribesVersionOneUrls_WithoutAVersionParameter()
    {
        using var client = factory.CreateClient();

        var json = await client.GetStringAsync(new Uri("/swagger/v1/swagger.json", UriKind.Relative));
        var paths = JsonDocument.Parse(json).RootElement.GetProperty("paths").EnumerateObject().Select(p => p.Name).ToList();

        paths.Should().Contain("/api/v1/purchase-orders/list");
        paths.Should().NotContain(path => path.Contains("{version}", StringComparison.Ordinal));
    }
}
