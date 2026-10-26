namespace Skerp.Domain.Shared.Normalization;

/// <summary>
/// The one implementation of rule 1 for purchase-order references: create, the availability
/// lookup and search all call it, and the client never re-implements it.
/// </summary>
public static class ReferenceNormalizer
{
    public const int MinLength = 5;
    public const int MaxLength = 128;

    private static readonly CodeNormalizer.CodeErrors Errors = new(
        Error.Validation("PurchaseOrder.ReferenceRequired", "A reference number is required."),
        Error.Validation(
            "PurchaseOrder.ReferenceInvalidCharacters",
            "A reference number may only contain letters, digits and - _ . / with no spaces."),
        Error.Validation(
            "PurchaseOrder.ReferenceInvalidLength",
            $"A reference number must be {MinLength} to {MaxLength} characters long."));

    /// <summary>Trims, upper-cases and validates <paramref name="raw"/>; the value is the canonical reference.</summary>
    public static Result<string> Normalize(string? raw) =>
        CodeNormalizer.Normalize(raw, MinLength, MaxLength, Errors);

    /// <summary>
    /// The same rule for a partial reference typed into the list search: any length from one
    /// character, so <c>po-2026</c> finds every 2026 order.
    /// </summary>
    public static Result<string> NormalizeSearch(string? raw) =>
        CodeNormalizer.Normalize(raw, 1, MaxLength, Errors);
}
