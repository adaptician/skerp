using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Skerp.Domain.Customers;

namespace Skerp.Infrastructure.Persistence.EntityConfigurations;

internal sealed class CustomerConfiguration : MinimumAuditConfiguration<Customer, Guid>
{
    public override void Configure(EntityTypeBuilder<Customer> builder)
    {
        base.Configure(builder);

        builder.ToTable("Customers");

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(Customer.NameMaxLength)
            .UseCollation(PersistenceCollations.NoCase);

        builder.Property(c => c.Email)
            .IsRequired()
            .HasMaxLength(Customer.EmailMaxLength);

        // Unique among live rows only, so a soft-deleted customer's name can be reused (api.md).
        builder.HasIndex(c => c.Name)
            .IsUnique()
            .HasFilter(PersistenceCollations.NotDeletedFilter);
    }
}
