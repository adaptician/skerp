using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Skerp.Domain.Shared;

namespace Skerp.Infrastructure.Persistence.EntityConfigurations;

/// <summary>
/// Base configuration for every <see cref="MinimumAudit{TPrimaryKey}"/> entity: the key, the audit
/// columns and the soft-delete query filter. Derived configurations call <c>base.Configure</c>
/// and add only their own properties. Override <see cref="BuildQueryFilter"/> to combine filters;
/// calling <c>HasQueryFilter</c> again would silently replace the soft-delete filter.
/// </summary>
internal abstract class MinimumAuditConfiguration<TEntity, TPrimaryKey> : IEntityTypeConfiguration<TEntity>
    where TEntity : MinimumAudit<TPrimaryKey>
{
    public virtual void Configure(EntityTypeBuilder<TEntity> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.CreatedAt).IsRequired();
        builder.Property(e => e.LastModifiedAt);
        builder.Property(e => e.IsDeleted).IsRequired();
        builder.Property(e => e.DeletedAt);

        builder.HasQueryFilter(BuildQueryFilter());
    }

    protected virtual Expression<Func<TEntity, bool>> BuildQueryFilter() => entity => !entity.IsDeleted;
}
