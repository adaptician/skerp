using MediatR;
using Skerp.Application.Common;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;

namespace Skerp.Application.PurchaseOrders.List;

/// <summary>
/// One page of purchase orders (api.md → List). Every filter is optional and they combine.
/// <see cref="CreatedMin"/> and <see cref="CreatedMax"/> are inclusive instants. Line items are not
/// included; they load per order through the get-by-id query.
/// </summary>
public sealed record ListPurchaseOrdersQuery(
    string? Search,
    short? StatusId,
    IReadOnlyList<Guid>? CustomerIds,
    DateTimeOffset? CreatedMin,
    DateTimeOffset? CreatedMax,
    string? Sorting,
    int? SkipCount,
    int? MaxResultCount) : IRequest<Result<PagedResponse<PurchaseOrderListItem>>>
{
    public const int DefaultMaxResultCount = 10;
}

/// <summary>
/// An order as a list row shows it: totals are the server's, line items are counted only, and
/// <see cref="AllowedStatusIds"/> are the statuses it may move to now (empty once terminal), and
/// <see cref="IsEditable"/> and <see cref="IsDeletable"/> say whether it may be edited or deleted
/// (Pending only).
/// </summary>
public sealed record PurchaseOrderListItem(
    Guid Id,
    string Reference,
    DateTimeOffset CreatedAt,
    CustomerSummary Customer,
    NamedValue Currency,
    NamedValue Status,
    decimal Total,
    int LineItemCount,
    IReadOnlyList<short> AllowedStatusIds,
    bool IsEditable,
    bool IsDeletable)
{
    public static PurchaseOrderListItem From(PurchaseOrderSummary summary) =>
        new(
            summary.Order.Id,
            summary.Order.Reference,
            summary.Order.CreatedAt,
            CustomerSummary.From(summary.Order),
            PurchaseOrderNames.Currency(summary.Order.CurrencyId),
            PurchaseOrderNames.Status(summary.Order.CurrentStatusId),
            summary.Order.Total,
            summary.LineItemCount,
            PurchaseOrderNames.AllowedStatusIds(summary.Order),
            PurchaseOrderNames.IsEditable(summary.Order),
            PurchaseOrderNames.IsDeletable(summary.Order));
}
