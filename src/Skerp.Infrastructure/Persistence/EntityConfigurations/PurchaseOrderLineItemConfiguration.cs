using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Skerp.Domain.PurchaseOrders;

namespace Skerp.Infrastructure.Persistence.EntityConfigurations;

internal sealed class PurchaseOrderLineItemConfiguration : MinimumAuditConfiguration<PurchaseOrderLineItem, Guid>
{
    public override void Configure(EntityTypeBuilder<PurchaseOrderLineItem> builder)
    {
        base.Configure(builder);

        builder.ToTable("PurchaseOrderLineItems");

        builder.Property(l => l.Quantity).IsRequired();
        builder.Property(l => l.Price).IsRequired().HasPrecision(18, 4);
        builder.Property(l => l.Total).IsRequired().HasPrecision(18, 4);

        // Products are never deleted with a line (brief: cascade excludes products).
        builder.HasOne(l => l.Product)
            .WithMany()
            .HasForeignKey(l => l.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(l => new { l.PurchaseOrderId, l.IsDeleted });
    }
}
