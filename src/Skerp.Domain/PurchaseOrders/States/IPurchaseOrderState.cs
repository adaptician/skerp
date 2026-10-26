namespace Skerp.Domain.PurchaseOrders.States;

/// <summary>
/// One purchase-order status as a State (GoF State pattern): what it allows next and what it permits.
/// Reached only through <see cref="PurchaseOrderStatusContext"/>.
/// </summary>
public interface IPurchaseOrderState
{
    StatusId Id { get; }

    /// <summary>True for Fulfilled and Cancelled: no further change of any kind.</summary>
    bool IsTerminal { get; }

    /// <summary>True only while Pending: currency, notes and line items may change.</summary>
    bool AllowsEdit { get; }

    /// <summary>True only while Pending: the order may be soft-deleted.</summary>
    bool AllowsDelete { get; }

    /// <summary>The statuses this one may move to, in lifecycle order.</summary>
    IReadOnlyList<StatusId> NextStatuses { get; }
}
