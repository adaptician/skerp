using Skerp.Domain.PurchaseOrders;

namespace Skerp.Application.PurchaseOrders;

/// <summary>
/// A purchase order as the API returns it (api.md → Response). Every total is the server's; the
/// client only displays it.
/// </summary>
public sealed record PurchaseOrderResponse(
    Guid Id,
    string Reference,
    DateTimeOffset CreatedAt,
    CustomerSummary Customer,
    NamedValue Currency,
    NamedValue Status,
    IReadOnlyList<LineItemResponse> LineItems,
    int LineItemCount,
    decimal Total,
    string? Notes,
    IReadOnlyList<short> AllowedStatusIds,
    bool IsEditable,
    bool IsDeletable)
{
    /// <summary>
    /// Maps an order whose customer and line-item products are loaded. <paramref name="lineItems"/>
    /// may be one page of the order's lines; <paramref name="lineItemCount"/> is the order's total.
    /// </summary>
    public static PurchaseOrderResponse From(
        PurchaseOrder order,
        IReadOnlyList<PurchaseOrderLineItem> lineItems,
        int? lineItemCount = null) =>
        new(
            order.Id,
            order.Reference,
            order.CreatedAt,
            CustomerSummary.From(order),
            PurchaseOrderNames.Currency(order.CurrencyId),
            PurchaseOrderNames.Status(order.CurrentStatusId),
            lineItems.Select(LineItemResponse.From).ToList(),
            lineItemCount ?? lineItems.Count,
            order.Total,
            order.Notes,
            PurchaseOrderNames.AllowedStatusIds(order),
            PurchaseOrderNames.IsEditable(order),
            PurchaseOrderNames.IsDeletable(order));
}

public sealed record CustomerSummary(Guid Id, string Name, string Email)
{
    public static CustomerSummary From(PurchaseOrder order) =>
        new(order.CustomerId, order.Customer?.Name ?? string.Empty, order.Customer?.Email ?? string.Empty);
}

/// <summary>An enum value with its display name, for example <c>{ id: 20, name: "Confirmed" }</c>.</summary>
public sealed record NamedValue(short Id, string Name);

public sealed record LineItemResponse(Guid Id, Guid ProductId, string Sku, string Name, int Quantity, decimal Price, decimal Total)
{
    public static LineItemResponse From(PurchaseOrderLineItem line) =>
        new(line.Id, line.ProductId, line.Product?.Sku ?? string.Empty, line.Product?.Name ?? string.Empty, line.Quantity, line.Price, line.Total);
}
