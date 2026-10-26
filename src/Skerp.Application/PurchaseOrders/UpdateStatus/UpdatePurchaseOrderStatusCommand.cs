using FluentValidation;
using MediatR;
using Skerp.Application.Abstractions.Data;
using Skerp.Application.Abstractions.Time;
using Skerp.Application.PurchaseOrders.Get;
using Skerp.Application.PurchaseOrders.List;
using Skerp.Application.PurchaseOrders.Monitoring;
using Skerp.Application.Validation;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;

namespace Skerp.Application.PurchaseOrders.UpdateStatus;

/// <summary>
/// Moves an order to another status (api.md → Update Status). Only the status changes; the
/// <see cref="PurchaseOrderStatusContext"/> decides whether the move is allowed and records it.
/// </summary>
public sealed record UpdatePurchaseOrderStatusCommand(string? Id, short? StatusId)
    : IRequest<Result<PurchaseOrderListItem>>;

/// <summary>The request body of <c>PUT /purchase-orders/{id}/status</c>.</summary>
public sealed record UpdatePurchaseOrderStatusRequest(short? StatusId);

internal sealed class UpdatePurchaseOrderStatusCommandValidator : AbstractValidator<UpdatePurchaseOrderStatusCommand>
{
    public UpdatePurchaseOrderStatusCommandValidator()
    {
        RuleFor(c => c.Id)
            .Must(id => Guid.TryParse(id, out _))
            .WithError(GetPurchaseOrderQueryValidator.InvalidId);

        RuleFor(c => c.StatusId)
            .Must(id => id.HasValue && Enum.IsDefined((StatusId)id.Value))
            .WithError(PurchaseOrderErrors.InvalidStatus);
    }
}

internal sealed class UpdatePurchaseOrderStatusCommandHandler(
    IPurchaseOrderRepository purchaseOrders,
    IUnitOfWork unitOfWork,
    IDateTimeOffsetProvider clock,
    IPurchaseOrderChangeNotifier changeNotifier) : IRequestHandler<UpdatePurchaseOrderStatusCommand, Result<PurchaseOrderListItem>>
{
    public async Task<Result<PurchaseOrderListItem>> Handle(
        UpdatePurchaseOrderStatusCommand command,
        CancellationToken cancellationToken)
    {
        var order = await purchaseOrders.FindByIdAsync(Guid.Parse(command.Id!), cancellationToken);
        if (order is null)
        {
            return PurchaseOrderErrors.NotFound;
        }

        var changed = PurchaseOrderStatusContext.For(order).ChangeTo((StatusId)command.StatusId!.Value, clock.UtcNow);
        if (changed.IsFailure)
        {
            return changed.Error;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
        // The change is committed: monitoring clients hear of it even if this request is cancelled now.
        await changeNotifier.NotifyAsync(new PurchaseOrderChange(order.Id, PurchaseOrderChangeKind.StatusChanged), CancellationToken.None);

        var lineItemCount = (await purchaseOrders.ListLineItemsAsync(order.Id, 0, 1, cancellationToken)).TotalCount;
        return PurchaseOrderListItem.From(new PurchaseOrderSummary(order, lineItemCount));
    }
}
