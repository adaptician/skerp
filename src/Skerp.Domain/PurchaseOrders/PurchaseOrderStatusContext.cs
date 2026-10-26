using Skerp.Domain.PurchaseOrders.States;
using Skerp.Domain.Shared;

namespace Skerp.Domain.PurchaseOrders;

/// <summary>
/// The only way a purchase order's status is set or checked (brief: "MUST BE USED whenever a purchase
/// order status is created, edited, or updated"). It maps the order's current status to its State,
/// applies the transition rules, appends the history row and guards edit and delete.
/// </summary>
public sealed class PurchaseOrderStatusContext
{
    private readonly PurchaseOrder _order;

    private PurchaseOrderStatusContext(PurchaseOrder order)
    {
        _order = order;
    }

    /// <summary>The order's current State.</summary>
    public IPurchaseOrderState State => StateOf(_order.CurrentStatusId);

    /// <summary>The statuses the order may move to now (empty once terminal).</summary>
    public IReadOnlyList<StatusId> AllowedTransitions => State.NextStatuses;

    public static PurchaseOrderStatusContext For(PurchaseOrder order) => new(order);

    /// <summary>The State for a status; every defined <see cref="StatusId"/> has one.</summary>
    public static IPurchaseOrderState StateOf(StatusId statusId) => statusId switch
    {
        StatusId.Pending => PendingState.Instance,
        StatusId.Confirmed => ConfirmedState.Instance,
        StatusId.Fulfilled => FulfilledState.Instance,
        StatusId.Cancelled => CancelledState.Instance,
        _ => throw new ArgumentOutOfRangeException(nameof(statusId), statusId, "Unknown purchase-order status."),
    };

    /// <summary>The status every new order starts in (brief: Pending).</summary>
    public static StatusId InitialStatus => StatusId.Pending;

    /// <summary>A new order's first status, recorded as the first history row.</summary>
    internal static void Start(PurchaseOrder order, DateTimeOffset utcNow) =>
        order.RecordStatus(new StatusTicket(InitialStatus, utcNow));

    /// <summary>
    /// Moves the order to <paramref name="target"/> when its State allows it, appending a history row.
    /// Otherwise the status is unchanged and the error explains what is allowed.
    /// </summary>
    public Result ChangeTo(StatusId target, DateTimeOffset utcNow)
    {
        if (!Enum.IsDefined(target))
        {
            return Result.Failure(PurchaseOrderErrors.InvalidStatus);
        }

        var state = State;
        if (!state.NextStatuses.Contains(target))
        {
            return Result.Failure(PurchaseOrderErrors.InvalidStatusTransition(state, target));
        }

        _order.RecordStatus(new StatusTicket(target, utcNow));
        return Result.Success();
    }

    /// <summary>Success while the order may be edited (Pending only).</summary>
    public Result EnsureEditable() =>
        State.AllowsEdit ? Result.Success() : Result.Failure(PurchaseOrderErrors.NotEditable(State.Id));

    /// <summary>Success while the order may be deleted (Pending only).</summary>
    public Result EnsureDeletable() =>
        State.AllowsDelete ? Result.Success() : Result.Failure(PurchaseOrderErrors.NotDeletable(State.Id));

    /// <summary>
    /// Permission to record one status, which <see cref="PurchaseOrder"/> requires before it sets
    /// <see cref="PurchaseOrder.CurrentStatusId"/>. Only this context issues one.
    /// </summary>
    internal sealed class StatusTicket
    {
        internal StatusTicket(StatusId statusId, DateTimeOffset utcNow)
        {
            StatusId = statusId;
            UtcNow = utcNow;
        }

        public StatusId StatusId { get; }

        public DateTimeOffset UtcNow { get; }
    }
}
