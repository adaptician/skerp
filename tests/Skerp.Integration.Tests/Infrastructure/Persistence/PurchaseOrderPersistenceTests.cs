using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Skerp.Application.Abstractions.Time;
using Skerp.Domain.Customers;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;
using Skerp.Infrastructure.Persistence;
using Skerp.Infrastructure.Persistence.Interceptors;

namespace Skerp.Integration.Tests.Infrastructure.Persistence;

/// <summary>
/// The purchase-order schema against real SQLite, built by the committed migrations: decimals and
/// timestamps order and filter in SQL, names and SKUs are unique ignoring case among live rows, and
/// soft-deleted orders never come back.
/// </summary>
public sealed class PurchaseOrderPersistenceTests : IAsyncLifetime, IDisposable
{
    private static readonly DateTimeOffset Start = new(2026, 10, 1, 8, 0, 0, TimeSpan.Zero);

    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private readonly MutableClock _clock = new(Start);

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    public void Dispose() => _connection.Dispose();

    [Fact]
    public async Task SaveAndLoad_RoundTripsAmountsExactly()
    {
        var id = await AddOrderAsync("PO-2026-001", (3, 0.3333m), (7, 999_999_999.9999m));

        await using var context = CreateContext();
        var order = await context.Set<PurchaseOrder>().Include(o => o.LineItems).SingleAsync(o => o.Id == id);

        order.LineItems.Select(l => l.Price).Should().BeEquivalentTo([0.3333m, 999_999_999.9999m]);
        order.LineItems.Select(l => l.Total).Should().BeEquivalentTo([0.9999m, 6_999_999_999.9993m]);
        order.Total.Should().Be(7_000_000_001.00m);
    }

    [Fact]
    public async Task OrderByAndFilterOnTotal_TranslateToSql()
    {
        await AddOrderAsync("PO-2026-001", (1, 10.10m));
        await AddOrderAsync("PO-2026-002", (1, 2.50m));
        await AddOrderAsync("PO-2026-003", (1, 100.01m));

        await using var context = CreateContext();
        var references = await context.Set<PurchaseOrder>()
            .Where(o => o.Total >= 2.51m)
            .OrderByDescending(o => o.Total)
            .Select(o => o.Reference)
            .ToListAsync();

        references.Should().Equal("PO-2026-003", "PO-2026-001");
    }

    [Fact]
    public async Task OrderByAndFilterOnCreatedAt_TranslateToSql()
    {
        await AddOrderAsync("PO-2026-001", (1, 1m));
        _clock.UtcNow = Start.AddDays(2);
        await AddOrderAsync("PO-2026-002", (1, 1m));
        _clock.UtcNow = Start.AddDays(4);
        await AddOrderAsync("PO-2026-003", (1, 1m));

        await using var context = CreateContext();
        var references = await context.Set<PurchaseOrder>()
            .Where(o => o.CreatedAt >= Start.AddDays(1) && o.CreatedAt < Start.AddDays(5))
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => o.Reference)
            .ToListAsync();

        references.Should().Equal("PO-2026-003", "PO-2026-002");
    }

    [Fact]
    public async Task SaveOrder_WritesItsInitialStatusChange()
    {
        var id = await AddOrderAsync("PO-2026-001", (1, 1m));

        await using var context = CreateContext();
        var history = await context.Set<PurchaseOrderStatusChange>().Where(s => s.PurchaseOrderId == id).ToListAsync();

        history.Should().ContainSingle().Which.StatusId.Should().Be(StatusId.Pending);
        history[0].Id.Should().BePositive();
        history[0].ChangedAt.Should().Be(Start);
    }

    [Fact]
    public async Task DuplicateReference_AmongLiveOrders_IsRejectedByTheDatabase()
    {
        await AddOrderAsync("PO-2026-001", (1, 1m));

        var duplicate = () => AddOrderAsync("PO-2026-001", (1, 1m));

        await duplicate.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task CustomerName_IsUniqueIgnoringCase_AmongLiveRows()
    {
        await using (var context = CreateContext())
        {
            context.Add(Customer.Create("Alpha Studios", "orders@alpha.co.za").Value);
            await context.SaveChangesAsync();
        }

        await using (var context = CreateContext())
        {
            (await context.Set<Customer>().AnyAsync(c => c.Name == "ALPHA studios")).Should().BeTrue();

            context.Add(Customer.Create("ALPHA STUDIOS", "other@alpha.co.za").Value);
            var save = () => context.SaveChangesAsync();
            await save.Should().ThrowAsync<DbUpdateException>();
        }
    }

    [Fact]
    public async Task SoftDeletedCustomerName_CanBeReused()
    {
        await using (var context = CreateContext())
        {
            var customer = Customer.Create("Alpha Studios", "orders@alpha.co.za").Value;
            context.Add(customer);
            await context.SaveChangesAsync();
            context.Remove(customer);
            await context.SaveChangesAsync();
        }

        await using var reuse = CreateContext();
        reuse.Add(Customer.Create("Alpha Studios", "new@alpha.co.za").Value);
        var save = () => reuse.SaveChangesAsync();
        await save.Should().NotThrowAsync();
    }

    [Fact]
    public async Task Sku_IsUniqueIgnoringCase()
    {
        await using var context = CreateContext();
        context.Add(Product.Create("SDA001", "Delicious Soda").Value);
        await context.SaveChangesAsync();

        (await context.Set<Product>().Where(p => new[] { "sda001" }.Contains(p.Sku)).CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task SoftDeletedOrder_IsExcludedFromQueries()
    {
        var id = await AddOrderAsync("PO-2026-001", (1, 1m));
        await using (var context = CreateContext())
        {
            context.Remove(await context.Set<PurchaseOrder>().SingleAsync(o => o.Id == id));
            await context.SaveChangesAsync();
        }

        await using var verify = CreateContext();
        (await verify.Set<PurchaseOrder>().AnyAsync()).Should().BeFalse();
        (await verify.Set<PurchaseOrder>().IgnoreQueryFilters().SingleAsync()).IsDeleted.Should().BeTrue();
    }

    private async Task<Guid> AddOrderAsync(string reference, params (int Quantity, decimal Price)[] lines)
    {
        await using var context = CreateContext();
        var customer = await context.Set<Customer>().FirstOrDefaultAsync()
            ?? Customer.Create("Alpha Studios", "orders@alpha.co.za").Value;
        var products = lines
            .Select((_, i) => Product.Create($"SKU-{reference}-{i}", "Delicious Soda").Value)
            .ToList();
        var order = PurchaseOrder.Create(
            reference,
            customer,
            CurrencyId.Zar,
            null,
            lines.Select((l, i) => new PurchaseOrder.NewLineItem(products[i], l.Quantity, l.Price)).ToList(),
            _clock.UtcNow).Value;

        context.Add(order);
        await context.SaveChangesAsync();
        return order.Id;
    }

    private ApplicationDbContext CreateContext() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseSqlite(_connection)
        .AddInterceptors(new AuditInterceptor(_clock))
        .Options);

    private sealed class MutableClock(DateTimeOffset utcNow) : IDateTimeOffsetProvider
    {
        public DateTimeOffset UtcNow { get; set; } = utcNow;
    }
}
