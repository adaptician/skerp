using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Skerp.Domain.PurchaseOrders;

namespace Skerp.Infrastructure.Persistence.EntityConfigurations;

/// <summary>
/// The append-only status history. Exempt from <c>MinimumAudit</c> (entities.md), so it has no
/// soft-delete filter: history rows are kept whatever happens to their order.
/// </summary>
internal sealed class PurchaseOrderStatusChangeConfiguration : IEntityTypeConfiguration<PurchaseOrderStatusChange>
{
    public void Configure(EntityTypeBuilder<PurchaseOrderStatusChange> builder)
    {
        builder.ToTable("PurchaseOrderStatusChanges");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedOnAdd();

        builder.Property(s => s.StatusId).IsRequired();
        builder.Property(s => s.ChangedAt).IsRequired();

        builder.HasIndex(s => s.PurchaseOrderId);
    }
}
