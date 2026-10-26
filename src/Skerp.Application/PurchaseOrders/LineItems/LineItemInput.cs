namespace Skerp.Application.PurchaseOrders.LineItems;

/// <summary>A line on a create or edit request. <see cref="Id"/> names an existing line on edit only.</summary>
public sealed record LineItemInput(Guid? Id, ProductInput? Product, int? Quantity, decimal? Price);

/// <summary>An existing product by <see cref="Id"/>, or a new one by <see cref="Sku"/> and <see cref="Name"/>.</summary>
public sealed record ProductInput(Guid? Id, string? Sku, string? Name);
