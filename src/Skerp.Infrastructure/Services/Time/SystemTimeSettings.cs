namespace Skerp.Infrastructure.Services.Time;

/// <summary>
/// Binds the <c>SystemTime</c> section. When <see cref="OverrideEnabled"/> is true outside
/// production, the clock returns <see cref="UtcNow"/> instead of the real time.
/// </summary>
internal sealed class SystemTimeSettings
{
    public const string SectionName = "SystemTime";

    public bool OverrideEnabled { get; set; }

    public DateTimeOffset? UtcNow { get; set; }
}
