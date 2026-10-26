namespace Skerp.Domain.PurchaseOrders.States;

/// <summary>Pending → Confirmed | Cancelled. The only status that allows edit and delete.</summary>
internal sealed class PendingState : IPurchaseOrderState
{
    public static readonly PendingState Instance = new();

    private PendingState()
    {
    }

    public StatusId Id => StatusId.Pending;

    public bool IsTerminal => false;

    public bool AllowsEdit => true;

    public bool AllowsDelete => true;

    public IReadOnlyList<StatusId> NextStatuses { get; } = [StatusId.Confirmed, StatusId.Cancelled];
}

/// <summary>Confirmed → Fulfilled | Cancelled. The order is otherwise immutable.</summary>
internal sealed class ConfirmedState : IPurchaseOrderState
{
    public static readonly ConfirmedState Instance = new();

    private ConfirmedState()
    {
    }

    public StatusId Id => StatusId.Confirmed;

    public bool IsTerminal => false;

    public bool AllowsEdit => false;

    public bool AllowsDelete => false;

    public IReadOnlyList<StatusId> NextStatuses { get; } = [StatusId.Fulfilled, StatusId.Cancelled];
}

/// <summary>Fulfilled is terminal: no change of any kind.</summary>
internal sealed class FulfilledState : IPurchaseOrderState
{
    public static readonly FulfilledState Instance = new();

    private FulfilledState()
    {
    }

    public StatusId Id => StatusId.Fulfilled;

    public bool IsTerminal => true;

    public bool AllowsEdit => false;

    public bool AllowsDelete => false;

    public IReadOnlyList<StatusId> NextStatuses { get; } = [];
}

/// <summary>Cancelled is terminal: no change of any kind.</summary>
internal sealed class CancelledState : IPurchaseOrderState
{
    public static readonly CancelledState Instance = new();

    private CancelledState()
    {
    }

    public StatusId Id => StatusId.Cancelled;

    public bool IsTerminal => true;

    public bool AllowsEdit => false;

    public bool AllowsDelete => false;

    public IReadOnlyList<StatusId> NextStatuses { get; } = [];
}
