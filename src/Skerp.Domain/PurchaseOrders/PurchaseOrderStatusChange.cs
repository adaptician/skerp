using Skerp.Domain.Shared;

namespace Skerp.Domain.PurchaseOrders;

/// <summary>
/// One entry in an order's status history, appended on every status change and never updated.
/// Exempt from <see cref="MinimumAudit{TPrimaryKey}"/> (entities.md); <see cref="ChangedAt"/> records
/// when the change happened.
/// </summary>
public sealed class PurchaseOrderStatusChange : Entity<long>
{
    private PurchaseOrderStatusChange()
    {
    }

    public required Guid PurchaseOrderId { get; init; }

    public required StatusId StatusId { get; init; }

    public required DateTimeOffset ChangedAt { get; init; }

    internal static PurchaseOrderStatusChange Create(Guid purchaseOrderId, StatusId statusId, DateTimeOffset utcNow) =>
        new()
        {
            // Zero lets the database assign the identity.
            Id = 0,
            PurchaseOrderId = purchaseOrderId,
            StatusId = statusId,
            ChangedAt = utcNow.ToUniversalTime(),
        };
}
