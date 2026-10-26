using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Skerp.Application.Abstractions.Time;
using Skerp.Domain.Shared;
using Skerp.Infrastructure.Persistence;
using Skerp.Infrastructure.Persistence.EntityConfigurations;
using Skerp.Infrastructure.Persistence.Interceptors;

namespace Skerp.Integration.Tests.Infrastructure.Persistence;

/// <summary>
/// Proves the persistence conventions every entity inherits — audit stamping, soft deletion and
/// DateTimeOffset ordering — against real SQLite, with a test-only entity.
/// </summary>
public sealed class AuditInterceptorTests : IAsyncLifetime, IDisposable
{
    private static readonly DateTimeOffset FirstInstant = new(2026, 10, 22, 8, 0, 0, TimeSpan.Zero);

    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private readonly MutableClock _clock = new(FirstInstant);

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        await using var context = CreateContext();
        await context.Database.EnsureCreatedAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    public void Dispose() => _connection.Dispose();

    [Fact]
    public async Task Add_StampsCreatedAtFromClock()
    {
        var id = await AddWidgetAsync("Delicious Soda");

        await using var context = CreateContext();
        var widget = await context.Widgets.SingleAsync(w => w.Id == id);

        widget.CreatedAt.Should().Be(FirstInstant);
        widget.LastModifiedAt.Should().BeNull();
        widget.IsDeleted.Should().BeFalse();
    }

    [Fact]
    public async Task Audit_StoresTimestampsAsUtcIso8601Text()
    {
        var id = await AddWidgetAsync("Delicious Soda");
        _clock.UtcNow = new DateTimeOffset(2026, 10, 22, 12, 30, 15, 123, TimeSpan.FromHours(2));

        await using (var context = CreateContext())
        {
            context.Widgets.Remove(await context.Widgets.SingleAsync(w => w.Id == id));
            await context.SaveChangesAsync();
        }

        await using var command = _connection.CreateCommand();
        command.CommandText = "SELECT typeof(CreatedAt), CreatedAt, LastModifiedAt, DeletedAt FROM Widgets";
        await using var reader = await command.ExecuteReaderAsync();
        (await reader.ReadAsync()).Should().BeTrue();

        reader.GetString(0).Should().Be("text");
        reader.GetString(1).Should().Be("2026-10-22T08:00:00.000Z");
        reader.GetString(2).Should().Be("2026-10-22T10:30:15.123Z");
        reader.GetString(3).Should().Be("2026-10-22T10:30:15.123Z");
    }

    [Fact]
    public async Task Update_StampsLastModifiedAt()
    {
        var id = await AddWidgetAsync("Delicious Soda");
        _clock.UtcNow = FirstInstant.AddHours(1);

        await using (var context = CreateContext())
        {
            var widget = await context.Widgets.SingleAsync(w => w.Id == id);
            widget.Name = "Delicious Soda Zero";
            await context.SaveChangesAsync();
        }

        await using var verify = CreateContext();
        (await verify.Widgets.SingleAsync(w => w.Id == id)).LastModifiedAt.Should().Be(FirstInstant.AddHours(1));
    }

    [Fact]
    public async Task Remove_SoftDeletesAndHidesTheRow()
    {
        var id = await AddWidgetAsync("Delicious Soda");
        _clock.UtcNow = FirstInstant.AddHours(2);

        await using (var context = CreateContext())
        {
            context.Widgets.Remove(await context.Widgets.SingleAsync(w => w.Id == id));
            await context.SaveChangesAsync();
        }

        await using var verify = CreateContext();
        (await verify.Widgets.AnyAsync(w => w.Id == id)).Should().BeFalse();
        var stored = await verify.Widgets.IgnoreQueryFilters().SingleAsync(w => w.Id == id);
        stored.IsDeleted.Should().BeTrue();
        stored.DeletedAt.Should().Be(FirstInstant.AddHours(2));
    }

    [Fact]
    public async Task OrderByCreatedAt_TranslatesToSqlAndOrdersChronologically()
    {
        await AddWidgetAsync("Second");
        _clock.UtcNow = FirstInstant.AddMinutes(-5);
        await AddWidgetAsync("First");
        _clock.UtcNow = FirstInstant.AddMinutes(5);
        await AddWidgetAsync("Third");

        await using var context = CreateContext();
        var names = await context.Widgets
            .Where(w => w.CreatedAt >= FirstInstant.AddMinutes(-10))
            .OrderBy(w => w.CreatedAt)
            .Select(w => w.Name)
            .ToListAsync();

        names.Should().Equal("First", "Second", "Third");
    }

    [Fact]
    public async Task FilterByCreatedAt_WithANonUtcParameter_ComparesTheSameInstant()
    {
        await AddWidgetAsync("At first instant");

        // The same instant expressed at UTC+02:00 must still match an inclusive lower bound.
        var sameInstantElsewhere = FirstInstant.ToOffset(TimeSpan.FromHours(2));
        await using var context = CreateContext();
        var names = await context.Widgets
            .Where(w => w.CreatedAt >= sameInstantElsewhere)
            .Select(w => w.Name)
            .ToListAsync();

        names.Should().Equal("At first instant");
    }

    private async Task<Guid> AddWidgetAsync(string name)
    {
        await using var context = CreateContext();
        var widget = new Widget { Id = Guid.NewGuid(), Name = name };
        context.Widgets.Add(widget);
        await context.SaveChangesAsync();
        return widget.Id;
    }

    private WidgetDbContext CreateContext() => new(new DbContextOptionsBuilder<WidgetDbContext>()
        .UseSqlite(_connection)
        .AddInterceptors(new AuditInterceptor(_clock))
        .Options);

    private sealed class MutableClock(DateTimeOffset utcNow) : IDateTimeOffsetProvider
    {
        public DateTimeOffset UtcNow { get; set; } = utcNow;
    }

    private sealed class Widget : MinimumAudit<Guid>
    {
        public required string Name { get; set; }
    }

    private sealed class WidgetConfiguration : MinimumAuditConfiguration<Widget, Guid>
    {
        public override void Configure(EntityTypeBuilder<Widget> builder)
        {
            base.Configure(builder);
            builder.Property(w => w.Name).IsRequired().HasMaxLength(64);
        }
    }

    private sealed class WidgetDbContext(DbContextOptions<WidgetDbContext> options) : DbContext(options)
    {
        public DbSet<Widget> Widgets => Set<Widget>();

        protected override void OnModelCreating(ModelBuilder modelBuilder) =>
            new WidgetConfiguration().Configure(modelBuilder.Entity<Widget>());

        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder) =>
            SqliteConventions.Apply(configurationBuilder);
    }
}
