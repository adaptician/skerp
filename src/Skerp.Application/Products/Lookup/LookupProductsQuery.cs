using MediatR;
using Skerp.Application.Common;
using Skerp.Domain.Products;
using Skerp.Domain.Shared;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Application.Products.Lookup;

/// <summary>
/// Products whose SKU starts with the typed text (api.md → Product Lookup). The text is normalised
/// by rule 1, so <c>sda</c> finds <c>SDA001</c>.
/// </summary>
public sealed record LookupProductsQuery(string? Sku) : IRequest<Result<LookupResponse<ProductLookupItem>>>;

public sealed record ProductLookupItem(Guid Id, string Sku, string Name);

internal sealed class LookupProductsQueryHandler(IProductRepository products)
    : IRequestHandler<LookupProductsQuery, Result<LookupResponse<ProductLookupItem>>>
{
    private const int MaxResults = 10;

    public async Task<Result<LookupResponse<ProductLookupItem>>> Handle(
        LookupProductsQuery query,
        CancellationToken cancellationToken)
    {
        var prefix = SkuNormalizer.NormalizePrefix(query.Sku);
        if (prefix.IsFailure)
        {
            return prefix.Error;
        }

        var matches = await products.FindBySkuPrefixAsync(prefix.Value, MaxResults, cancellationToken);
        return new LookupResponse<ProductLookupItem>(
            matches.Select(p => new ProductLookupItem(p.Id, p.Sku, p.Name)).ToList());
    }
}
