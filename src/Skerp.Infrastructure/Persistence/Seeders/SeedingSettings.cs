namespace Skerp.Infrastructure.Persistence.Seeders;

/// <summary>Binds the <c>Seeding</c> section. <see cref="Enabled"/> false skips every seeder.</summary>
internal sealed class SeedingSettings
{
    public const string SectionName = "Seeding";

    public bool Enabled { get; set; }
}
