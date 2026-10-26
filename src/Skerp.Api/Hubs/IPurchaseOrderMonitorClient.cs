namespace Skerp.Api.Hubs;

/// <summary>
/// The messages a Monitor Mode client receives from <see cref="PurchaseOrderMonitorHub"/>. Public because
/// SignalR emits the strongly typed client proxy in another assembly.
/// </summary>
public interface IPurchaseOrderMonitorClient
{
    /// <summary>An order was created, edited, moved to another status or deleted.</summary>
    Task PurchaseOrderChanged(PurchaseOrderChangedMessage message);
}

/// <summary>
/// The pushed change: the order's id and what happened to it (<c>created</c>, <c>edited</c>,
/// <c>statusChanged</c> or <c>deleted</c>). No order data, so a client never sees a row its own
/// query would not return.
/// </summary>
public sealed record PurchaseOrderChangedMessage(Guid Id, string Change);
