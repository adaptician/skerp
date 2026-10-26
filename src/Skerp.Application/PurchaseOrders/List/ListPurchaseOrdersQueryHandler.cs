using MediatR;
using Skerp.Application.Common;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Application.PurchaseOrders.List;

internal sealed class ListPurchaseOrdersQueryHandler(IPurchaseOrderRepository purchaseOrders)
    : IRequestHandler<ListPurchaseOrdersQuery, Result<PagedResponse<PurchaseOrderListItem>>>
{
    public async Task<Result<PagedResponse<PurchaseOrderListItem>>> Handle(
        ListPurchaseOrdersQuery query,
        CancellationToken cancellationToken)
    {
        // The validator has already refused an unknown sort; this only reads the parsed value.
        _ = PurchaseOrderSorting.TryParse(query.Sorting, out var sortField, out var descending);

        var criteria = new PurchaseOrderListCriteria(
            Search: string.IsNullOrWhiteSpace(query.Search) ? null : ReferenceNormalizer.NormalizeSearch(query.Search).Value,
            StatusId: query.StatusId is { } status ? (StatusId)status : null,
            CustomerIds: query.CustomerIds ?? [],
            CreatedMin: query.CreatedMin,
            CreatedMax: query.CreatedMax,
            SortField: sortField,
            Descending: descending,
            Skip: query.SkipCount!.Value,
            Take: query.MaxResultCount ?? ListPurchaseOrdersQuery.DefaultMaxResultCount);

        var page = await purchaseOrders.ListAsync(criteria, cancellationToken);

        return new PagedResponse<PurchaseOrderListItem>(
            page.Items.Select(PurchaseOrderListItem.From).ToList(),
            page.TotalCount);
    }
}
