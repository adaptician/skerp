namespace Skerp.Application.PurchaseOrders.Monitoring;

/// <summary>
/// Tells Monitor Mode clients that a purchase order changed. Handlers call it only after the change
/// is saved, and never for a refused request. An implementation must not throw: the change is
/// already committed, so a failed notification is logged, not returned.
/// </summary>
public interface IPurchaseOrderChangeNotifier
{
    Task NotifyAsync(PurchaseOrderChange change, CancellationToken cancellationToken);
}
