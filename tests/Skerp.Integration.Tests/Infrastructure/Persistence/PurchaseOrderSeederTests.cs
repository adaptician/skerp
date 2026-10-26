using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Skerp.Domain.PurchaseOrders;
using Skerp.Infrastructure.Persistence;
using Skerp.Infrastructure.Persistence.Seeders;
using Skerp.Integration.Tests.Api;

namespace Skerp.Integration.Tests.Infrastructure.Persistence;

/// <summary>The demo seed runs once at startup, covers every status, and never duplicates itself.</summary>
public sealed class PurchaseOrderSeederTests(SkerpApiFactory factory) : IClassFixture<SkerpApiFactory>
{
    [Fact]
    public async Task Startup_SeedsTheDemoOrders()
    {
        _ = factory.CreateClient();
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var orders = await context.Set<PurchaseOrder>().Include(o => o.LineItems).ToListAsync();

        orders.Should().HaveCount(PurchaseOrderSeeder.OrderCount);
        orders.Select(o => o.CurrentStatusId).Distinct().Should().BeEquivalentTo(Enum.GetValues<StatusId>());
        orders.Single(o => o.Reference == PurchaseOrderSeeder.ManyLinesReference).LineItems.Should().HaveCount(25);
        orders.Select(o => o.CreatedAt).Distinct().Should().HaveCount(PurchaseOrderSeeder.OrderCount);
    }

    [Fact]
    public async Task SeedingAgain_AddsNothing()
    {
        _ = factory.CreateClient();
        await using var scope = factory.Services.CreateAsyncScope();
        var seeder = scope.ServiceProvider.GetServices<ISeeder>().OfType<PurchaseOrderSeeder>().Single();

        await seeder.SeedAsync(CancellationToken.None);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await context.Set<PurchaseOrder>().CountAsync()).Should().Be(PurchaseOrderSeeder.OrderCount);
    }
}
