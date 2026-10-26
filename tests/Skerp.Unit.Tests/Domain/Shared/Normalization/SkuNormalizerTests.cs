using FluentAssertions;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Unit.Tests.Domain.Shared.Normalization;

/// <summary>Normalisation rule 1 for SKUs (api.md): trim, upper-case, then validate 3–64 characters.</summary>
public class SkuNormalizerTests
{
    [Theory]
    [InlineData("sda001", "SDA001")]
    [InlineData(" can-001 ", "CAN-001")]
    [InlineData("a/b", "A/B")]
    public void Normalize_ValidValue_TrimsAndUpperCases(string raw, string expected)
    {
        SkuNormalizer.Normalize(raw).Value.Should().Be(expected);
    }

    [Fact]
    public void Normalize_IsCaseInsensitive()
    {
        SkuNormalizer.Normalize("Sda001").Value.Should().Be(SkuNormalizer.Normalize("SDA001").Value);
    }

    [Theory]
    [InlineData(null, "Product.SkuRequired")]
    [InlineData(" ", "Product.SkuRequired")]
    [InlineData("SDA 001", "Product.SkuInvalidCharacters")]
    [InlineData("SDA*001", "Product.SkuInvalidCharacters")]
    [InlineData("AB", "Product.SkuInvalidLength")]
    public void Normalize_InvalidValue_Fails(string? raw, string expectedCode)
    {
        SkuNormalizer.Normalize(raw).Error.Code.Should().Be(expectedCode);
    }

    [Fact]
    public void Normalize_LengthBoundaries_AreInclusive()
    {
        SkuNormalizer.Normalize("ABC").IsSuccess.Should().BeTrue();
        SkuNormalizer.Normalize(new string('A', 64)).IsSuccess.Should().BeTrue();
        SkuNormalizer.Normalize(new string('A', 65)).Error.Code.Should().Be("Product.SkuInvalidLength");
    }
}
