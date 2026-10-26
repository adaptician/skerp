using FluentValidation;
using MediatR;
using Skerp.Application.PurchaseOrders.List;
using Skerp.Application.Validation;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;

namespace Skerp.Application.PurchaseOrders.Get;

/// <summary>
/// One order with one page of its line items (api.md → One by Id): the row's lazy load. The id
/// arrives as text so a malformed GUID is a descriptive 400, not a routing 404.
/// </summary>
public sealed record GetPurchaseOrderQuery(string? Id, int? SkipCount, int? MaxResultCount)
    : IRequest<Result<PurchaseOrderResponse>>
{
    public const int DefaultMaxResultCount = 20;
}

internal sealed class GetPurchaseOrderQueryValidator : AbstractValidator<GetPurchaseOrderQuery>
{
    public static readonly Error InvalidId = Error.Validation(
        "PurchaseOrder.InvalidId",
        "The purchase order id is not a valid identifier.");

    public GetPurchaseOrderQueryValidator()
    {
        RuleFor(q => q.Id).Must(id => Guid.TryParse(id, out _)).WithError(InvalidId);

        RuleFor(q => q.SkipCount)
            .Must(skip => skip is null or >= 0)
            .WithError(ListPurchaseOrdersQueryValidator.InvalidSkipCount);

        RuleFor(q => q.MaxResultCount)
            .Must(take => take is null or (>= 1 and <= ListPurchaseOrdersQueryValidator.MaxPageSize))
            .WithError(ListPurchaseOrdersQueryValidator.InvalidMaxResultCount);
    }
}

internal sealed class GetPurchaseOrderQueryHandler(IPurchaseOrderRepository purchaseOrders)
    : IRequestHandler<GetPurchaseOrderQuery, Result<PurchaseOrderResponse>>
{
    public async Task<Result<PurchaseOrderResponse>> Handle(GetPurchaseOrderQuery query, CancellationToken cancellationToken)
    {
        var id = Guid.Parse(query.Id!);
        var order = await purchaseOrders.FindByIdAsync(id, cancellationToken);
        if (order is null)
        {
            return PurchaseOrderErrors.NotFound;
        }

        var lines = await purchaseOrders.ListLineItemsAsync(
            id,
            query.SkipCount ?? 0,
            query.MaxResultCount ?? GetPurchaseOrderQuery.DefaultMaxResultCount,
            cancellationToken);

        return PurchaseOrderResponse.From(order, lines.Items, lines.TotalCount);
    }
}
