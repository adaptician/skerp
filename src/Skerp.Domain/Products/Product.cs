using Skerp.Domain.Shared;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Domain.Products;

/// <summary>
/// A product a line item orders. Created with the first order that names a new SKU; the SKU is
/// unique case-insensitively.
/// </summary>
public sealed class Product : MinimumAudit<Guid>
{
    public const int NameMinLength = 3;
    public const int NameMaxLength = 128;

    private Product()
    {
    }

    public required string Sku { get; init; }

    public required string Name { get; init; }

    /// <summary>Normalises the SKU (rule 1) and the name (rule 2), and validates both.</summary>
    public static Result<Product> Create(string? sku, string? name)
    {
        var normalizedSku = SkuNormalizer.Normalize(sku);
        if (normalizedSku.IsFailure)
        {
            return normalizedSku.Error;
        }

        var normalizedName = NormalizeName(name);
        if (normalizedName.IsFailure)
        {
            return normalizedName.Error;
        }

        return new Product { Id = Guid.NewGuid(), Sku = normalizedSku.Value, Name = normalizedName.Value };
    }

    /// <summary>Normalises a product name (rule 2) and checks it is 3–128 characters long.</summary>
    public static Result<string> NormalizeName(string? name)
    {
        var normalizedName = NameNormalizer.Normalize(name);
        if (normalizedName.Length == 0)
        {
            return ProductErrors.NameRequired;
        }

        return normalizedName.Length is < NameMinLength or > NameMaxLength
            ? ProductErrors.NameInvalidLength
            : normalizedName;
    }
}
