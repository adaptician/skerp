using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Skerp.Application.Abstractions.Time;
using Skerp.Domain.Customers;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;

namespace Skerp.Infrastructure.Persistence.Seeders;

/// <summary>
/// Demo data for reviewers: customers, products and <see cref="OrderCount"/> orders spread over the
/// last 60 days, in every status, one of them with 25 line items. Runs only while no purchase order
/// exists at all (soft-deleted ones included), so it never duplicates or overwrites data.
/// </summary>
internal sealed partial class PurchaseOrderSeeder(
    ApplicationDbContext dbContext,
    IDateTimeOffsetProvider clock,
    ILogger<PurchaseOrderSeeder> logger) : ISeeder
{
    public const int OrderCount = 30;

    /// <summary>The order seeded with more line items than one lazy-loaded page (20).</summary>
    public const string ManyLinesReference = "PO-2026-001";

    private static readonly (string Name, string Email)[] Customers =
    [
        ("Alpha Studios", "orders@alphastudios.co.za"),
        ("Brightwater Traders", "buying@brightwater.co.za"),
        ("Cedar & Stone Interiors", "procurement@cedarstone.co.za"),
        ("Delta Freight Logistics", "accounts@deltafreight.com"),
        ("Evergreen Grocers", "supply@evergreengrocers.co.za"),
        ("Foxglove Florists", "hello@foxglove.co.za"),
        ("Granite Peak Outfitters", "orders@granitepeak.com"),
        ("Harbour Lights Cafe", "manager@harbourlights.co.za"),
    ];

    private static readonly (string Sku, string Name, decimal Price)[] Products =
    [
        ("SDA001", "Delicious Soda", 9.99m),
        ("CAN001", "Delicious Candy", 12.99m),
        ("CHP010", "Sea Salt Chips", 18.50m),
        ("WTR500", "Still Water 500ml", 7.25m),
        ("COF250", "Ground Coffee 250g", 89.90m),
        ("TEA100", "Rooibos Tea 100 bags", 54.99m),
        ("BIS200", "Oat Biscuits", 24.75m),
        ("JUC1L", "Orange Juice 1L", 32.40m),
        ("NUT150", "Roasted Almonds 150g", 46.80m),
        ("CHC090", "Dark Chocolate Bar", 27.35m),
        ("PAP-A4", "Copy Paper A4 Ream", 79.99m),
        ("PEN-BLU", "Ballpoint Pen Blue", 4.50m),
        ("MUG-STD", "Ceramic Mug", 65.00m),
        ("NAP-50", "Serviettes 50 Pack", 15.95m),
        ("CUP-200", "Paper Cups 200ml", 38.60m),
        ("SUG1KG", "White Sugar 1kg", 26.99m),
        ("MLK1L", "Long Life Milk 1L", 21.49m),
        ("HNY375", "Raw Honey 375g", 74.95m),
        ("RCE2KG", "Basmati Rice 2kg", 59.90m),
        ("OIL750", "Olive Oil 750ml", 119.99m),
        ("SPC-PEP", "Black Pepper Grinder", 42.30m),
        ("SPC-SLT", "Sea Salt Grinder", 36.70m),
        ("FLR2KG", "Cake Flour 2.5kg", 44.45m),
        ("BTR500", "Salted Butter 500g", 69.99m),
        ("EGG18", "Free Range Eggs 18", 72.50m),
    ];

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.Set<PurchaseOrder>().IgnoreQueryFilters().AnyAsync(cancellationToken))
        {
            LogSkipped(logger);
            return;
        }

        var random = new Random(2026);
        var now = clock.UtcNow.ToUniversalTime();

        var customers = Customers.Select(c => Customer.Create(c.Name, c.Email).Value).ToList();
        var products = Products.Select(p => Product.Create(p.Sku, p.Name).Value).ToList();
        dbContext.Set<Customer>().AddRange(customers);
        dbContext.Set<Product>().AddRange(products);

        var createdAt = new Dictionary<Guid, DateTimeOffset>();
        for (var number = 1; number <= OrderCount; number++)
        {
            var reference = string.Create(CultureInfo.InvariantCulture, $"PO-2026-{number:000}");
            var lineCount = reference == ManyLinesReference ? 25 : random.Next(1, 6);
            var lines = Enumerable.Range(0, lineCount)
                .Select(i => products[(number + (i * 7)) % products.Count])
                .Select((product, i) => new PurchaseOrder.NewLineItem(
                    product,
                    random.Next(1, 25),
                    Products[products.IndexOf(product)].Price))
                .ToList();

            // Older orders first: PO-2026-030 is the most recent.
            var orderCreatedAt = now.AddDays(-(OrderCount - number) * 2).AddHours(-random.Next(0, 12));
            var order = PurchaseOrder.Create(
                reference,
                customers[number % customers.Count],
                (CurrencyId)(1 + (number % 3)),
                number % 4 == 0 ? "Deliver to the loading bay before 10:00." : null,
                lines,
                orderCreatedAt).Value;

            // Every status is reached through valid transitions, as the application would.
            var context = PurchaseOrderStatusContext.For(order);
            foreach (var status in StatusPath(number))
            {
                var changed = context.ChangeTo(status, orderCreatedAt.AddHours(1));
                if (changed.IsFailure)
                {
                    throw new InvalidOperationException(
                        $"Seed status path for order {number} is invalid: {changed.Error.Description}");
                }
            }

            dbContext.Set<PurchaseOrder>().Add(order);
            createdAt[order.Id] = orderCreatedAt;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // The audit interceptor stamps "now"; back-date the demo orders so the list has a history.
        foreach (var (id, timestamp) in createdAt)
        {
            await dbContext.Set<PurchaseOrder>()
                .Where(o => o.Id == id)
                .ExecuteUpdateAsync(s => s.SetProperty(o => o.CreatedAt, timestamp), cancellationToken);
        }

        LogSeeded(logger, customers.Count, products.Count, OrderCount);
    }

    /// <summary>The statuses an order moves through after Pending, so every status is represented.</summary>
    private static StatusId[] StatusPath(int number) => (number % 5) switch
    {
        1 => [StatusId.Confirmed],
        2 => [StatusId.Confirmed, StatusId.Fulfilled],
        3 => [StatusId.Cancelled],
        _ => [],
    };

    [LoggerMessage(Level = LogLevel.Information, Message = "Purchase orders exist; demo seeding skipped")]
    private static partial void LogSkipped(ILogger logger);

    [LoggerMessage(Level = LogLevel.Information, Message = "Seeded {Customers} customers, {Products} products and {Orders} purchase orders")]
    private static partial void LogSeeded(ILogger logger, int customers, int products, int orders);
}
