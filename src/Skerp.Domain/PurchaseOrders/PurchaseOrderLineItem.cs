using Skerp.Domain.Products;
using Skerp.Domain.Shared;

namespace Skerp.Domain.PurchaseOrders;

/// <summary>One product on a purchase order: quantity, unit price and the calculated line total.</summary>
public sealed class PurchaseOrderLineItem : MinimumAudit<Guid>
{
    public const int MinQuantity = 1;
    public const int MaxQuantity = 1000;
    public const int PriceDecimals = 4;

    /// <summary>The smallest unit price: one cent.</summary>
    public const decimal MinPrice = 0.01m;

    /// <summary>
    /// The largest unit price. 100 lines of 1 000 units at this price still fit the 18,4 precision
    /// every amount is stored with.
    /// </summary>
    public const decimal MaxPrice = 999_999_999.9999m;

    private PurchaseOrderLineItem()
    {
    }

    public required Guid PurchaseOrderId { get; init; }

    public required Guid ProductId { get; init; }

    public Product? Product { get; private set; }

    public int Quantity { get; private set; }

    public decimal Price { get; private set; }

    public decimal Total { get; private set; }

    /// <summary>True when <paramref name="price"/> is within range and has at most four decimals.</summary>
    public static bool IsValidPrice(decimal price) =>
        price is >= MinPrice and <= MaxPrice && decimal.Round(price, PriceDecimals) == price;

    public static bool IsValidQuantity(int quantity) => quantity is >= MinQuantity and <= MaxQuantity;

    /// <summary>
    /// Changes the quantity and price; true when either changed. Equal values are not reassigned, so
    /// an unchanged line is not written.
    /// </summary>
    internal Result<bool> Revise(int quantity, decimal price)
    {
        if (!IsValidQuantity(quantity))
        {
            return PurchaseOrderErrors.InvalidQuantity;
        }

        if (!IsValidPrice(price))
        {
            return PurchaseOrderErrors.InvalidPrice;
        }

        if (Quantity == quantity && Price == price)
        {
            return false;
        }

        Quantity = quantity;
        Price = price;
        Total = PurchaseOrderCalculator.LineTotal(quantity, price);
        return true;
    }

    internal static Result<PurchaseOrderLineItem> Create(Guid purchaseOrderId, Product product, int quantity, decimal price)
    {
        if (!IsValidQuantity(quantity))
        {
            return PurchaseOrderErrors.InvalidQuantity;
        }

        if (!IsValidPrice(price))
        {
            return PurchaseOrderErrors.InvalidPrice;
        }

        return new PurchaseOrderLineItem
        {
            Id = Guid.NewGuid(),
            PurchaseOrderId = purchaseOrderId,
            ProductId = product.Id,
            Product = product,
            Quantity = quantity,
            Price = price,
            Total = PurchaseOrderCalculator.LineTotal(quantity, price),
        };
    }
}
