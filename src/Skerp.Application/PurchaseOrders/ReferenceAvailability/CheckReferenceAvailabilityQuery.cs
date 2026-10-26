using MediatR;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Application.PurchaseOrders.ReferenceAvailability;

/// <summary>
/// Whether a reference is free (brief: the reference lookup on blur). The raw value is normalised by
/// the same rule as create, and the response carries the normalised value so the user sees what
/// would be stored. A value the rule rejects is a 400.
/// </summary>
public sealed record CheckReferenceAvailabilityQuery(string? Reference) : IRequest<Result<ReferenceAvailabilityResponse>>;

public sealed record ReferenceAvailabilityResponse(string Reference, bool IsAvailable);

internal sealed class CheckReferenceAvailabilityQueryHandler(IPurchaseOrderRepository purchaseOrders)
    : IRequestHandler<CheckReferenceAvailabilityQuery, Result<ReferenceAvailabilityResponse>>
{
    public async Task<Result<ReferenceAvailabilityResponse>> Handle(
        CheckReferenceAvailabilityQuery query,
        CancellationToken cancellationToken)
    {
        var reference = ReferenceNormalizer.Normalize(query.Reference);
        if (reference.IsFailure)
        {
            return reference.Error;
        }

        var exists = await purchaseOrders.ReferenceExistsAsync(reference.Value, cancellationToken);
        return new ReferenceAvailabilityResponse(reference.Value, IsAvailable: !exists);
    }
}
