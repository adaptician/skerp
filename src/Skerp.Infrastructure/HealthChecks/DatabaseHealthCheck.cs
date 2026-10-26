using Microsoft.Extensions.Diagnostics.HealthChecks;
using Skerp.Infrastructure.Persistence;

namespace Skerp.Infrastructure.HealthChecks;

/// <summary>
/// Readiness: the API can open its database. Read-only and lightweight (deployment.md).
/// </summary>
internal sealed class DatabaseHealthCheck(ApplicationDbContext dbContext) : IHealthCheck
{
    public const string Name = "database";

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        return await dbContext.Database.CanConnectAsync(cancellationToken)
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy();
    }
}
