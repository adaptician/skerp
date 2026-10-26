using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Skerp.Application.Abstractions.Data;
using Skerp.Application.Abstractions.Time;
using Skerp.Domain.Customers;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;
using Skerp.Infrastructure.HealthChecks;
using Skerp.Infrastructure.Persistence;
using Skerp.Infrastructure.Persistence.Interceptors;
using Skerp.Infrastructure.Persistence.Repositories;
using Skerp.Infrastructure.Persistence.Seeders;
using Skerp.Infrastructure.Services.Time;

namespace Skerp.Infrastructure;

public static class DependencyInjection
{
    /// <summary>The health-check tag the readiness probe (<c>/alive</c>) runs.</summary>
    public const string ReadinessTag = "ready";

    /// <summary>
    /// Registers the clock, the SQLite <see cref="ApplicationDbContext"/>, the repositories, seeding and
    /// health checks.
    /// </summary>
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        services.Configure<SystemTimeSettings>(configuration.GetSection(SystemTimeSettings.SectionName));
        if (environment.IsProduction())
        {
            services.AddSingleton<IDateTimeOffsetProvider, SystemDateTimeOffsetProvider>();
        }
        else
        {
            services.AddSingleton<IDateTimeOffsetProvider, ConfigurableDateTimeOffsetProvider>();
        }

        var connectionString = configuration.GetConnectionString(PersistenceSettings.ConnectionStringName)
            ?? throw new InvalidOperationException(
                $"Connection string '{PersistenceSettings.ConnectionStringName}' is not configured.");
        var resolvedConnectionString = PersistenceSettings.ResolveConnectionString(
            connectionString,
            environment.ContentRootPath);

        services.AddScoped<AuditInterceptor>();
        services.AddDbContext<ApplicationDbContext>((provider, options) => options
            .UseSqlite(resolvedConnectionString)
            .AddInterceptors(provider.GetRequiredService<AuditInterceptor>()));
        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<ApplicationDbContext>());

        services.AddScoped<IPurchaseOrderRepository, PurchaseOrderRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();

        services.Configure<SeedingSettings>(configuration.GetSection(SeedingSettings.SectionName));
        services.AddScoped<DatabaseInitializer>();
        services.AddScoped<ISeeder, PurchaseOrderSeeder>();

        services.AddHealthChecks()
            .AddCheck<DatabaseHealthCheck>(DatabaseHealthCheck.Name, tags: [ReadinessTag]);

        return services;
    }

    /// <summary>
    /// Applies pending migrations and runs the seeders. Call once, before the app starts serving.
    /// </summary>
    public static async Task InitializeDatabaseAsync(this WebApplication app, CancellationToken cancellationToken = default)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var initializer = scope.ServiceProvider.GetRequiredService<DatabaseInitializer>();
        await initializer.InitializeAsync(cancellationToken);
    }
}
