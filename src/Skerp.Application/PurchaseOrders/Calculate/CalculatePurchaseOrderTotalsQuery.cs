using FluentValidation;
using MediatR;
using Skerp.Application.Validation;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;

namespace Skerp.Application.PurchaseOrders.Calculate;

/// <summary>
/// Totals for the lines a form holds so far (api.md → Calculate endpoint). Each line carries the
/// caller's own id (a temporary id for a new line) so the result maps back to the form.
/// </summary>
public sealed record CalculatePurchaseOrderTotalsQuery(IReadOnlyList<CalculateLineInput>? LineItems)
    : IRequest<Result<PurchaseOrderCalculator.PurchaseOrderTotals>>;

public sealed record CalculateLineInput(string? Id, int? Quantity, decimal? Price);

internal sealed class CalculatePurchaseOrderTotalsQueryValidator : AbstractValidator<CalculatePurchaseOrderTotalsQuery>
{
    private const int IdMaxLength = 64;

    private static readonly Error LineIdRequired = Error.Validation(
        "PurchaseOrder.LineIdRequired",
        $"Each line needs an id of at most {IdMaxLength} characters to map its total back.");

    public CalculatePurchaseOrderTotalsQueryValidator()
    {
        RuleFor(q => q.LineItems)
            .Must(lines => lines is { Count: >= PurchaseOrder.MinLineItems and <= PurchaseOrder.MaxLineItems })
            .WithError(PurchaseOrderErrors.InvalidLineItemCount);

        RuleForEach(q => q.LineItems).ChildRules(line =>
        {
            line.RuleFor(l => l.Id)
                .Must(id => !string.IsNullOrWhiteSpace(id) && id.Length <= IdMaxLength)
                .WithError(LineIdRequired);
            line.RuleFor(l => l.Quantity)
                .Must(q => q.HasValue && PurchaseOrderLineItem.IsValidQuantity(q.Value))
                .WithError(PurchaseOrderErrors.InvalidQuantity);
            line.RuleFor(l => l.Price)
                .Must(p => p.HasValue && PurchaseOrderLineItem.IsValidPrice(p.Value))
                .WithError(PurchaseOrderErrors.InvalidPrice);
        });
    }
}

internal sealed class CalculatePurchaseOrderTotalsQueryHandler
    : IRequestHandler<CalculatePurchaseOrderTotalsQuery, Result<PurchaseOrderCalculator.PurchaseOrderTotals>>
{
    public Task<Result<PurchaseOrderCalculator.PurchaseOrderTotals>> Handle(
        CalculatePurchaseOrderTotalsQuery query,
        CancellationToken cancellationToken)
    {
        var totals = PurchaseOrderCalculator.Calculate(query.LineItems!
            .Select(l => new PurchaseOrderCalculator.LineInput(l.Id!, l.Quantity!.Value, l.Price!.Value)));

        return Task.FromResult(Result.Success(totals));
    }
}
