using Microsoft.EntityFrameworkCore;
using Skerp.Domain.PurchaseOrders;

namespace Skerp.Infrastructure.Persistence.Repositories;

internal sealed class PurchaseOrderRepository(ApplicationDbContext dbContext) : IPurchaseOrderRepository
{
    public Task<bool> ReferenceExistsAsync(string reference, CancellationToken cancellationToken) =>
        dbContext.Set<PurchaseOrder>().AnyAsync(o => o.Reference == reference, cancellationToken);

    public async Task<PagedList<PurchaseOrderSummary>> ListAsync(
        PurchaseOrderListCriteria criteria,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Set<PurchaseOrder>().AsNoTracking();

        if (!string.IsNullOrEmpty(criteria.Search))
        {
            // References are stored normalised (upper-case), and the search is normalised the same way.
            query = query.Where(o => o.Reference.Contains(criteria.Search));
        }

        if (criteria.StatusId is { } statusId)
        {
            query = query.Where(o => o.CurrentStatusId == statusId);
        }

        if (criteria.CustomerIds.Count > 0)
        {
            query = query.Where(o => criteria.CustomerIds.Contains(o.CustomerId));
        }

        if (criteria.CreatedMin is { } createdMin)
        {
            query = query.Where(o => o.CreatedAt >= createdMin);
        }

        if (criteria.CreatedMax is { } createdMax)
        {
            query = query.Where(o => o.CreatedAt <= createdMax);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var orders = await Sort(query.Include(o => o.Customer), criteria.SortField, criteria.Descending)
            .Skip(criteria.Skip)
            .Take(criteria.Take)
            .ToListAsync(cancellationToken);

        var ids = orders.Select(o => o.Id).ToList();
        var lineCounts = await dbContext.Set<PurchaseOrderLineItem>()
            .Where(l => ids.Contains(l.PurchaseOrderId))
            .GroupBy(l => l.PurchaseOrderId)
            .Select(g => new { PurchaseOrderId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.PurchaseOrderId, g => g.Count, cancellationToken);

        return new PagedList<PurchaseOrderSummary>(
            orders.Select(o => new PurchaseOrderSummary(o, lineCounts.GetValueOrDefault(o.Id))).ToList(),
            totalCount);
    }

    public Task<PurchaseOrder?> FindByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Set<PurchaseOrder>()
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

    public Task<PurchaseOrder?> FindForEditAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Set<PurchaseOrder>()
            .Include(o => o.Customer)
            .Include(o => o.LineItems).ThenInclude(l => l.Product)
            .AsSplitQuery()
            .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

    public void SaveRevision(PurchaseOrder.Revision revision)
    {
        // A line added to a tracked order already has its key, so change detection alone would take it
        // for an existing row; it is added explicitly.
        dbContext.Set<PurchaseOrderLineItem>().AddRange(revision.Added);
        dbContext.Set<PurchaseOrderLineItem>().RemoveRange(revision.Removed);
    }

    public void Remove(PurchaseOrder purchaseOrder)
    {
        dbContext.Set<PurchaseOrderLineItem>().RemoveRange(purchaseOrder.LineItems);
        dbContext.Set<PurchaseOrder>().Remove(purchaseOrder);
    }

    public async Task<PagedList<PurchaseOrderLineItem>> ListLineItemsAsync(
        Guid purchaseOrderId,
        int skip,
        int take,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Set<PurchaseOrderLineItem>()
            .AsNoTracking()
            .Where(l => l.PurchaseOrderId == purchaseOrderId);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(l => l.Product)
            .OrderBy(l => l.CreatedAt)
            .ThenBy(l => l.Product!.Sku)
            .ThenBy(l => l.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return new PagedList<PurchaseOrderLineItem>(items, totalCount);
    }

    public void Add(PurchaseOrder purchaseOrder) => dbContext.Set<PurchaseOrder>().Add(purchaseOrder);

    /// <summary>Applies the sort, with the reference as a tie-breaker so pages never overlap.</summary>
    private static IQueryable<PurchaseOrder> Sort(IQueryable<PurchaseOrder> query, PurchaseOrderSortField field, bool descending) =>
        (field, descending) switch
        {
            (PurchaseOrderSortField.Reference, false) => query.OrderBy(o => o.Reference),
            (PurchaseOrderSortField.Reference, true) => query.OrderByDescending(o => o.Reference),
            (PurchaseOrderSortField.Customer, false) => query.OrderBy(o => o.Customer!.Name).ThenBy(o => o.Reference),
            (PurchaseOrderSortField.Customer, true) => query.OrderByDescending(o => o.Customer!.Name).ThenBy(o => o.Reference),
            (PurchaseOrderSortField.Total, false) => query.OrderBy(o => o.Total).ThenBy(o => o.Reference),
            (PurchaseOrderSortField.Total, true) => query.OrderByDescending(o => o.Total).ThenBy(o => o.Reference),
            (PurchaseOrderSortField.Status, false) => query.OrderBy(o => o.CurrentStatusId).ThenBy(o => o.Reference),
            (PurchaseOrderSortField.Status, true) => query.OrderByDescending(o => o.CurrentStatusId).ThenBy(o => o.Reference),
            (_, false) => query.OrderBy(o => o.CreatedAt).ThenBy(o => o.Reference),
            (_, true) => query.OrderByDescending(o => o.CreatedAt).ThenBy(o => o.Reference),
        };
}
