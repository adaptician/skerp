namespace Skerp.Domain.Shared;

/// <summary>
/// The audit base every entity inherits unless it is explicitly exempt: UTC creation and
/// modification times, and soft deletion. The persistence layer stamps these fields and
/// filters out soft-deleted rows; domain code never sets them.
/// </summary>
public abstract class MinimumAudit<TPrimaryKey> : Entity<TPrimaryKey>, IAuditStamp
{
    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? LastModifiedAt { get; private set; }

    public bool IsDeleted { get; private set; }

    public DateTimeOffset? DeletedAt { get; private set; }

    void IAuditStamp.Created(DateTimeOffset utcNow) => CreatedAt = utcNow;

    void IAuditStamp.Modified(DateTimeOffset utcNow) => LastModifiedAt = utcNow;

    void IAuditStamp.Deleted(DateTimeOffset utcNow)
    {
        IsDeleted = true;
        DeletedAt = utcNow;
        LastModifiedAt = utcNow;
    }
}
