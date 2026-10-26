using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Skerp.Application.Abstractions.Time;
using Skerp.Domain.Shared;

namespace Skerp.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Stamps <see cref="MinimumAudit{TPrimaryKey}"/> fields once per save, in UTC, from the injected
/// clock, and turns every delete of an audited entity into a soft delete.
/// </summary>
internal sealed class AuditInterceptor(IDateTimeOffsetProvider clock) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Stamp(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Stamp(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void Stamp(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var utcNow = clock.UtcNow.ToUniversalTime();

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.Entity is not IAuditStamp audited)
            {
                continue;
            }

            switch (entry.State)
            {
                case EntityState.Added:
                    audited.Created(utcNow);
                    break;
                case EntityState.Modified:
                    audited.Modified(utcNow);
                    break;
                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    audited.Deleted(utcNow);
                    break;
                case EntityState.Detached:
                case EntityState.Unchanged:
                default:
                    break;
            }
        }
    }
}
