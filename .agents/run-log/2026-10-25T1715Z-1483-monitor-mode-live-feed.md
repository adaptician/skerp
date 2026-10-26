---
work-item: 1483
summary: >
  Milestone 1 of Monitor Purchase Orders Live — SignalR hub, change notifications, Monitor Mode toggle,
  health indicator and quiet re-fetch.
---
# Monitor Mode live feed (AB#1483, milestone AB#1484)

## What changed

- `POST /api/v1/hubs/purchase-orders/negotiate` and the hub behind `Feature_PurchaseOrders`. Every
  committed create, edit, status change and delete pushes `{ id, change }` to every connection;
  refused requests push nothing (six integration tests over the in-memory server).
- The list screen has a **Monitor Mode** toggle. On: New purchase order, the Actions column, the
  expand column, the card kebab and the card line-items toggle are hidden; the status control stays;
  a health chip shows Connecting… / Live / Disconnected with "Refresh the page to reconnect." and a
  Refresh button. The choice is remembered in local storage.
- A pushed change re-fetches the current page under the current query with no skeleton (one fetch per
  300 ms burst).

Tracer bullet: fired along the planned path and hit — an integration test receives a pushed change from
a REST call, the toggle-off hub answers 404, and the Angular client connected through `ng serve` and
re-rendered PO-2026-029 as Confirmed after a status change made from another tab. The handler wiring
was one line per handler, so it was built with the skeleton rather than in a separate commit.

Consumers of changed shared mechanisms, re-checked:

| Mechanism | Consumer | Result |
|---|---|---|
| Write handlers (new notifier) | `CreatePurchaseOrderTests`; create/edit/status/delete endpoint integration tests | pass (`dotnet test`) |
| `RequireFeature` (now generic over `IEndpointConventionBuilder`) | purchase-order, customer, product groups | pass: endpoint tests; 404 with the toggle off |
| `Program.cs` (SignalR + hub route beside the `/api` fallback) | `ApiVersioningTests`, `HostingEndpointsTests`, `FeatureEndpointsTests` | pass |
| `adapt-purchase-order-list` (`monitor` input) | purchase-orders page | pass: page tests; Monitor Mode off compared with `sales/purchase-orders/list/desktop` (`28:316`) at 1400px — identical apart from the approved toggle |
| Purchase-orders NgRx slice | page, effects, reducer spec | pass: 150 client tests |
| `proxy.conf.json` `ws: true` | every `/api` call via `ng serve` | pass: list, features and negotiate all 200 |

design-fidelity-check verify: pass — `sales/purchase-orders/list/desktop` (`28:316`) exists live; L3
compared at 1400px with Monitor Mode off (no difference beyond the approved Monitor Mode toggle); the
monitor variant and health chip are prose-approved surfaces (spec → Design), checked at 1400px and
375px; L4 — the toggle's connection observed as the negotiate request and a pushed refresh.

## What surprised you

- SignalR emits the typed client proxy in a dynamic assembly, so `IPurchaseOrderMonitorClient` and its
  message record are `public` while the rest of `Skerp.Api` is `internal`.
- An exported constant in `purchase-orders.effects.ts` broke `provideEffects(module)`, which treats
  every export as an effect; the debounce constant moved to the monitor model.
- `npm install @microsoft/signalr@^9` picked the 9.x line; the client is on 10.0.x to match .NET 10.

## What you assumed

- Broadcasting to all connections satisfies "only Monitor Mode users receive updates", because only
  Monitor Mode opens a connection (spec → Decisions). Not load-bearing beyond this Story.

## Conformance review (milestone 1)

Full gate green (16/16). Findings, all fixed before merge:

- **Blocking — correctness:** with storage blocked, leaving and reopening the screen kept
  `monitor.enabled` in the store but opened no connection (chip stuck on Connecting…).
  `restoreMonitorMode` now reconnects when the store *or* storage says on; test added.
- **Blocking — functional impact:** `RequireFeature` became generic and was missing from the spec's
  table; row added (consumers re-checked by the endpoint tests and the toggle-off 404).
- **Advisory — test coverage:** nothing proved a failed broadcast never fails the request;
  `SignalRPurchaseOrderChangeNotifierTests` added (fails if the catch is removed).

AC for this milestone confirmed on a developer machine (tests plus the running app); not verified in a
shared environment.
