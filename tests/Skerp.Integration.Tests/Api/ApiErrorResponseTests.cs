using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace Skerp.Integration.Tests.Api;

public class ApiErrorResponseTests(SkerpApiFactory factory) : IClassFixture<SkerpApiFactory>
{
    [Fact]
    public async Task UnknownApiRoute_ReturnsNotFoundResultBody()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/v1/does-not-exist", UriKind.Relative));
        var body = await response.Content.ReadFromJsonAsync<ResultBody>();

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        body!.IsFailure.Should().BeTrue();
        body.Error!.Code.Should().Be("General.NotFound");
    }

    [Fact]
    public async Task UnhandledException_ReturnsRedactedInternalServerErrorResultBody()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri(SkerpApiFactory.ThrowingPath, UriKind.Relative));
        var raw = await response.Content.ReadAsStringAsync();
        var body = await response.Content.ReadFromJsonAsync<ResultBody>();

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        body!.IsSuccess.Should().BeFalse();
        body.Error!.Code.Should().Be("General.Unexpected");
        raw.Should().NotContain(SkerpApiFactory.SecretExceptionMessage)
            .And.NotContain(nameof(InvalidOperationException))
            .And.NotContain("   at ");
    }
}
