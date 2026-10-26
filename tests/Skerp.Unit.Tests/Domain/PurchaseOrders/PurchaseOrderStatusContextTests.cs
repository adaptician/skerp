using FluentAssertions;
using Skerp.Domain.Customers;
using Skerp.Domain.Products;
using Skerp.Domain.PurchaseOrders;

namespace Skerp.Unit.Tests.Domain.PurchaseOrders;

/// <summary>
/// Every (from, to) pair of the four statuses (brief: Rules for Status Changes): exactly four succeed,
/// the other twelve are refused and leave the status unchanged.
/// </summary>
public class PurchaseOrderStatusContextTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 23, 9, 0, 0, TimeSpan.Zero);

    public static TheoryData<StatusId, StatusId, bool> AllPairs()
    {
        var allowed = new HashSet<(StatusId, StatusId)>
        {
            (StatusId.Pending, StatusId.Confirmed),
            (StatusId.Pending, StatusId.Cancelled),
            (StatusId.Confirmed, StatusId.Fulfilled),
            (StatusId.Confirmed, StatusId.Cancelled),
        };
        var data = new TheoryData<StatusId, StatusId, bool>();
        foreach (var from in Enum.GetValues<StatusId>())
        {
            foreach (var to in Enum.GetValues<StatusId>())
            {
                data.Add(from, to, allowed.Contains((from, to)));
            }
        }

        return data;
    }

    [Theory]
    [MemberData(nameof(AllPairs))]
    public void ChangeTo_AllowsExactlyTheFourListedTransitions(StatusId from, StatusId to, bool allowed)
    {
        var order = OrderIn(from);
        var historyBefore = order.StatusChanges.Count;

        var result = PurchaseOrderStatusContext.For(order).ChangeTo(to, Now);

        result.IsSuccess.Should().Be(allowed);
        if (allowed)
        {
            order.CurrentStatusId.Should().Be(to);
            order.StatusChanges.Should().HaveCount(historyBefore + 1);
            order.StatusChanges[^1].StatusId.Should().Be(to);
        }
        else
        {
            result.Error.Code.Should().Be("PurchaseOrder.InvalidStatusTransition");
            result.Error.Description.Should().StartWith("This status change is not allowed.");
            order.CurrentStatusId.Should().Be(from);
            order.StatusChanges.Should().HaveCount(historyBefore);
        }
    }

    [Fact]
    public void Create_StartsPendingThroughTheContext()
    {
        var order = OrderIn(StatusId.Pending);

        order.CurrentStatusId.Should().Be(StatusId.Pending);
        order.StatusChanges.Should().ContainSingle();
        PurchaseOrderStatusContext.For(order).AllowedTransitions.Should().Equal(StatusId.Confirmed, StatusId.Cancelled);
    }

    [Fact]
    public void PendingThenConfirmedThenFulfilled_LeavesThreeHistoryRows()
    {
        var order = OrderIn(StatusId.Fulfilled);

        order.StatusChanges.Select(s => s.StatusId).Should().Equal(StatusId.Pending, StatusId.Confirmed, StatusId.Fulfilled);
        PurchaseOrderStatusContext.For(order).AllowedTransitions.Should().BeEmpty();
    }

    [Theory]
    [InlineData(StatusId.Pending, true)]
    [InlineData(StatusId.Confirmed, false)]
    [InlineData(StatusId.Fulfilled, false)]
    [InlineData(StatusId.Cancelled, false)]
    public void EditAndDelete_ArePermittedWhilePendingOnly(StatusId status, bool permitted)
    {
        var context = PurchaseOrderStatusContext.For(OrderIn(status));

        context.EnsureEditable().IsSuccess.Should().Be(permitted);
        context.EnsureDeletable().IsSuccess.Should().Be(permitted);
        if (!permitted)
        {
            context.EnsureEditable().Error.Code.Should().Be("PurchaseOrder.NotEditable");
            context.EnsureDeletable().Error.Code.Should().Be("PurchaseOrder.NotDeletable");
        }
    }

    [Fact]
    public void TerminalRefusal_ExplainsTheOrderIsFinal()
    {
        var result = PurchaseOrderStatusContext.For(OrderIn(StatusId.Cancelled)).ChangeTo(StatusId.Pending, Now);

        result.Error.Description.Should().Contain("final");
    }

    [Fact]
    public void ChangeTo_UndefinedStatus_IsInvalid()
    {
        PurchaseOrderStatusContext.For(OrderIn(StatusId.Pending)).ChangeTo((StatusId)11, Now)
            .Error.Code.Should().Be("PurchaseOrder.InvalidStatus");
    }

    /// <summary>An order brought to <paramref name="status"/> through valid transitions.</summary>
    private static PurchaseOrder OrderIn(StatusId status)
    {
        var order = PurchaseOrder.Create(
            "PO-2026-100",
            Customer.Create("Alpha Studios", "orders@alpha.co.za").Value,
            CurrencyId.Zar,
            null,
            [new(Product.Create("SDA001", "Delicious Soda").Value, 1, 1m)],
            Now).Value;
        var context = PurchaseOrderStatusContext.For(order);
        StatusId[] path = status switch
        {
            StatusId.Confirmed => [StatusId.Confirmed],
            StatusId.Fulfilled => [StatusId.Confirmed, StatusId.Fulfilled],
            StatusId.Cancelled => [StatusId.Cancelled],
            _ => [],
        };
        foreach (var step in path)
        {
            context.ChangeTo(step, Now).IsSuccess.Should().BeTrue();
        }

        return order;
    }
}
