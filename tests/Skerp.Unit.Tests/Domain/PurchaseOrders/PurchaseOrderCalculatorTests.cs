using FluentAssertions;
using Skerp.Domain.PurchaseOrders;

namespace Skerp.Unit.Tests.Domain.PurchaseOrders;

/// <summary>
/// The calculator's two equations (brief): line total = quantity × price, unrounded to four decimals;
/// grand total = the sum, rounded to two decimals with banker's rounding.
/// </summary>
public class PurchaseOrderCalculatorTests
{
    [Theory]
    [InlineData(5, "9.99", "49.95")]
    [InlineData(3, "12.99", "38.97")]
    [InlineData(1, "0.01", "0.01")]
    [InlineData(3, "0.3333", "0.9999")]
    [InlineData(7, "1.2345", "8.6415")]
    [InlineData(1000, "999999999.9999", "999999999999.9000")]
    public void LineTotal_IsQuantityTimesPrice_WithoutRounding(int quantity, string price, string expected)
    {
        PurchaseOrderCalculator.LineTotal(quantity, decimal.Parse(price, System.Globalization.CultureInfo.InvariantCulture))
            .Should().Be(decimal.Parse(expected, System.Globalization.CultureInfo.InvariantCulture));
    }

    [Fact]
    public void LineTotal_KeepsFourDecimals()
    {
        PurchaseOrderCalculator.LineTotal(3, 0.3333m).Should().Be(0.9999m);
    }

    [Fact]
    public void GrandTotal_SumsTheLineTotals()
    {
        PurchaseOrderCalculator.GrandTotal([49.95m, 38.97m]).Should().Be(88.92m);
    }

    [Theory]
    [InlineData("10.125", "10.12")]
    [InlineData("10.135", "10.14")]
    [InlineData("10.145", "10.14")]
    [InlineData("10.1251", "10.13")]
    [InlineData("0.005", "0.00")]
    [InlineData("0.015", "0.02")]
    public void GrandTotal_RoundsToTwoDecimalsWithBankersRounding(string sum, string expected)
    {
        PurchaseOrderCalculator.GrandTotal([decimal.Parse(sum, System.Globalization.CultureInfo.InvariantCulture)])
            .Should().Be(decimal.Parse(expected, System.Globalization.CultureInfo.InvariantCulture));
    }

    [Fact]
    public void GrandTotal_RoundsOnlyTheSum_NotEachLine()
    {
        // Rounding each line first (0.33 + 0.33 + 0.33 = 0.99) would lose a cent.
        PurchaseOrderCalculator.GrandTotal([0.3333m, 0.3333m, 0.3334m]).Should().Be(1.00m);
    }

    [Fact]
    public void GrandTotal_AvoidsBinaryFloatingPointError()
    {
        // 0.1 + 0.2 is 0.30000000000000004 in binary floating point; decimals keep it exact.
        PurchaseOrderCalculator.GrandTotal([0.1m, 0.2m]).Should().Be(0.30m);
        PurchaseOrderCalculator.GrandTotal(Enumerable.Repeat(0.01m, 100)).Should().Be(1.00m);
    }

    [Fact]
    public void Calculate_ReturnsEachLineByIdAndTheGrandTotal()
    {
        var totals = PurchaseOrderCalculator.Calculate(
        [
            new PurchaseOrderCalculator.LineInput("temp-1", 5, 9.99m),
            new PurchaseOrderCalculator.LineInput("temp-2", 3, 12.99m),
        ]);

        totals.LineItems.Should().Equal(
            new PurchaseOrderCalculator.LineTotalResult("temp-1", 49.95m),
            new PurchaseOrderCalculator.LineTotalResult("temp-2", 38.97m));
        totals.Total.Should().Be(88.92m);
    }
}
