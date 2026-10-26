namespace Skerp.Domain.PurchaseOrders;

/// <summary>Persistence operations on purchase orders. Soft-deleted orders are never returned.</summary>
public interface IPurchaseOrderRepository
{
    /// <summary>True when an order with the normalised <paramref name="reference"/> exists.</summary>
    Task<bool> ReferenceExistsAsync(string reference, CancellationToken cancellationToken);

    /// <summary>One page of orders matching <paramref name="criteria"/>, each with its customer loaded.</summary>
    Task<PagedList<PurchaseOrderSummary>> ListAsync(PurchaseOrderListCriteria criteria, CancellationToken cancellationToken);

    /// <summary>The order with its customer, or null when it does not exist or is deleted.</summary>
    Task<PurchaseOrder?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// One page of an order's live line items with their products, oldest first, then by SKU.
    /// </summary>
    Task<PagedList<PurchaseOrderLineItem>> ListLineItemsAsync(
        Guid purchaseOrderId,
        int skip,
        int take,
        CancellationToken cancellationToken);

    /// <summary>
    /// The order, tracked for an edit, with its customer and its live line items and their products;
    /// null when it does not exist or is deleted.
    /// </summary>
    Task<PurchaseOrder?> FindForEditAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// Records an edit's line changes: added lines are inserted, and removed lines are marked deleted,
    /// which the audit interceptor turns into a soft delete.
    /// </summary>
    void SaveRevision(PurchaseOrder.Revision revision);

    /// <summary>
    /// Marks an order loaded by <see cref="FindForEditAsync"/> and its live line items deleted; the audit
    /// interceptor turns that into a soft delete.
    /// </summary>
    void Remove(PurchaseOrder purchaseOrder);

    void Add(PurchaseOrder purchaseOrder);
}
