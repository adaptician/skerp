namespace Skerp.Domain.PurchaseOrders;

/// <summary>
/// The only place purchase-order totals are computed (brief: Purchase Order Calculator). The
/// calculate endpoint, create and edit all use it; the client never computes a total.
/// </summary>
public static class PurchaseOrderCalculator
{
    /// <summary>Decimal places a grand total is rounded to.</summary>
    public const int GrandTotalDecimals = 2;

    /// <summary>
    /// <c>quantity × price</c>, unrounded. A price carries at most four decimals, so the product does too.
    /// </summary>
    public static decimal LineTotal(int quantity, decimal price) => quantity * price;

    /// <summary>The sum of the line totals, rounded to two decimals with banker's rounding.</summary>
    public static decimal GrandTotal(IEnumerable<decimal> lineTotals) =>
        Math.Round(lineTotals.Sum(), GrandTotalDecimals, MidpointRounding.ToEven);

    /// <summary>Totals for each line, keyed by the caller's identifier, and their grand total.</summary>
    public static PurchaseOrderTotals Calculate(IEnumerable<LineInput> lines)
    {
        var lineTotals = lines
            .Select(line => new LineTotalResult(line.Id, LineTotal(line.Quantity, line.Price)))
            .ToList();

        return new PurchaseOrderTotals(lineTotals, GrandTotal(lineTotals.Select(l => l.Total)));
    }

    /// <summary>One line to total: the caller's identifier, the quantity and the unit price.</summary>
    public sealed record LineInput(string Id, int Quantity, decimal Price);

    public sealed record LineTotalResult(string Id, decimal Total);

    public sealed record PurchaseOrderTotals(IReadOnlyList<LineTotalResult> LineItems, decimal Total);
}
