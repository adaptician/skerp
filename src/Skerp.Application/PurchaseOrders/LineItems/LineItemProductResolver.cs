using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;

namespace Skerp.Application.PurchaseOrders.LineItems;

/// <summary>
/// Turns validated line inputs into Domain lines: existing products are loaded by id, new products are
/// created. A missing product, or a new SKU that already exists (in the database or twice in the same
/// request), is refused. Shared by create and edit.
/// </summary>
internal sealed class LineItemProductResolver(IProductRepository products)
{
    public async Task<Result<IReadOnlyList<PurchaseOrder.NewLineItem>>> ResolveAsync(
        IReadOnlyList<LineItemInput> inputs,
        CancellationToken cancellationToken)
    {
        var existingProductInputs = inputs.Where(i => i.Product!.Id.HasValue).ToList();
        var newProductInputs = inputs.Where(i => !i.Product!.Id.HasValue).ToList();

        var existingIds = existingProductInputs.Select(i => i.Product!.Id!.Value).Distinct().ToList();
        var existing = (await products.FindByIdsAsync(existingIds, cancellationToken)).ToDictionary(p => p.Id);
        if (existing.Count != existingIds.Count)
        {
            return ProductErrors.NotFound;
        }

        var created = new List<Product>();
        foreach (var input in newProductInputs)
        {
            var product = Product.Create(input.Product!.Sku, input.Product.Name);
            if (product.IsFailure)
            {
                return product.Error;
            }

            created.Add(product.Value);
        }

        var newSkus = created.Select(p => p.Sku).ToList();
        if (newSkus.Distinct(StringComparer.OrdinalIgnoreCase).Count() != newSkus.Count
            || (newSkus.Count > 0 && (await products.FindExistingSkusAsync(newSkus, cancellationToken)).Count > 0))
        {
            return ProductErrors.DuplicateSku;
        }

        created.ForEach(products.Add);

        var existingLines = existingProductInputs.Select(input => ToLine(existing[input.Product!.Id!.Value], input));
        var newLines = newProductInputs.Zip(created, (input, product) => ToLine(product, input));
        return Result.Success<IReadOnlyList<PurchaseOrder.NewLineItem>>([.. existingLines, .. newLines]);
    }

    private static PurchaseOrder.NewLineItem ToLine(Product product, LineItemInput input) =>
        new(product, input.Quantity!.Value, input.Price!.Value);
}
