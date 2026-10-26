using Skerp.Domain.PurchaseOrders;

namespace Skerp.Application.PurchaseOrders.List;

/// <summary>
/// Parses the list's <c>sorting</c> value: a field name, a space and <c>asc</c> or <c>desc</c>
/// (case-insensitive), for example <c>createdAt desc</c>. Empty means the default, newest first.
/// </summary>
public static class PurchaseOrderSorting
{
    public const string Default = "createdAt desc";
    public const int MaxLength = 128;

    private static readonly Dictionary<string, PurchaseOrderSortField> Fields = new(StringComparer.OrdinalIgnoreCase)
    {
        ["createdAt"] = PurchaseOrderSortField.CreatedAt,
        ["reference"] = PurchaseOrderSortField.Reference,
        ["customer"] = PurchaseOrderSortField.Customer,
        ["total"] = PurchaseOrderSortField.Total,
        ["status"] = PurchaseOrderSortField.Status,
    };

    public static bool TryParse(string? sorting, out PurchaseOrderSortField field, out bool descending)
    {
        var parts = (string.IsNullOrWhiteSpace(sorting) ? Default : sorting)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        field = PurchaseOrderSortField.CreatedAt;
        descending = true;

        if (parts.Length is < 1 or > 2 || !Fields.TryGetValue(parts[0], out field))
        {
            return false;
        }

        if (parts.Length == 1)
        {
            descending = false;
            return true;
        }

        descending = parts[1].Equals("desc", StringComparison.OrdinalIgnoreCase);
        return descending || parts[1].Equals("asc", StringComparison.OrdinalIgnoreCase);
    }
}
