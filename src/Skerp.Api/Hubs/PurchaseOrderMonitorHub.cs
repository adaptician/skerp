using Microsoft.AspNetCore.SignalR;

namespace Skerp.Api.Hubs;

/// <summary>
/// Monitor Mode's live feed. Clients only listen: a connection exists only while Monitor Mode is on,
/// so broadcasting to every connection reaches exactly the monitoring sessions. Changes are made
/// through the REST endpoints, never through the hub.
/// </summary>
internal sealed class PurchaseOrderMonitorHub : Hub<IPurchaseOrderMonitorClient>;
