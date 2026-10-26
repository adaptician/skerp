using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Infrastructure.Persistence.EntityConfigurations;

internal sealed class PurchaseOrderConfiguration : MinimumAuditConfiguration<PurchaseOrder, Guid>
{
    public override void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        base.Configure(builder);

        builder.ToTable("PurchaseOrders");

        builder.Property(o => o.Reference)
            .IsRequired()
            .HasMaxLength(ReferenceNormalizer.MaxLength);

        builder.Property(o => o.CurrencyId).IsRequired();
        builder.Property(o => o.CurrentStatusId).IsRequired();
        builder.Property(o => o.Total).IsRequired().HasPrecision(18, 2);
        builder.Property(o => o.Notes).HasMaxLength(PurchaseOrder.NotesMaxLength);

        // Customers are never deleted with an order (brief: cascade excludes customers).
        builder.HasOne(o => o.Customer)
            .WithMany()
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Line items are soft-deleted with their order by the application, never by the database.
        builder.HasMany(o => o.LineItems)
            .WithOne()
            .HasForeignKey(l => l.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.Navigation(o => o.LineItems).UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasMany(o => o.StatusChanges)
            .WithOne()
            .HasForeignKey(s => s.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.Navigation(o => o.StatusChanges).UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasIndex(o => o.Reference)
            .IsUnique()
            .HasFilter(PersistenceCollations.NotDeletedFilter);
        builder.HasIndex(o => new { o.CustomerId, o.IsDeleted });
        builder.HasIndex(o => new { o.IsDeleted, o.CreatedAt });
    }
}
