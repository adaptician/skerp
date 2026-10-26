namespace Skerp.Infrastructure.Persistence.Seeders;

/// <summary>
/// One focused seeder (persistence.md → Seeding). Seeders run on startup after migrations and must
/// be safe to run on every start: they never duplicate or overwrite data they do not own.
/// Register each one as <c>services.AddScoped&lt;ISeeder, TSeeder&gt;()</c> in
/// <see cref="DependencyInjection.AddInfrastructure"/>; an unregistered seeder never runs.
/// </summary>
internal interface ISeeder
{
    Task SeedAsync(CancellationToken cancellationToken);
}
