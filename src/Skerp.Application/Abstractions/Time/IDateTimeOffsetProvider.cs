namespace Skerp.Application.Abstractions.Time;

/// <summary>
/// The current time. Inject this instead of reading <see cref="DateTimeOffset.UtcNow"/>, so time
/// can be fixed in tests and overridden in non-production environments (date-handling.md).
/// </summary>
public interface IDateTimeOffsetProvider
{
    DateTimeOffset UtcNow { get; }
}
