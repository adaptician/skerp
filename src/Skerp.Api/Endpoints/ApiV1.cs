using Asp.Versioning;
using Asp.Versioning.Builder;
using Skerp.Api.Results;

namespace Skerp.Api.Endpoints;

/// <summary>
/// The versioned API surface. Each domain concept maps its own endpoint group onto the group this
/// returns (for example <c>/api/v1/purchase-orders</c>).
/// </summary>
internal static class ApiV1
{
    /// <summary>The current, and default, API version (api.md → Versioning).</summary>
    public static readonly ApiVersion Version = new(1, 0);

    public static RouteGroupBuilder MapApiV1(this IEndpointRouteBuilder app)
    {
        ApiVersionSet versionSet = app.NewApiVersionSet()
            .HasApiVersion(Version)
            .ReportApiVersions()
            .Build();

        // Authentication is out of scope for this solution (Deliverable AB#1427), so the API is
        // deliberately anonymous. Marking it here keeps that decision visible (api.md).
        var api = app.MapGroup("/api/v{version:apiVersion}")
            .WithApiVersionSet(versionSet)
            .AllowAnonymous();

        // An unknown /api route, whatever its version segment (v1, v1.0, v2), still answers with a Result
        // body, not an empty 404.
        app.MapFallback("/api/{**path}", () => ApiErrors.NotFound.ToHttpResult())
            .ExcludeFromDescription();

        return api;
    }
}
