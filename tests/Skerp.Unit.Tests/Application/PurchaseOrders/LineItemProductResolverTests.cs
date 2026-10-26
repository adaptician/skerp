using FluentAssertions;
using NSubstitute;
using Skerp.Application.PurchaseOrders.LineItems;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;

namespace Skerp.Unit.Tests.Application.PurchaseOrders;

/// <summary>Turns line inputs into Domain lines: each line keeps its own product, quantity and price.</summary>
public class LineItemProductResolverTests
{
    private readonly IProductRepository _products = Substitute.For<IProductRepository>();

    public LineItemProductResolverTests()
    {
        _products.FindExistingSkusAsync(Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>()).Returns([]);
    }

    [Fact]
    public async Task MixedExistingAndNewProducts_PairEachLineWithItsOwnProductQuantityAndPrice()
    {
        var stored = Product.Create("STORED-1", "Stored product").Value;
        _products.FindByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns([stored]);
        LineItemInput[] inputs =
        [
            Line(new ProductInput(null, "NEW-1", "First new"), quantity: 3, price: 1.25m),
            Line(new ProductInput(stored.Id, null, null), quantity: 2, price: 5.00m),
            Line(new ProductInput(null, "NEW-2", "Second new"), quantity: 4, price: 2.50m),
        ];

        var result = await new LineItemProductResolver(_products).ResolveAsync(inputs, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Select(l => (l.Product.Sku, l.Quantity, l.Price)).Should().BeEquivalentTo(
        [
            ("STORED-1", 2, 5.00m),
            ("NEW-1", 3, 1.25m),
            ("NEW-2", 4, 2.50m),
        ]);
        result.Value.Single(l => l.Product.Id == stored.Id).Product.Should().BeSameAs(stored);
        _products.Received(1).Add(Arg.Is<Product>(p => p.Sku == "NEW-1"));
        _products.Received(1).Add(Arg.Is<Product>(p => p.Sku == "NEW-2"));
        _products.DidNotReceive().Add(stored);
    }

    [Fact]
    public async Task UnknownExistingProduct_FailsAsNotFoundAndCreatesNothing()
    {
        _products.FindByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns([]);
        LineItemInput[] inputs =
        [
            Line(new ProductInput(null, "NEW-1", "First new"), quantity: 1, price: 1m),
            Line(new ProductInput(Guid.NewGuid(), null, null), quantity: 1, price: 1m),
        ];

        var result = await new LineItemProductResolver(_products).ResolveAsync(inputs, CancellationToken.None);

        result.Error.Should().Be(ProductErrors.NotFound);
        _products.DidNotReceive().Add(Arg.Any<Product>());
    }

    private static LineItemInput Line(ProductInput product, int quantity, decimal price) =>
        new(null, product, quantity, price);
}
