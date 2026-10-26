using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Skerp.Infrastructure.Persistence;

/// <summary>
/// Model conventions every SQLite context in this solution applies.
/// </summary>
internal static class SqliteConventions
{
    /// <summary>Every amount is stored as a whole number of ten-thousandths (four decimals).</summary>
    public const decimal DecimalScale = 10_000m;

    private const string Iso8601Format = "yyyy-MM-dd'T'HH:mm:ss.fff'Z'";

    public static void Apply(ModelConfigurationBuilder configurationBuilder)
    {
        // SQLite stores DateTimeOffset as text in whatever offset it was given, which cannot be ordered
        // or compared reliably. Every timestamp is stored as fixed-width UTC ISO 8601 text
        // (YYYY-MM-DDThh:mm:ss.sssZ): it sorts chronologically as text, stays correct whatever offset a
        // query parameter carries, and SQL date functions (DATEADD-style arithmetic, reporting) can read it
        // (entities.md: "use a supported mapping"). Values read back are UTC. Precision is milliseconds.
        configurationBuilder
            .Properties<DateTimeOffset>()
            .HaveConversion<UtcIso8601Converter>();

        // SQLite has no decimal type, and EF Core cannot order, compare or sum decimals stored as
        // text. Every amount carries at most four decimals (precision 18,4), so it is stored exactly
        // as a 64-bit count of ten-thousandths: ordering and range filters become integer comparisons.
        configurationBuilder
            .Properties<decimal>()
            .HaveConversion<TenThousandthsConverter>();
    }

    private sealed class UtcIso8601Converter() : ValueConverter<DateTimeOffset, string>(
        value => value.UtcDateTime.ToString(Iso8601Format, CultureInfo.InvariantCulture),
        text => DateTimeOffset.ParseExact(text, Iso8601Format, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal));

    private sealed class TenThousandthsConverter() : ValueConverter<decimal, long>(
        value => decimal.ToInt64(value * DecimalScale),
        stored => stored / DecimalScale);
}
