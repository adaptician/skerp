using Skerp.Application.Abstractions.Time;

namespace Skerp.Infrastructure.Services.Time;

/// <summary>The real system clock, used in production.</summary>
internal sealed class SystemDateTimeOffsetProvider : IDateTimeOffsetProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
