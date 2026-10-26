using FluentAssertions;
using Microsoft.Data.Sqlite;
using Skerp.Integration.Tests.Api;

namespace Skerp.Integration.Tests.Infrastructure.Persistence;

public class DatabaseInitializerTests
{
    [Fact]
    public async Task Startup_WithNoDatabase_CreatesFileAndAppliesEveryMigration()
    {
        using var factory = new SkerpApiFactory();

        _ = factory.CreateClient();

        File.Exists(factory.DatabasePath).Should().BeTrue();
        (await AppliedMigrationsAsync(factory.DatabasePath)).Should().Contain(id => id.EndsWith("_InitialCreate", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Startup_Twice_AppliesNothingTheSecondTime()
    {
        using var factory = new SkerpApiFactory();
        _ = factory.CreateClient();
        var afterFirstStart = await AppliedMigrationsAsync(factory.DatabasePath);

        using var restarted = factory.WithWebHostBuilder(_ => { });
        _ = restarted.CreateClient();
        var afterSecondStart = await AppliedMigrationsAsync(factory.DatabasePath);

        afterSecondStart.Should().Equal(afterFirstStart);
    }

    private static async Task<List<string>> AppliedMigrationsAsync(string databasePath)
    {
        await using var connection = new SqliteConnection($"Data Source={databasePath};Pooling=False");
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId";

        var ids = new List<string>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            ids.Add(reader.GetString(0));
        }

        return ids;
    }
}
