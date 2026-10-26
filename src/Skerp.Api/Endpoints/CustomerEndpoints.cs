using MediatR;
using Skerp.Api.Features;
using Skerp.Api.Results;
using Skerp.Application.Customers.Lookup;

namespace Skerp.Api.Endpoints;

/// <summary><c>/api/v1/customers</c>: the customer lookup the purchase-order form uses.</summary>
internal static class CustomerEndpoints
{
    public static RouteGroupBuilder MapCustomerEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("/customers")
            .WithTags("Customers")
            .RequireFeature(FeatureFlags.PurchaseOrders);

        group.MapGet("/lookup", async (string? name, ISender sender, CancellationToken cancellationToken) =>
                (await sender.Send(new LookupCustomersQuery(name), cancellationToken)).ToHttpResult())
            .WithName("LookupCustomers");

        return api;
    }
}
