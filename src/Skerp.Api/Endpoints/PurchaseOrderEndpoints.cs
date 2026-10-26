using MediatR;
using Skerp.Api.Features;
using Skerp.Api.Results;
using Skerp.Application.PurchaseOrders.Calculate;
using Skerp.Application.PurchaseOrders.Create;
using Skerp.Application.PurchaseOrders.Delete;
using Skerp.Application.PurchaseOrders.Edit;
using Skerp.Application.PurchaseOrders.Get;
using Skerp.Application.PurchaseOrders.List;
using Skerp.Application.PurchaseOrders.ReferenceAvailability;
using Skerp.Application.PurchaseOrders.UpdateStatus;

namespace Skerp.Api.Endpoints;

/// <summary>
/// <c>/api/v1/purchase-orders</c> (api.md), behind the <c>Feature_PurchaseOrders</c> release toggle.
/// Endpoints only send a command or query and translate its result.
/// </summary>
internal static class PurchaseOrderEndpoints
{
    public static RouteGroupBuilder MapPurchaseOrderEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("/purchase-orders")
            .WithTags("Purchase orders")
            .RequireFeature(FeatureFlags.PurchaseOrders);

        group.MapPost("/", async (CreatePurchaseOrderCommand command, ISender sender, CancellationToken cancellationToken) =>
                (await sender.Send(command, cancellationToken)).ToHttpResult(StatusCodes.Status201Created))
            .WithName("CreatePurchaseOrder");

        // POST, not the GET api.md lists: the request has a body, which GET does not carry reliably.
        group.MapPost("/calculate", async (CalculatePurchaseOrderTotalsQuery query, ISender sender, CancellationToken cancellationToken) =>
                (await sender.Send(query, cancellationToken)).ToHttpResult())
            .WithName("CalculatePurchaseOrderTotals");

        group.MapGet("/reference-availability", async (string? reference, ISender sender, CancellationToken cancellationToken) =>
                (await sender.Send(new CheckReferenceAvailabilityQuery(reference), cancellationToken)).ToHttpResult())
            .WithName("CheckReferenceAvailability");

        group.MapPost("/list", async (ListPurchaseOrdersQuery query, ISender sender, CancellationToken cancellationToken) =>
                (await sender.Send(query, cancellationToken)).ToHttpResult())
            .WithName("ListPurchaseOrders");

        // The id is bound as text so a malformed GUID is a descriptive 400 (GetPurchaseOrderQuery).
        group.MapGet("/{id}", async (string id, int? skipCount, int? maxResultCount, ISender sender, CancellationToken cancellationToken) =>
                (await sender.Send(new GetPurchaseOrderQuery(id, skipCount, maxResultCount), cancellationToken)).ToHttpResult())
            .WithName("GetPurchaseOrder");

        group.MapPut("/{id}", async (string id, EditPurchaseOrderRequest request, ISender sender, CancellationToken cancellationToken) =>
                (await sender.Send(request.ToCommand(id), cancellationToken)).ToHttpResult())
            .WithName("EditPurchaseOrder");

        // 204 carries no body, so a success has no Result envelope.
        group.MapDelete("/{id}", async (string id, ISender sender, CancellationToken cancellationToken) =>
            {
                var result = await sender.Send(new DeletePurchaseOrderCommand(id), cancellationToken);
                return result.IsSuccess ? TypedResults.NoContent() : result.Error.ToHttpResult();
            })
            .WithName("DeletePurchaseOrder");

        group.MapPut("/{id}/status", async (string id, UpdatePurchaseOrderStatusRequest request, ISender sender, CancellationToken cancellationToken) =>
                (await sender.Send(new UpdatePurchaseOrderStatusCommand(id, request.StatusId), cancellationToken)).ToHttpResult())
            .WithName("UpdatePurchaseOrderStatus");

        return api;
    }
}
