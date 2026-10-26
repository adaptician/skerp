using FluentAssertions;
using Skerp.Domain.Customers;
using Skerp.Domain.Products;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Unit.Tests.Domain.Shared.Normalization;

/// <summary>Normalisation rule 2 for names (api.md): trim, collapse whitespace, keep casing.</summary>
public class NameNormalizerTests
{
    [Theory]
    [InlineData("Alpha Studios", "Alpha Studios")]
    [InlineData("  Alpha   Studios  ", "Alpha Studios")]
    [InlineData("Alpha\t\nStudios", "Alpha Studios")]
    [InlineData("aLPHA studios", "aLPHA studios")]
    [InlineData(null, "")]
    [InlineData("   ", "")]
    public void Normalize_TrimsCollapsesAndKeepsCasing(string? raw, string expected)
    {
        NameNormalizer.Normalize(raw).Should().Be(expected);
    }

    [Theory]
    [InlineData(null, "Customer.NameRequired")]
    [InlineData("  ", "Customer.NameRequired")]
    [InlineData("Al", "Customer.NameInvalidLength")]
    [InlineData("  Al  ", "Customer.NameInvalidLength")]
    public void CustomerCreate_InvalidName_Fails(string? name, string expectedCode)
    {
        Customer.Create(name, "orders@alpha.co.za").Error.Code.Should().Be(expectedCode);
    }

    [Fact]
    public void CustomerCreate_NameLengthIsCheckedAfterNormalising()
    {
        Customer.Create("  " + new string('a', 128) + "  ", "orders@alpha.co.za").IsSuccess.Should().BeTrue();
        Customer.Create(new string('a', 129), "orders@alpha.co.za").Error.Code
            .Should().Be("Customer.NameInvalidLength");
    }

    [Fact]
    public void CustomerCreate_StoresTheNormalisedNameWithItsCasing()
    {
        Customer.Create("  alpha   STUDIOS ", "orders@alpha.co.za").Value.Name.Should().Be("alpha STUDIOS");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("orders")]
    [InlineData("orders@alpha")]
    [InlineData("orders@@alpha.co.za")]
    [InlineData("or ders@alpha.co.za")]
    [InlineData("Alpha <orders@alpha.co.za>")]
    [InlineData("a@b.")]
    public void CustomerCreate_InvalidEmail_Fails(string? email)
    {
        Customer.Create("Alpha Studios", email).Error.Code.Should().Be("Customer.InvalidEmail");
    }

    [Fact]
    public void ProductCreate_NormalisesSkuAndName()
    {
        var product = Product.Create(" sda001 ", "  Delicious   Soda ").Value;

        product.Sku.Should().Be("SDA001");
        product.Name.Should().Be("Delicious Soda");
    }

    [Theory]
    [InlineData(null, "Delicious Soda", "Product.SkuRequired")]
    [InlineData("SDA001", null, "Product.NameRequired")]
    [InlineData("SDA001", "So", "Product.NameInvalidLength")]
    public void ProductCreate_InvalidValues_Fail(string? sku, string? name, string expectedCode)
    {
        Product.Create(sku, name).Error.Code.Should().Be(expectedCode);
    }
}
