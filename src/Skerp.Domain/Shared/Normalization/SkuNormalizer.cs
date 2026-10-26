namespace Skerp.Domain.Shared.Normalization;

/// <summary>
/// The one implementation of rule 1 for product SKUs: create, edit and the product lookup all call it.
/// </summary>
public static class SkuNormalizer
{
    public const int MinLength = 3;
    public const int MaxLength = 64;

    private static readonly CodeNormalizer.CodeErrors Errors = new(
        Error.Validation("Product.SkuRequired", "A SKU is required."),
        Error.Validation(
            "Product.SkuInvalidCharacters",
            "A SKU may only contain letters, digits and - _ . / with no spaces."),
        Error.Validation(
            "Product.SkuInvalidLength",
            $"A SKU must be {MinLength} to {MaxLength} characters long."));

    /// <summary>Trims, upper-cases and validates <paramref name="raw"/>; the value is the canonical SKU.</summary>
    public static Result<string> Normalize(string? raw) =>
        CodeNormalizer.Normalize(raw, MinLength, MaxLength, Errors);

    /// <summary>
    /// The same rule for a partial SKU typed into a search: any length from one character up, so a
    /// lookup can match as the user types.
    /// </summary>
    public static Result<string> NormalizePrefix(string? raw) =>
        CodeNormalizer.Normalize(raw, 1, MaxLength, Errors);
}
