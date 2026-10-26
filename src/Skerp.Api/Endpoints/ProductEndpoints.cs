using MediatR;
using Skerp.Api.Features;
using Skerp.Api.Results;
using Skerp.Application.Products.Lookup;

namespace Skerp.Api.Endpoints;

/// <summary><c>/api/v1/products</c>: the product lookup the line items use.</summary>
internal static class ProductEndpoints
{
    public static RouteGroupBuilder MapProductEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("/products")
            .WithTags("Products")
            .RequireFeature(FeatureFlags.PurchaseOrders);

        group.MapGet("/lookup", async (string? sku, ISender sender, CancellationToken cancellationToken) =>
                (await sender.Send(new LookupProductsQuery(sku), cancellationToken)).ToHttpResult())
            .WithName("LookupProducts");

        return api;
    }
}
