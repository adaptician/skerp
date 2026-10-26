namespace Skerp.Domain.PurchaseOrders;

/// <summary>
/// The lifecycle status of a purchase order. Values are numbered explicitly and spaced, so later
/// additions slot in without renumbering and the order conveys progression (entities.md).
/// </summary>
public enum StatusId : short
{
    Pending = 10,
    Confirmed = 20,
    Fulfilled = 60,
    Cancelled = 90,
}
