using System.Text;

namespace Skerp.Domain.Shared.Normalization;

/// <summary>
/// Normalisation rule 2 (api.md) for names of customers and products: trim, and collapse every run
/// of whitespace to one space. Casing is kept as the user typed it; uniqueness is case-insensitive
/// in the database.
/// </summary>
public static class NameNormalizer
{
    public static string Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(raw.Length);
        var previousWasSpace = false;

        foreach (var c in raw.Trim())
        {
            if (char.IsWhiteSpace(c))
            {
                if (!previousWasSpace)
                {
                    builder.Append(' ');
                }

                previousWasSpace = true;
                continue;
            }

            builder.Append(c);
            previousWasSpace = false;
        }

        return builder.ToString();
    }
}
