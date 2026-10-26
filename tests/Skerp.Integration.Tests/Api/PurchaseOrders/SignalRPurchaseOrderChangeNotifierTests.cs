using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Skerp.Api.Hubs;
using Skerp.Application.PurchaseOrders.Monitoring;

namespace Skerp.Integration.Tests.Api.PurchaseOrders;

/// <summary>
/// The notifier runs after the change is committed, so a failed broadcast must never fail the request
/// that made the change.
/// </summary>
public sealed class SignalRPurchaseOrderChangeNotifierTests
{
    [Fact]
    public async Task FailedBroadcast_IsSwallowed()
    {
        var notifier = new SignalRPurchaseOrderChangeNotifier(
            new FailingHubContext(),
            NullLogger<SignalRPurchaseOrderChangeNotifier>.Instance);

        var notify = () => notifier.NotifyAsync(
            new PurchaseOrderChange(Guid.NewGuid(), PurchaseOrderChangeKind.Edited),
            CancellationToken.None);

        await notify.Should().NotThrowAsync();
    }

    [Fact]
    public async Task Change_IsSentInCamelCase()
    {
        var hub = new RecordingHubContext();
        var notifier = new SignalRPurchaseOrderChangeNotifier(hub, NullLogger<SignalRPurchaseOrderChangeNotifier>.Instance);
        var id = Guid.NewGuid();

        await notifier.NotifyAsync(new PurchaseOrderChange(id, PurchaseOrderChangeKind.StatusChanged), CancellationToken.None);

        hub.Sent.Should().Equal(new PurchaseOrderChangedMessage(id, "statusChanged"));
    }

    private class RecordingHubContext : IHubContext<PurchaseOrderMonitorHub, IPurchaseOrderMonitorClient>, IPurchaseOrderMonitorClient
    {
        public List<PurchaseOrderChangedMessage> Sent { get; } = [];

        public IHubClients<IPurchaseOrderMonitorClient> Clients => new EveryClient(this);

        public IGroupManager Groups => throw new NotSupportedException();

        public virtual Task PurchaseOrderChanged(PurchaseOrderChangedMessage message)
        {
            Sent.Add(message);
            return Task.CompletedTask;
        }
    }

    /// <summary>Every target resolves to the one recording client.</summary>
    private sealed class EveryClient(IPurchaseOrderMonitorClient client) : IHubClients<IPurchaseOrderMonitorClient>
    {
        public IPurchaseOrderMonitorClient All => client;

        public IPurchaseOrderMonitorClient AllExcept(IReadOnlyList<string> excludedConnectionIds) => client;

        public IPurchaseOrderMonitorClient Client(string connectionId) => client;

        public IPurchaseOrderMonitorClient Clients(IReadOnlyList<string> connectionIds) => client;

        public IPurchaseOrderMonitorClient Group(string groupName) => client;

        public IPurchaseOrderMonitorClient GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => client;

        public IPurchaseOrderMonitorClient Groups(IReadOnlyList<string> groupNames) => client;

        public IPurchaseOrderMonitorClient User(string userId) => client;

        public IPurchaseOrderMonitorClient Users(IReadOnlyList<string> userIds) => client;
    }

    private sealed class FailingHubContext : RecordingHubContext
    {
        public override Task PurchaseOrderChanged(PurchaseOrderChangedMessage message) =>
            throw new InvalidOperationException("The connection is gone.");
    }
}
