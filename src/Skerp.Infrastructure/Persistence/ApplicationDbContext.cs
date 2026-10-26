using Microsoft.EntityFrameworkCore;
using Skerp.Application.Abstractions.Data;

namespace Skerp.Infrastructure.Persistence;

/// <summary>
/// The SQLite unit of work. Entity configurations in this assembly are applied automatically;
/// audit stamping and soft deletion happen in <see cref="Interceptors.AuditInterceptor"/>.
/// </summary>
public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options), IUnitOfWork
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        SqliteConventions.Apply(configurationBuilder);
    }
}
