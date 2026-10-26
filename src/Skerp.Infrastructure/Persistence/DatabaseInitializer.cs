using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Skerp.Infrastructure.Persistence.Seeders;

namespace Skerp.Infrastructure.Persistence;

/// <summary>
/// Brings the database to the current schema and seeds it. Runs once at startup, inside a scope.
/// </summary>
internal sealed partial class DatabaseInitializer(
    ApplicationDbContext dbContext,
    IEnumerable<ISeeder> seeders,
    IOptions<SeedingSettings> seedingSettings,
    ILogger<DatabaseInitializer> logger)
{
    public async Task InitializeAsync(CancellationToken cancellationToken)
    {
        EnsureDatabaseDirectoryExists(dbContext.Database.GetConnectionString());

        var pending = (await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
        await dbContext.Database.MigrateAsync(cancellationToken);
        LogMigrationsApplied(logger, pending.Count);

        if (!seedingSettings.Value.Enabled)
        {
            LogSeedingDisabled(logger);
            return;
        }

        foreach (var seeder in seeders)
        {
            await seeder.SeedAsync(cancellationToken);
        }
    }

    private static void EnsureDatabaseDirectoryExists(string? connectionString)
    {
        var dataSource = new SqliteConnectionStringBuilder(connectionString).DataSource;
        var directory = Path.GetDirectoryName(dataSource);

        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Applied {Count} pending database migration(s)")]
    private static partial void LogMigrationsApplied(ILogger logger, int count);

    [LoggerMessage(Level = LogLevel.Information, Message = "Seeding is disabled by configuration")]
    private static partial void LogSeedingDisabled(ILogger logger);
}
