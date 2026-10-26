using Skerp.Api.Features;

namespace Skerp.Api.Hubs;

internal static class PurchaseOrderMonitorHubEndpoints
{
    /// <summary>
    /// The Monitor Mode hub's path. It sits under <c>/api/v1</c> beside the versioned group rather than
    /// in it, because a hub is not a versioned REST resource; the client reaches it through the same
    /// <c>/api</c> proxy.
    /// </summary>
    public const string Path = "/api/v1/hubs/purchase-orders";

    /// <summary>Maps the hub behind <c>Feature_PurchaseOrders</c>, like every purchase-order endpoint.</summary>
    public static IEndpointRouteBuilder MapPurchaseOrderMonitorHub(this IEndpointRouteBuilder app)
    {
        app.MapHub<PurchaseOrderMonitorHub>(Path)
            .RequireFeature(FeatureFlags.PurchaseOrders);

        return app;
    }
}
