using MediatR;
using Skerp.Application.PurchaseOrders.LineItems;
using Skerp.Domain.Shared;

namespace Skerp.Application.PurchaseOrders.Create;

/// <summary>
/// Creates a purchase order (api.md → Create endpoint). Every property is nullable so a missing value
/// is reported as missing, not silently defaulted. Totals are never accepted; they are calculated.
/// </summary>
public sealed record CreatePurchaseOrderCommand(
    string? Reference,
    CustomerInput? Customer,
    short? CurrencyId,
    short? StatusId,
    IReadOnlyList<LineItemInput>? LineItems,
    string? Notes) : IRequest<Result<PurchaseOrderResponse>>;

/// <summary>An existing customer by <see cref="Id"/>, or a new one by <see cref="Name"/> and <see cref="Email"/>.</summary>
public sealed record CustomerInput(Guid? Id, string? Name, string? Email);
