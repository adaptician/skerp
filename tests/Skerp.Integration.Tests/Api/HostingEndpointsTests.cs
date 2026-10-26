using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace Skerp.Integration.Tests.Api;

public class HostingEndpointsTests(SkerpApiFactory factory) : IClassFixture<SkerpApiFactory>
{
    [Theory]
    [InlineData("/health")]
    [InlineData("/alive")]
    public async Task HealthProbe_WhenApiIsRunning_ReturnsHealthy(string path)
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri(path, UriKind.Relative));
        var body = await response.Content.ReadFromJsonAsync<HealthBody>();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body!.Status.Should().Be("healthy");
    }

    [Fact]
    public async Task SwaggerDocument_InDevelopment_IsServed()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri("/swagger/v1/swagger.json", UriKind.Relative));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private sealed record HealthBody(string Status);
}
