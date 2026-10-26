using Skerp.Domain.PurchaseOrders;

namespace Skerp.Application.PurchaseOrders;

/// <summary>Display names for the currency and status enums, as responses carry them.</summary>
public static class PurchaseOrderNames
{
    public static NamedValue Currency(CurrencyId currencyId) => new((short)currencyId, currencyId switch
    {
        CurrencyId.Zar => "ZAR",
        CurrencyId.Usd => "USD",
        CurrencyId.Euro => "EUR",
        _ => currencyId.ToString(),
    });

    public static NamedValue Status(StatusId statusId) => new((short)statusId, statusId.ToString());

    /// <summary>The statuses the order may move to now, from <see cref="PurchaseOrderStatusContext"/>.</summary>
    public static IReadOnlyList<short> AllowedStatusIds(PurchaseOrder order) =>
        PurchaseOrderStatusContext.For(order).AllowedTransitions.Select(s => (short)s).ToList();

    /// <summary>True while the order may be edited, from <see cref="PurchaseOrderStatusContext"/>.</summary>
    public static bool IsEditable(PurchaseOrder order) =>
        PurchaseOrderStatusContext.For(order).EnsureEditable().IsSuccess;

    /// <summary>True while the order may be deleted, from <see cref="PurchaseOrderStatusContext"/>.</summary>
    public static bool IsDeletable(PurchaseOrder order) =>
        PurchaseOrderStatusContext.For(order).EnsureDeletable().IsSuccess;
}
