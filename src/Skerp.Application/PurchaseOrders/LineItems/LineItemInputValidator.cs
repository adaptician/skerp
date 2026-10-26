using FluentValidation;
using Skerp.Application.Validation;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Application.PurchaseOrders.LineItems;

/// <summary>
/// The rules every line on a create or edit request meets: a product chosen by id, or a new product by
/// SKU and name (never all three), a quantity of 1–1 000 and a price of at least 0.01 with at most
/// four decimals.
/// </summary>
internal sealed class LineItemInputValidator : AbstractValidator<LineItemInput>
{
    public static readonly Domain.Shared.Error ProductRequired = Domain.Shared.Error.Validation(
        "Product.Required",
        "Each line item needs a product: select an existing one, or enter a new SKU and name.");

    public static readonly Domain.Shared.Error AmbiguousProduct = Domain.Shared.Error.Validation(
        "Product.Ambiguous",
        "Send either an existing product's id, or a new product's SKU and name, not all three.");

    public LineItemInputValidator()
    {
        RuleFor(l => l.Product).NotNull().WithError(ProductRequired);

        When(l => l.Product is not null, () =>
        {
            RuleFor(l => l.Product!)
                .Must(p => !(p.Id.HasValue && p.Sku is not null && p.Name is not null))
                .WithError(AmbiguousProduct);

            When(l => l.Product!.Id is null, () =>
            {
                RuleFor(l => l.Product!.Sku).SatisfiesDomainRule(SkuNormalizer.Normalize);
                RuleFor(l => l.Product!.Name).SatisfiesDomainRule(Product.NormalizeName);
            });
        });

        RuleFor(l => l.Quantity)
            .Must(q => q.HasValue && PurchaseOrderLineItem.IsValidQuantity(q.Value))
            .WithError(PurchaseOrderErrors.InvalidQuantity);

        RuleFor(l => l.Price)
            .Must(p => p.HasValue && PurchaseOrderLineItem.IsValidPrice(p.Value))
            .WithError(PurchaseOrderErrors.InvalidPrice);
    }
}
