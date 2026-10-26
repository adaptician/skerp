using Microsoft.AspNetCore.Hosting;

namespace Skerp.Integration.Tests.Api;

/// <summary>
/// The API with the <c>Feature_PurchaseOrders</c> release toggle on, over its own seeded SQLite file.
/// Tests create their own uniquely named data rather than relying on the demo seed's exact contents.
/// </summary>
public sealed class PurchaseOrdersApiFactory : SkerpApiFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("FeatureManagement:Feature_PurchaseOrders", "true");
    }
}
