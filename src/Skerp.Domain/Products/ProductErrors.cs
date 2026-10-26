using Skerp.Domain.Shared;

namespace Skerp.Domain.Products;

public static class ProductErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "Product.NotFound",
        "A selected product was not found.");

    public static readonly Error DuplicateSku = Error.Conflict(
        "Product.DuplicateSku",
        "A product with this SKU already exists. Select the existing product instead.");

    public static readonly Error NameRequired = Error.Validation(
        "Product.NameRequired",
        "A product name is required.");

    public static readonly Error NameInvalidLength = Error.Validation(
        "Product.NameInvalidLength",
        $"A product name must be {Product.NameMinLength} to {Product.NameMaxLength} characters long.");
}
