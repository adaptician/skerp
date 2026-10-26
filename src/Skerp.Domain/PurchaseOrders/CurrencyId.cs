namespace Skerp.Domain.PurchaseOrders;

/// <summary>The currency an order is captured in. Stored as its numeric value (entities.md).</summary>
public enum CurrencyId : short
{
    Zar = 1,
    Usd = 2,
    Euro = 3,
}
