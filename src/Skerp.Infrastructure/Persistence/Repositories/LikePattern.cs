namespace Skerp.Infrastructure.Persistence.Repositories;

/// <summary>
/// Escapes user input for a SQL <c>LIKE</c> pattern, so <c>%</c> and <c>_</c> in a search term match
/// themselves instead of acting as wildcards.
/// </summary>
internal static class LikePattern
{
    public const string EscapeCharacter = "\\";

    public static string Escape(string value) => value
        .Replace(EscapeCharacter, EscapeCharacter + EscapeCharacter, StringComparison.Ordinal)
        .Replace("%", EscapeCharacter + "%", StringComparison.Ordinal)
        .Replace("_", EscapeCharacter + "_", StringComparison.Ordinal);
}
