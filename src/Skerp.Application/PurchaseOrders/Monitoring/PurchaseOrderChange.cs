namespace Skerp.Application.PurchaseOrders.Monitoring;

/// <summary>What happened to a purchase order, as Monitor Mode reports it.</summary>
public enum PurchaseOrderChangeKind
{
    Created,
    Edited,
    StatusChanged,
    Deleted,
}

/// <summary>
/// A committed change to one purchase order. It carries no order data: each monitoring client
/// fetches its own page again under its own query.
/// </summary>
public sealed record PurchaseOrderChange(Guid Id, PurchaseOrderChangeKind Kind);
