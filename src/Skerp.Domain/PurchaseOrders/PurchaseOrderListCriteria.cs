namespace Skerp.Domain.PurchaseOrders;

/// <summary>The fields a purchase-order list can be sorted by.</summary>
public enum PurchaseOrderSortField
{
    CreatedAt = 0,
    Reference = 1,
    Customer = 2,
    Total = 3,
    Status = 4,
}

/// <summary>
/// One page of the purchase-order list: optional filters (all combine), the sort and the page.
/// <paramref name="Search"/> is an already-normalised fragment of a reference.
/// </summary>
public sealed record PurchaseOrderListCriteria(
    string? Search,
    StatusId? StatusId,
    IReadOnlyCollection<Guid> CustomerIds,
    DateTimeOffset? CreatedMin,
    DateTimeOffset? CreatedMax,
    PurchaseOrderSortField SortField,
    bool Descending,
    int Skip,
    int Take);

/// <summary>An order in a list page, with how many live line items it has.</summary>
public sealed record PurchaseOrderSummary(PurchaseOrder Order, int LineItemCount);

/// <summary>A page of results and the total number of matches across all pages.</summary>
public sealed record PagedList<TItem>(IReadOnlyList<TItem> Items, int TotalCount);
