using MediatR;
using Skerp.Application.Abstractions.Data;
using Skerp.Application.Abstractions.Time;
using Skerp.Application.PurchaseOrders.LineItems;
using Skerp.Application.PurchaseOrders.Monitoring;
using Skerp.Domain.Customers;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Application.PurchaseOrders.Create;

/// <summary>
/// Creates a Pending order with its customer and products. A duplicate reference, a new customer
/// whose name exists, or a new SKU that exists is refused and nothing is written.
/// </summary>
internal sealed class CreatePurchaseOrderCommandHandler(
    IPurchaseOrderRepository purchaseOrders,
    ICustomerRepository customers,
    LineItemProductResolver productResolver,
    IUnitOfWork unitOfWork,
    IDateTimeOffsetProvider clock,
    IPurchaseOrderChangeNotifier changeNotifier) : IRequestHandler<CreatePurchaseOrderCommand, Result<PurchaseOrderResponse>>
{
    public async Task<Result<PurchaseOrderResponse>> Handle(
        CreatePurchaseOrderCommand command,
        CancellationToken cancellationToken)
    {
        var reference = ReferenceNormalizer.Normalize(command.Reference);
        if (reference.IsFailure)
        {
            return reference.Error;
        }

        if (await purchaseOrders.ReferenceExistsAsync(reference.Value, cancellationToken))
        {
            return PurchaseOrderErrors.DuplicateReferenceNumber;
        }

        var customer = await ResolveCustomerAsync(command.Customer!, cancellationToken);
        if (customer.IsFailure)
        {
            return customer.Error;
        }

        var lines = await productResolver.ResolveAsync(command.LineItems!, cancellationToken);
        if (lines.IsFailure)
        {
            return lines.Error;
        }

        var order = PurchaseOrder.Create(
            reference.Value,
            customer.Value,
            (CurrencyId)command.CurrencyId!.Value,
            command.Notes,
            lines.Value,
            clock.UtcNow);
        if (order.IsFailure)
        {
            return order.Error;
        }

        purchaseOrders.Add(order.Value);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        // The change is committed: monitoring clients hear of it even if this request is cancelled now.
        await changeNotifier.NotifyAsync(new PurchaseOrderChange(order.Value.Id, PurchaseOrderChangeKind.Created), CancellationToken.None);

        return PurchaseOrderResponse.From(order.Value, order.Value.LineItems);
    }

    private async Task<Result<Customer>> ResolveCustomerAsync(CustomerInput input, CancellationToken cancellationToken)
    {
        // An existing customer is used as stored; its name and email are never overwritten (api.md).
        if (input.Id is { } id)
        {
            var existing = await customers.FindByIdAsync(id, cancellationToken);
            return existing is null ? CustomerErrors.NotFound : existing;
        }

        var created = Customer.Create(input.Name, input.Email);
        if (created.IsFailure)
        {
            return created.Error;
        }

        // Same name, different email is the same customer for now, so a new one is refused (brief).
        if (await customers.NameExistsAsync(created.Value.Name, cancellationToken))
        {
            return CustomerErrors.DuplicateName;
        }

        customers.Add(created.Value);
        return created.Value;
    }
}
