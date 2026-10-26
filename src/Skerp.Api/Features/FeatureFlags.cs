namespace Skerp.Api.Features;

/// <summary>
/// Release toggles (api.md → Feature Toggle Taxonomy), read from the <c>FeatureManagement</c>
/// configuration section. Each is off in <c>appsettings.json</c> until its feature ships.
/// </summary>
internal static class FeatureFlags
{
    /// <summary>Purchase Order Management (Epic AB#1429): the purchase-order, customer and product endpoints.</summary>
    public const string PurchaseOrders = "Feature_PurchaseOrders";

    /// <summary>Every release toggle the client may ask about.</summary>
    public static readonly IReadOnlyList<string> All = [PurchaseOrders];
}
