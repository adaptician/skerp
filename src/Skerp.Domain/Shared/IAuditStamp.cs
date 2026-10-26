namespace Skerp.Domain.Shared;

/// <summary>
/// How persistence stamps the audit fields of any <see cref="MinimumAudit{TPrimaryKey}"/>,
/// whatever its key type. Internal so that only the persistence layer can call it.
/// </summary>
internal interface IAuditStamp
{
    void Created(DateTimeOffset utcNow);

    void Modified(DateTimeOffset utcNow);

    void Deleted(DateTimeOffset utcNow);
}
