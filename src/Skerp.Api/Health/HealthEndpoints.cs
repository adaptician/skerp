using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Skerp.Infrastructure;

namespace Skerp.Api.Health;

/// <summary>
/// Liveness (<c>/health</c>, no dependency checks) and readiness (<c>/alive</c>, the database),
/// per deployment.md. Unauthenticated, read-only, minimal body.
/// </summary>
internal static class HealthEndpoints
{
    public const string LivenessPath = "/health";
    public const string ReadinessPath = "/alive";

    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapHealthChecks(LivenessPath, new HealthCheckOptions
        {
            Predicate = _ => false,
            ResponseWriter = WriteStatusAsync,
        });

        app.MapHealthChecks(ReadinessPath, new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains(DependencyInjection.ReadinessTag),
            ResponseWriter = WriteStatusAsync,
        });

        return app;
    }

    private static Task WriteStatusAsync(HttpContext context, HealthReport report) =>
        context.Response.WriteAsJsonAsync(new HealthStatusBody(report.Status == HealthStatus.Healthy ? "healthy" : "unhealthy"));

    private sealed record HealthStatusBody(string Status);
}
