using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Skerp.Domain.Products;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Infrastructure.Persistence.EntityConfigurations;

internal sealed class ProductConfiguration : MinimumAuditConfiguration<Product, Guid>
{
    public override void Configure(EntityTypeBuilder<Product> builder)
    {
        base.Configure(builder);

        builder.ToTable("Products");

        builder.Property(p => p.Sku)
            .IsRequired()
            .HasMaxLength(SkuNormalizer.MaxLength)
            .UseCollation(PersistenceCollations.NoCase);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(Product.NameMaxLength)
            .UseCollation(PersistenceCollations.NoCase);

        builder.HasIndex(p => p.Sku)
            .IsUnique()
            .HasFilter(PersistenceCollations.NotDeletedFilter);
    }
}
