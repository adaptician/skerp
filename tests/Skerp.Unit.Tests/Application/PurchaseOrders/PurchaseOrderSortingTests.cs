using FluentAssertions;
using Skerp.Application.PurchaseOrders.List;
using Skerp.Domain.PurchaseOrders;

namespace Skerp.Unit.Tests.Application.PurchaseOrders;

public class PurchaseOrderSortingTests
{
    [Theory]
    [InlineData(null, PurchaseOrderSortField.CreatedAt, true)]
    [InlineData("", PurchaseOrderSortField.CreatedAt, true)]
    [InlineData("createdAt desc", PurchaseOrderSortField.CreatedAt, true)]
    [InlineData("CREATEDAT ASC", PurchaseOrderSortField.CreatedAt, false)]
    [InlineData("reference", PurchaseOrderSortField.Reference, false)]
    [InlineData("customer desc", PurchaseOrderSortField.Customer, true)]
    [InlineData("  total   asc ", PurchaseOrderSortField.Total, false)]
    [InlineData("status desc", PurchaseOrderSortField.Status, true)]
    public void TryParse_KnownFieldAndDirection_Succeeds(string? sorting, PurchaseOrderSortField field, bool descending)
    {
        PurchaseOrderSorting.TryParse(sorting, out var parsedField, out var parsedDescending).Should().BeTrue();
        parsedField.Should().Be(field);
        parsedDescending.Should().Be(descending);
    }

    [Theory]
    [InlineData("price asc")]
    [InlineData("total up")]
    [InlineData("total asc extra")]
    [InlineData("createdAt; drop table")]
    public void TryParse_UnknownFieldOrDirection_Fails(string sorting)
    {
        PurchaseOrderSorting.TryParse(sorting, out _, out _).Should().BeFalse();
    }
}
