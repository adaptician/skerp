using FluentValidation;
using MediatR;
using Skerp.Application.Abstractions.Data;
using Skerp.Application.PurchaseOrders.Get;
using Skerp.Application.PurchaseOrders.Monitoring;
using Skerp.Application.Validation;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;

namespace Skerp.Application.PurchaseOrders.Delete;

/// <summary>
/// Soft-deletes a Pending order and its line items (api.md → Delete endpoint). Its customer,
/// products and status history are never touched; no purchase-order path hard-deletes.
/// </summary>
public sealed record DeletePurchaseOrderCommand(string? Id) : IRequest<Result>;

internal sealed class DeletePurchaseOrderCommandValidator : AbstractValidator<DeletePurchaseOrderCommand>
{
    public DeletePurchaseOrderCommandValidator()
    {
        RuleFor(c => c.Id)
            .Must(id => Guid.TryParse(id, out _))
            .WithError(GetPurchaseOrderQueryValidator.InvalidId);
    }
}

internal sealed class DeletePurchaseOrderCommandHandler(
    IPurchaseOrderRepository purchaseOrders,
    IUnitOfWork unitOfWork,
    IPurchaseOrderChangeNotifier changeNotifier) : IRequestHandler<DeletePurchaseOrderCommand, Result>
{
    public async Task<Result> Handle(DeletePurchaseOrderCommand command, CancellationToken cancellationToken)
    {
        var order = await purchaseOrders.FindForEditAsync(Guid.Parse(command.Id!), cancellationToken);
        if (order is null)
        {
            return Result.Failure(PurchaseOrderErrors.NotFound);
        }

        var deletable = PurchaseOrderStatusContext.For(order).EnsureDeletable();
        if (deletable.IsFailure)
        {
            return deletable;
        }

        purchaseOrders.Remove(order);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        // The change is committed: monitoring clients hear of it even if this request is cancelled now.
        await changeNotifier.NotifyAsync(new PurchaseOrderChange(order.Id, PurchaseOrderChangeKind.Deleted), CancellationToken.None);

        return Result.Success();
    }
}
