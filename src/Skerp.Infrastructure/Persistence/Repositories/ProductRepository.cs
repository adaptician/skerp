using Microsoft.EntityFrameworkCore;
using Skerp.Domain.Products;

namespace Skerp.Infrastructure.Persistence.Repositories;

internal sealed class ProductRepository(ApplicationDbContext dbContext) : IProductRepository
{
    public async Task<IReadOnlyList<Product>> FindByIdsAsync(
        IReadOnlyCollection<Guid> ids,
        CancellationToken cancellationToken) =>
        await dbContext.Set<Product>()
            .Where(p => ids.Contains(p.Id))
            .ToListAsync(cancellationToken);

    // The Sku column uses NOCASE, so the IN comparison ignores case in the database.
    public async Task<IReadOnlyList<string>> FindExistingSkusAsync(
        IReadOnlyCollection<string> skus,
        CancellationToken cancellationToken) =>
        await dbContext.Set<Product>()
            .Where(p => skus.Contains(p.Sku))
            .Select(p => p.Sku)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Product>> FindBySkuPrefixAsync(
        string skuPrefix,
        int maxResults,
        CancellationToken cancellationToken)
    {
        var pattern = $"{LikePattern.Escape(skuPrefix)}%";

        return await dbContext.Set<Product>()
            .AsNoTracking()
            // Like function is called prior to query execution.
            .Where(p => EF.Functions.Like(p.Sku, pattern, LikePattern.EscapeCharacter))
            .OrderBy(p => p.Sku)
            .Take(maxResults)
            .ToListAsync(cancellationToken);
    }

    public void Add(Product product) => dbContext.Set<Product>().Add(product);
}
