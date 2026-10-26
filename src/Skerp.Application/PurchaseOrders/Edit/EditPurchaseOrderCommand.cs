using FluentValidation;
using MediatR;
using Skerp.Application.Abstractions.Data;
using Skerp.Application.PurchaseOrders.Create;
using Skerp.Application.PurchaseOrders.Get;
using Skerp.Application.PurchaseOrders.LineItems;
using Skerp.Application.PurchaseOrders.List;
using Skerp.Application.PurchaseOrders.Monitoring;
using Skerp.Application.Validation;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;

namespace Skerp.Application.PurchaseOrders.Edit;

/// <summary>
/// Edits a Pending order's currency, notes and line items (api.md → Edit endpoint). Reference and
/// customer never change. A line with an <c>id</c> is an existing line; one without is new; the order's
/// live lines absent from the request are soft-deleted. Totals are never accepted; they are calculated.
/// </summary>
public sealed record EditPurchaseOrderCommand(
    string? Id,
    short? CurrencyId,
    IReadOnlyList<LineItemInput>? LineItems,
    string? Notes) : IRequest<Result<PurchaseOrderListItem>>;

/// <summary>The request body of <c>PUT /purchase-orders/{id}</c>.</summary>
public sealed record EditPurchaseOrderRequest(
    short? CurrencyId,
    IReadOnlyList<LineItemInput>? LineItems,
    string? Notes)
{
    public EditPurchaseOrderCommand ToCommand(string id) => new(id, CurrencyId, LineItems, Notes);
}

internal sealed class EditPurchaseOrderCommandValidator : AbstractValidator<EditPurchaseOrderCommand>
{
    public EditPurchaseOrderCommandValidator()
    {
        RuleFor(c => c.Id)
            .Must(id => Guid.TryParse(id, out _))
            .WithError(GetPurchaseOrderQueryValidator.InvalidId);

        RuleFor(c => c.CurrencyId).NotNull().WithError(CreatePurchaseOrderCommandValidator.CurrencyRequired);
        RuleFor(c => c.CurrencyId)
            .Must(id => Enum.IsDefined((CurrencyId)id!.Value))
            .When(c => c.CurrencyId.HasValue)
            .WithError(PurchaseOrderErrors.InvalidCurrency);

        RuleFor(c => c.LineItems)
            .Must(lines => lines is { Count: >= PurchaseOrder.MinLineItems and <= PurchaseOrder.MaxLineItems })
            .WithError(PurchaseOrderErrors.InvalidLineItemCount);
        RuleForEach(c => c.LineItems).SetValidator(new LineItemInputValidator());
        RuleFor(c => c.LineItems)
            .Must(lines => lines!.Where(l => l.Id.HasValue).GroupBy(l => l.Id).All(g => g.Count() == 1))
            .When(c => c.LineItems is not null)
            .WithError(PurchaseOrderErrors.DuplicateLineItem);

        RuleFor(c => c.Notes)
            .MaximumLength(PurchaseOrder.NotesMaxLength)
            .WithError(PurchaseOrderErrors.NotesTooLong);
    }
}

/// <summary>
/// Loads the order with its live lines, checks each existing line keeps its product, resolves the new
/// lines' products as create does, and hands the revision to <see cref="PurchaseOrder.Revise"/>, which
/// refuses anything but a Pending order. Removed lines are soft-deleted; nothing is written on refusal.
/// </summary>
internal sealed class EditPurchaseOrderCommandHandler(
    IPurchaseOrderRepository purchaseOrders,
    LineItemProductResolver productResolver,
    IUnitOfWork unitOfWork,
    IPurchaseOrderChangeNotifier changeNotifier) : IRequestHandler<EditPurchaseOrderCommand, Result<PurchaseOrderListItem>>
{
    public async Task<Result<PurchaseOrderListItem>> Handle(
        EditPurchaseOrderCommand command,
        CancellationToken cancellationToken)
    {
        var order = await purchaseOrders.FindForEditAsync(Guid.Parse(command.Id!), cancellationToken);
        if (order is null)
        {
            return PurchaseOrderErrors.NotFound;
        }

        // A refused edit must not create the new lines' products, so the status is checked first.
        var editable = PurchaseOrderStatusContext.For(order).EnsureEditable();
        if (editable.IsFailure)
        {
            return editable.Error;
        }

        var existingInputs = command.LineItems!.Where(i => i.Id.HasValue).ToList();
        var newInputs = command.LineItems!.Where(i => !i.Id.HasValue).ToList();

        var liveLines = order.LineItems.ToDictionary(l => l.Id);
        foreach (var input in existingInputs)
        {
            if (!liveLines.TryGetValue(input.Id!.Value, out var line))
            {
                // Id received as existing but not matched to lines from db
                return PurchaseOrderErrors.UnknownLineItem;
            }

            if (input.Product!.Id != line.ProductId)
            {
                return PurchaseOrderErrors.LineItemProductChanged;
            }
        }

        var newLines = await productResolver.ResolveAsync(newInputs, cancellationToken);
        if (newLines.IsFailure)
        {
            return newLines.Error;
        }

        var edited = existingInputs.Select(input =>
            new PurchaseOrder.LineRevision(input.Id, null, input.Quantity!.Value, input.Price!.Value));
        var added = newLines.Value.Select(ToRevision);
        var revisions = edited.Concat(added).ToList();

        var revision = order.Revise((CurrencyId)command.CurrencyId!.Value, command.Notes, revisions);
        if (revision.IsFailure)
        {
            return revision.Error;
        }

        purchaseOrders.SaveRevision(revision.Value);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        // The change is committed: monitoring clients hear of it even if this request is cancelled now.
        await changeNotifier.NotifyAsync(new PurchaseOrderChange(order.Id, PurchaseOrderChangeKind.Edited), CancellationToken.None);

        return PurchaseOrderListItem.From(new PurchaseOrderSummary(order, order.LineItems.Count));
    }

    private static PurchaseOrder.LineRevision ToRevision(PurchaseOrder.NewLineItem line) =>
        new(null, line.Product, line.Quantity, line.Price);
}
