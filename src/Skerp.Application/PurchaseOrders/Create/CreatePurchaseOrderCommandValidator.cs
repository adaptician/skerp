using FluentValidation;
using Skerp.Application.PurchaseOrders.LineItems;
using Skerp.Application.Validation;
using Skerp.Domain.Customers;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Application.PurchaseOrders.Create;

/// <summary>
/// Request validation for a new order (brief: server-side rules). Every rule here is enforced again
/// by the Domain; this layer only rejects a malformed request early with a descriptive message.
/// </summary>
internal sealed class CreatePurchaseOrderCommandValidator : AbstractValidator<CreatePurchaseOrderCommand>
{
    public static readonly Error CustomerRequired = Error.Validation(
        "Customer.Required",
        "A customer is required: select an existing one, or enter a new name and email.");

    public static readonly Error AmbiguousCustomer = Error.Validation(
        "Customer.Ambiguous",
        "Send either an existing customer's id, or a new customer's name and email, not all three.");

    public static readonly Error CurrencyRequired = Error.Validation(
        "PurchaseOrder.CurrencyRequired",
        "A currency is required.");

    public CreatePurchaseOrderCommandValidator()
    {
        RuleFor(c => c.Reference).SatisfiesDomainRule(ReferenceNormalizer.Normalize);

        RuleFor(c => c.Customer).NotNull().WithError(CustomerRequired);
        When(c => c.Customer is not null, () =>
        {
            RuleFor(c => c.Customer!)
                .Must(c => !(c.Id.HasValue && c.Name is not null && c.Email is not null))
                .WithError(AmbiguousCustomer);

            When(c => c.Customer!.Id is null, () =>
            {
                RuleFor(c => c.Customer!.Name).SatisfiesDomainRule(Customer.NormalizeName);
                RuleFor(c => c.Customer!.Email)
                    .Must(email => Customer.IsValidEmail(email?.Trim() ?? string.Empty))
                    .WithError(CustomerErrors.InvalidEmail);
            });
        });

        RuleFor(c => c.CurrencyId).NotNull().WithError(CurrencyRequired);
        RuleFor(c => c.CurrencyId)
            .Must(id => Enum.IsDefined((CurrencyId)id!.Value))
            .When(c => c.CurrencyId.HasValue)
            .WithError(PurchaseOrderErrors.InvalidCurrency);

        // A new order always starts Pending (asmp-1453): any other status is an invalid request.
        RuleFor(c => c.StatusId)
            .Must(id => id == (short)PurchaseOrderStatusContext.InitialStatus)
            .WithError(PurchaseOrderErrors.InitialStatusMustBePending);

        RuleFor(c => c.LineItems)
            .Must(lines => lines is { Count: >= PurchaseOrder.MinLineItems and <= PurchaseOrder.MaxLineItems })
            .WithError(PurchaseOrderErrors.InvalidLineItemCount);
        RuleForEach(c => c.LineItems).SetValidator(new LineItemInputValidator());

        // A new order has no existing lines to name.
        RuleFor(c => c.LineItems)
            .Must(lines => lines!.All(l => l.Id is null))
            .When(c => c.LineItems is not null)
            .WithError(PurchaseOrderErrors.UnknownLineItem);

        RuleFor(c => c.Notes)
            .MaximumLength(PurchaseOrder.NotesMaxLength)
            .WithError(PurchaseOrderErrors.NotesTooLong);
    }
}
