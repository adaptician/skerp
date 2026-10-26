namespace Skerp.Domain.Products;

/// <summary>Persistence operations on products. Soft-deleted products are never returned.</summary>
public interface IProductRepository
{
    Task<IReadOnlyList<Product>> FindByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken);

    /// <summary>The SKUs among <paramref name="skus"/> that already belong to a product, ignoring case.</summary>
    Task<IReadOnlyList<string>> FindExistingSkusAsync(IReadOnlyCollection<string> skus, CancellationToken cancellationToken);

    /// <summary>Products whose SKU starts with <paramref name="skuPrefix"/>, in SKU order.</summary>
    Task<IReadOnlyList<Product>> FindBySkuPrefixAsync(string skuPrefix, int maxResults, CancellationToken cancellationToken);

    void Add(Product product);
}
