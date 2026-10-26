using FluentAssertions;
using Skerp.Domain.Customers;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;

namespace Skerp.Unit.Tests.Domain.PurchaseOrders;

/// <summary>Editing an order (brief → Purchase Order Edit, minimum unit tests and refusals).</summary>
public class PurchaseOrderReviseTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 23, 9, 0, 0, TimeSpan.Zero);
    private static readonly Customer Alpha = Customer.Create("Alpha Studios", "orders@alpha.co.za").Value;
    private static readonly Product Soda = Product.Create("SDA001", "Delicious Soda").Value;
    private static readonly Product Candy = Product.Create("CAN001", "Delicious Candy").Value;
    private static readonly Product Water = Product.Create("WTR003", "Still Spring Water").Value;

    [Fact]
    public void UnchangedLines_ChangeNothing()
    {
        var order = NewOrder();
        var lines = order.LineItems.ToList();
        var snapshot = lines.Select(l => (l.Quantity, l.Price, l.Total)).ToList();

        var revision = order.Revise(order.CurrencyId, order.Notes, Keep(order)).Value;

        revision.Added.Should().BeEmpty();
        revision.Removed.Should().BeEmpty();
        order.LineItems.Should().Equal(lines);
        order.LineItems.Select(l => (l.Quantity, l.Price, l.Total)).Should().Equal(snapshot);
        order.Total.Should().Be(88.92m);
    }

    [Fact]
    public void NewLines_AreAssociatedWithTheOrder()
    {
        var order = NewOrder();

        var revision = order.Revise(order.CurrencyId, null, [.. Keep(order), new(null, Water, 40, 9.9m)]).Value;

        revision.Added.Should().ContainSingle().Which.Should().BeSameAs(order.LineItems[^1]);
        order.LineItems.Should().HaveCount(3);
        order.LineItems[^1].Should().Match<PurchaseOrderLineItem>(l =>
            l.PurchaseOrderId == order.Id && l.ProductId == Water.Id && l.Total == 396m);
        order.Total.Should().Be(484.92m);
    }

    [Fact]
    public void RemovedLines_AreReturnedForSoftDeleteOnly()
    {
        var order = NewOrder();
        var candyLine = order.LineItems[1];

        var revision = order.Revise(order.CurrencyId, null, [Keep(order)[0]]).Value;

        revision.Removed.Should().ContainSingle().Which.Should().BeSameAs(candyLine);
        order.LineItems.Should().ContainSingle().Which.ProductId.Should().Be(Soda.Id);
        order.Total.Should().Be(49.95m);
        candyLine.Quantity.Should().Be(3, "the removed line itself is not changed; persistence soft-deletes it");
    }

    [Fact]
    public void PendingOrder_PermitsEdit()
    {
        var order = NewOrder();
        var soda = order.LineItems[0];

        var result = order.Revise(CurrencyId.Usd, " Side entrance ", [new(soda.Id, null, 2, 24.5m)]);

        result.IsSuccess.Should().BeTrue();
        order.CurrencyId.Should().Be(CurrencyId.Usd);
        order.Notes.Should().Be("Side entrance");
        soda.Quantity.Should().Be(2);
        soda.Total.Should().Be(49m);
        order.Total.Should().Be(49m);
    }

    [Theory]
    [InlineData(StatusId.Confirmed)]
    [InlineData(StatusId.Fulfilled)]
    [InlineData(StatusId.Cancelled)]
    public void NonPendingOrder_BlocksEditCompletely(StatusId status)
    {
        var order = NewOrder();
        var context = PurchaseOrderStatusContext.For(order);
        if (status != StatusId.Cancelled)
        {
            context.ChangeTo(StatusId.Confirmed, Now).IsSuccess.Should().BeTrue();
        }

        if (status != StatusId.Confirmed)
        {
            context.ChangeTo(status, Now).IsSuccess.Should().BeTrue();
        }

        var lines = order.LineItems.ToList();

        var result = order.Revise(CurrencyId.Usd, "Changed", [new(null, Water, 1, 1m)]);

        result.Error.Code.Should().Be("PurchaseOrder.NotEditable");
        order.CurrencyId.Should().Be(CurrencyId.Zar);
        order.Notes.Should().BeNull();
        order.LineItems.Should().Equal(lines);
        order.Total.Should().Be(88.92m);
    }

    [Fact]
    public void UnknownLineId_IsRefusedAndNothingChanges()
    {
        var order = NewOrder();

        order.Revise(order.CurrencyId, null, [new(Guid.NewGuid(), null, 1, 1m)]).Error.Code
            .Should().Be("PurchaseOrder.UnknownLineItem");
        order.LineItems.Should().HaveCount(2);
    }

    [Fact]
    public void DuplicateLineId_IsRefused()
    {
        var order = NewOrder();
        var id = order.LineItems[0].Id;

        order.Revise(order.CurrencyId, null, [new(id, null, 1, 1m), new(id, null, 2, 1m)]).Error.Code
            .Should().Be("PurchaseOrder.DuplicateLineItem");
    }

    [Fact]
    public void InvalidAmountOnAnyLine_IsRefusedBeforeAnyLineChanges()
    {
        var order = NewOrder();
        var soda = order.LineItems[0];
        var candy = order.LineItems[1];

        var result = order.Revise(order.CurrencyId, null, [new(soda.Id, null, 7, 1m), new(candy.Id, null, 0, 1m)]);

        result.Error.Code.Should().Be("PurchaseOrder.InvalidQuantity");
        soda.Quantity.Should().Be(5);
        order.Total.Should().Be(88.92m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public void LineCountOutsideOneToOneHundred_IsRefused(int count)
    {
        var order = NewOrder();
        var lines = Enumerable.Range(0, count).Select(_ => new PurchaseOrder.LineRevision(null, Water, 1, 1m)).ToList();

        order.Revise(order.CurrencyId, null, lines).Error.Code.Should().Be("PurchaseOrder.InvalidLineItemCount");
    }

    private static PurchaseOrder NewOrder() =>
        PurchaseOrder.Create("PO-2026-100", Alpha, CurrencyId.Zar, null, [new(Soda, 5, 9.99m), new(Candy, 3, 12.99m)], Now).Value;

    private static List<PurchaseOrder.LineRevision> Keep(PurchaseOrder order) =>
        order.LineItems.Select(l => new PurchaseOrder.LineRevision(l.Id, null, l.Quantity, l.Price)).ToList();
}
