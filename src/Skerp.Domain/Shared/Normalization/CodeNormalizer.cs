using System.Globalization;

namespace Skerp.Domain.Shared.Normalization;

/// <summary>
/// Normalisation rule 1 (api.md) for identifier codes: trim, upper-case with the invariant culture,
/// then validate. A value is never silently stripped of characters it should not contain.
/// </summary>
internal static class CodeNormalizer
{
    public static Result<string> Normalize(string? raw, int minLength, int maxLength, CodeErrors errors)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return errors.Required;
        }

        var value = raw.Trim().ToUpper(CultureInfo.InvariantCulture);

        if (!value.All(IsAllowed))
        {
            return errors.InvalidCharacters;
        }

        if (value.Length < minLength || value.Length > maxLength)
        {
            return errors.InvalidLength;
        }

        return value;
    }

    /// <summary>A–Z, 0–9 and <c>- _ . /</c>; whitespace inside the value is an error.</summary>
    private static bool IsAllowed(char c) =>
        c is (>= 'A' and <= 'Z') or (>= '0' and <= '9') or '-' or '_' or '.' or '/';

    /// <summary>The errors one kind of code reports, so each keeps its own error codes.</summary>
    internal sealed record CodeErrors(Error Required, Error InvalidCharacters, Error InvalidLength);
}
