using Microsoft.Extensions.Options;
using Skerp.Application.Abstractions.Time;

namespace Skerp.Infrastructure.Services.Time;

/// <summary>
/// The non-production clock: the configured fixed time when the override is on, otherwise the
/// real time. Lets a running app be exercised at a chosen point in time without editing data.
/// </summary>
internal sealed class ConfigurableDateTimeOffsetProvider(IOptions<SystemTimeSettings> settings) : IDateTimeOffsetProvider
{
    private readonly SystemTimeSettings _settings = settings.Value;

    public DateTimeOffset UtcNow
    {
        get
        {
            if (!_settings.OverrideEnabled)
            {
                return DateTimeOffset.UtcNow;
            }

            if (_settings.UtcNow is null)
            {
                throw new InvalidOperationException(
                    $"{SystemTimeSettings.SectionName}:{nameof(SystemTimeSettings.OverrideEnabled)} is true but "
                    + $"{SystemTimeSettings.SectionName}:{nameof(SystemTimeSettings.UtcNow)} is not set.");
            }

            return _settings.UtcNow.Value.ToUniversalTime();
        }
    }
}
