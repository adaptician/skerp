using FluentAssertions;
using Microsoft.Extensions.Options;
using Skerp.Infrastructure.Services.Time;

namespace Skerp.Unit.Tests.Infrastructure.Services.Time;

public class ConfigurableDateTimeOffsetProviderTests
{
    [Fact]
    public void UtcNow_WhenOverrideEnabled_ReturnsConfiguredTimeInUtc()
    {
        var configured = new DateTimeOffset(2026, 10, 22, 14, 30, 0, TimeSpan.FromHours(2));
        var clock = Create(new SystemTimeSettings { OverrideEnabled = true, UtcNow = configured });

        clock.UtcNow.Should().Be(configured);
        clock.UtcNow.Offset.Should().Be(TimeSpan.Zero);
    }

    [Fact]
    public void UtcNow_WhenOverrideEnabledWithoutTime_Throws()
    {
        var clock = Create(new SystemTimeSettings { OverrideEnabled = true, UtcNow = null });

        var read = () => clock.UtcNow;

        read.Should().Throw<InvalidOperationException>().WithMessage("*SystemTime:UtcNow*");
    }

    [Fact]
    public void UtcNow_WhenOverrideDisabled_ReturnsRealTime()
    {
        var clock = Create(new SystemTimeSettings { OverrideEnabled = false, UtcNow = DateTimeOffset.UnixEpoch });

        clock.UtcNow.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromMinutes(1));
    }

    private static ConfigurableDateTimeOffsetProvider Create(SystemTimeSettings settings) =>
        new(Options.Create(settings));
}
