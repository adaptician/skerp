using FluentAssertions;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Unit.Tests.Domain.Shared.Normalization;

/// <summary>Normalisation rule 1 for references (api.md): trim, upper-case, then validate.</summary>
public class ReferenceNormalizerTests
{
    [Theory]
    [InlineData("ABC123", "ABC123")]
    [InlineData("PO-2026-001", "PO-2026-001")]
    [InlineData("  po-2026-001  ", "PO-2026-001")]
    [InlineData("po_2026.001/a", "PO_2026.001/A")]
    public void Normalize_ValidValue_TrimsAndUpperCases(string raw, string expected)
    {
        var result = ReferenceNormalizer.Normalize(raw);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(expected);
    }

    [Fact]
    public void Normalize_DifferentCasing_ProducesTheSameCanonicalValue()
    {
        ReferenceNormalizer.Normalize("po-2026-001").Value
            .Should().Be(ReferenceNormalizer.Normalize("PO-2026-001").Value);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Normalize_Missing_FailsAsRequired(string? raw)
    {
        ReferenceNormalizer.Normalize(raw).Error.Code.Should().Be("PurchaseOrder.ReferenceRequired");
    }

    [Theory]
    [InlineData("PO 2026 001")]
    [InlineData("PO\t2026")]
    [InlineData("PO#2026-001")]
    [InlineData("PO-2026-ÄÖ1")]
    [InlineData("PO,2026,001")]
    public void Normalize_DisallowedCharacters_FailsWithoutStripping(string raw)
    {
        ReferenceNormalizer.Normalize(raw).Error.Code.Should().Be("PurchaseOrder.ReferenceInvalidCharacters");
    }

    [Theory]
    [InlineData("ABCD")]
    [InlineData("  ABCD  ")]
    public void Normalize_ShorterThanFiveAfterTrimming_FailsLength(string raw)
    {
        ReferenceNormalizer.Normalize(raw).Error.Code.Should().Be("PurchaseOrder.ReferenceInvalidLength");
    }

    [Fact]
    public void Normalize_LengthBoundaries_AreInclusive()
    {
        ReferenceNormalizer.Normalize("ABCDE").IsSuccess.Should().BeTrue();
        ReferenceNormalizer.Normalize(new string('A', 128)).IsSuccess.Should().BeTrue();
        ReferenceNormalizer.Normalize(new string('A', 129)).Error.Code
            .Should().Be("PurchaseOrder.ReferenceInvalidLength");
    }

    [Fact]
    public void Normalize_PaddingAroundAValidValue_DoesNotCountTowardsTheLength()
    {
        ReferenceNormalizer.Normalize("  " + new string('a', 128) + "  ").IsSuccess.Should().BeTrue();
    }
}
