using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Skerp.Application.PurchaseOrders.Monitoring;

namespace Skerp.Api.Hubs;

/// <summary>
/// Broadcasts a committed purchase-order change to every Monitor Mode connection. A failed send is
/// logged and swallowed: the change is already saved, and the request that made it has succeeded.
/// </summary>
internal sealed partial class SignalRPurchaseOrderChangeNotifier(
    IHubContext<PurchaseOrderMonitorHub, IPurchaseOrderMonitorClient> hub,
    ILogger<SignalRPurchaseOrderChangeNotifier> logger) : IPurchaseOrderChangeNotifier
{
    public async Task NotifyAsync(PurchaseOrderChange change, CancellationToken cancellationToken)
    {
        var message = new PurchaseOrderChangedMessage(change.Id, JsonNamingPolicy.CamelCase.ConvertName(change.Kind.ToString()));
        try
        {
            await hub.Clients.All.PurchaseOrderChanged(message);
        }
        catch (Exception exception)
        {
            LogBroadcastFailed(logger, exception, change.Id, change.Kind);
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Monitor Mode could not be told that purchase order {Id} was {Kind}")]
    private static partial void LogBroadcastFailed(ILogger logger, Exception exception, Guid id, PurchaseOrderChangeKind kind);
}
