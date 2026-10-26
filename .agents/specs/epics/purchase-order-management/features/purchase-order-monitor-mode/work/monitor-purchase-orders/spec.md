# Monitor Purchase Orders Live — Story spec (AB#1483)

User Story under Feature AB#1482 *Purchase Order Monitor Mode* (Epic AB#1429), slug
`monitor-purchase-orders`, **13 points**. Primary branch:
`feat/purchase-order-management/monitor-purchase-orders`, cut from `main` after PR 728.

The depth ladder would refuse a 13-point Story. The product owner suspended that rule until it is
resolved (see [`current-focus.md`](../../../../../../../context/current-focus.md)), and asked for this
Feature to be one Story, so it is planned here with two milestones.

## What and why

Some users capture and manage orders; others watch them move. Monitor Mode turns the list screen into a
live monitor that can be left open: capture controls are hidden, the status dropdown stays, and every
change any session makes to an order is pushed over SignalR, so the grid fetches its current page again
under the user's own query and animates what changed. A health indicator makes a dropped connection
obvious, because a monitor that silently stops updating is worse than none.

## Acceptance criteria

### Monitor Mode toggle

- **Given** the purchase-order list screen with Monitor Mode off
- **When** the user turns Monitor Mode on
- **Then** "New purchase order" is hidden, every row's Actions menu is hidden, and rows (and cards) can
  no longer be expanded to show line items
- **And** the status dropdown on each row still changes the order's status
- **Given** Monitor Mode is on
- **When** the user turns it off
- **Then** the screen looks and works exactly as it did before Monitor Mode existed
- **Given** Monitor Mode is on
- **When** the page is refreshed
- **Then** Monitor Mode is still on (remembered in this browser)

### Connection and health

- **Given** Monitor Mode is turned on
- **Then** a live connection opens and the health indicator shows it as connected ("Live")
- **When** Monitor Mode is turned off, or the user leaves the screen
- **Then** the connection closes and the health indicator is gone
- **Given** Monitor Mode is on and connected
- **When** the connection drops (for example, the API stops)
- **Then** the indicator shows "Disconnected" in an alert colour with a message to refresh the page to
  reconnect, and a Refresh button that reloads the page
- **And** nothing reconnects on its own

### Live updates

- **Given** session A has Monitor Mode on, with any search, customer, status and created-date filters,
  sort and page
- **When** session B creates, edits, changes the status of, or deletes an order
- **Then** within a few seconds A's grid shows the current results for A's own query, with no page reload
  and no loading skeleton
- **And** a change to an order outside A's filters does not add it to A's grid
- **Given** session C has Monitor Mode off
- **When** session B changes an order
- **Then** C's grid does not change
- **Given** a change the server refuses (400, 404 or 422)
- **Then** no monitoring session refreshes
- **Given** `Feature_PurchaseOrders` is off
- **Then** the hub answers 404, like every other purchase-order endpoint

### Row animations (Monitor Mode only)

- **Given** a created order that falls in A's page
- **Then** its row expands into place, pushing the rows around it apart
- **Given** an edited order on A's page
- **Then** its row is outlined with a thick coloured border and lifted above the rest for 2 seconds,
  then returns to normal
- **Given** an order on A's page whose status changed
- **Then** its row gets the same border and lift, and its background takes the new status's colour, for
  2 seconds, then returns to normal
- **Given** a deleted order on A's page
- **Then** its row shrinks out of view and fades out, the reverse of a created row

## Step 1: Tracer bullet

Aimed at the riskiest path: a hub on the Api, behind the feature gate and beside the versioned group,
reached by the Angular client through the dev proxy, fed by an Application-layer notification.

| Element | New / changed | Layer / project / folder | Access | Stub behaviour |
|---|---|---|---|---|
| `PurchaseOrderChange`, `PurchaseOrderChangeKind` (Created, Edited, StatusChanged, Deleted) | new | Application `PurchaseOrders/Monitoring/` | public | record of id and kind |
| `IPurchaseOrderChangeNotifier` | new | Application `PurchaseOrders/Monitoring/` | public | `NotifyAsync(change, ct)` |
| Create, Edit, UpdateStatus, Delete handlers | changed | Application `PurchaseOrders/*` | internal | call the notifier after `SaveChangesAsync` succeeds |
| `PurchaseOrderMonitorHub` : `Hub<IPurchaseOrderMonitorClient>` | new | Api `PurchaseOrders/` → `Hubs/` | internal | no server methods; clients only listen |
| `IPurchaseOrderMonitorClient.PurchaseOrderChanged(PurchaseOrderChangedMessage)` | new | Api `Hubs/` | internal | `{ id, change }`, change in camelCase |
| `SignalRPurchaseOrderChangeNotifier` | new | Api `Hubs/` | internal sealed | `Clients.All` send; logs and swallows a failed send |
| `MapPurchaseOrderMonitorHub` → `/api/v1/hubs/purchase-orders` | new | Api `Hubs/` | internal | behind `Feature_PurchaseOrders` via `RequiredFeature` metadata |
| `AddSignalR()` + notifier registration | changed | Api `Program.cs` | — | — |
| `proxy.conf.json` `/api` → `ws: true` | changed | client | — | WebSockets through `ng serve` |
| `@microsoft/signalr` | new package | client | — | — |
| `PurchaseOrderMonitorConnection` | new | client feature `services/` | `providedIn: 'root'` | `connect()`: an Observable of changes and connection states; unsubscribe stops the connection |
| `MonitorModeStorageService` | new | client feature `services/` | root | read/write `skerp.purchaseOrders.monitorMode` |
| `monitorModeToggled`, `monitorConnectionChanged`, `monitorChangeReceived`, `monitorRefreshed`, `monitorHighlightsExpired`, `closed` | new actions | client feature `state/` | — | — |
| `monitor` slice (enabled, connection, entering, leaving, highlights) + selectors | changed | client `state/purchase-orders.feature.ts` | — | — |
| `monitorConnection`, `monitorRefresh`, `expireMonitorHighlights`, `rememberMonitorMode` effects | new | client `state/` | — | — |
| `adapt-monitor-health` | new | client feature `components/monitor-health/` | standalone | connecting / live / disconnected + Refresh |
| `PurchaseOrderList` `monitor` and `rowChanges` inputs | changed | client feature `components/` | — | defaults keep today's behaviour |
| Monitor Mode `a-toggle` in the title row | changed | page | — | — |
| `PurchaseOrderMonitorHubTests` | new | `tests/Skerp.Integration.Tests/Api/PurchaseOrders/` | — | connect with `Microsoft.AspNetCore.SignalR.Client` through the test server |

The round hits when: a status change through the REST endpoint arrives as a `PurchaseOrderChanged`
message on a hub connection in an integration test · the Application layer references no SignalR type
(the layer test stays green) · negotiate is 404 with `Feature_PurchaseOrders` off · the Angular client
connects through `ng serve` and logs a received change · the re-fetch reuses `PurchaseOrdersApi.list`
with the current query, so the data has a known source.

## Milestones

| # | Milestone | Branch | Complete when |
|---|---|---|---|
| 1 | Live feed | `feat/purchase-order-management/monitor-purchase-orders-live-feed` | The hub broadcasts every successful create, edit, status change and delete and nothing on a refusal (integration tests); Monitor Mode toggles, is remembered, hides New, Actions and expansion; the health indicator shows connecting, live and disconnected; a change from another browser re-fetches the grid under the current query with no skeleton; client tests pass |
| 2 | Change animations | `feat/purchase-order-management/monitor-purchase-orders-animations` | Created rows expand in, edited rows outline and lift for 2 s, status changes also tint the row with the status colour for 2 s, deleted rows shrink and fade — in the table and the cards; with `prefers-reduced-motion` the changes still show without movement; client tests pass; design verify passes |

## Decisions where the plan sources are silent

- **The push carries no row data**, only `{ id, change }`. Each monitoring session re-fetches its own page
  with its own query, so filters, sort and paging stay the server's to apply and nothing leaks into a page
  it does not belong on.
- **"Only Monitor Mode users receive updates"** holds because only Monitor Mode opens a connection; the hub
  broadcasts to every connection. No groups are needed.
- **The session that made a change also receives it** when it is monitoring, and animates it like any
  other. Excluding the sender would need the connection id on every REST call for no visible gain.
- **Changes are coalesced**: changes arriving within 300 ms are fetched once, and fetches run one after
  another so each set of changes animates against the page it produced.
- **A background re-fetch that fails** keeps the current rows and leaves the indicator as it is; the next
  change tries again. A dropped connection is what the indicator reports.
- **Monitor Mode is remembered in local storage**, so the Refresh the disconnected prompt asks for brings
  the user straight back into Monitor Mode.
- **Turning Monitor Mode on collapses expanded rows**, since they can no longer be expanded or collapsed.
- **"Purchase order line items" in the brief's animation list means the grid's rows** (and the cards
  below lg): rows cannot be expanded in Monitor Mode, so there are no line items on screen to animate.
- **The highlight colour** is `--color-primary` for the border and `--elevation-dropdown` for the lift;
  the status tint is the status pill's background token. No new tokens.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, rows appear and disappear without movement,
  and the 2-second highlight still shows (it carries information).
- **Notification failure never fails the request.** The change is already committed; a failed broadcast
  is logged.

## Design

`design-fidelity-check: applies — the list screen gains a Monitor Mode toggle, a health indicator, a
monitor variant of the grid and cards, and row animations.`

**Approval to proceed without new designs** for those surfaces: Tyler Pieterse (product owner), in the
session on 2026-10-25 — *"No changes will be made to the Figma design at this time. Frontend components
should continue to follow the standards and remain consistent with the look and feel established by the
current design."* The surfaces are built from existing components and tokens:

- **Toggle:** the common `a-toggle` (Control/Toggle), labelled "Monitor Mode", in the title row before
  "New purchase order" (desktop) and above it (below lg).
- **Health indicator:** a status-pill-shaped chip with a dot. *Connecting…* (muted), *Live* (fulfilled
  colours), *Disconnected* (cancelled colours, `role="alert"`) followed by "Refresh the page to reconnect."
  and a secondary SM "Refresh" button. Shown only in Monitor Mode, in place of the New button.
- **Monitor grid and cards:** the existing list frames with the expand column, the Actions column, the
  card kebab and the card line-items toggle removed. Column widths otherwise unchanged.
- **Animations:** described in the acceptance criteria; durations 300 ms for enter and leave, 2 s for
  highlights.

Existing frames the monitor variant derives from, all approved in the index:

| Screen · state · breakpoint | Citation | Page | Approval | Fingerprint |
|---|---|---|---|---|
| Purchase orders · list · desktop | `sales/purchase-orders/list/desktop` (`28:316`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:a4a608ba5f90c4e0` |
| Purchase orders · list · lg | `sales/purchase-orders/list/lg` (`32:4605`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:feb56f0b58133469` |
| Purchase orders · list · md | `sales/purchase-orders/list/md` (`32:5047`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:c216c36c24612c42` |
| Purchase orders · list · mobile | `sales/purchase-orders/list/mobile` (`33:4809`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:156c780ae0409b46` |

## Functional impact

| Shared mechanism | Consumers (search) | Risk |
|---|---|---|
| Create, Edit, UpdateStatus and Delete handlers (new notifier dependency) | `CreatePurchaseOrderTests` constructs the create handler; the others resolve through MediatR in integration tests (`rg "PurchaseOrderCommandHandler" src tests`) | low: unit test gains a substitute notifier; integration tests resolve the real one |
| `RequireFeature` (now generic over `IEndpointConventionBuilder`, so a hub can carry it) | the purchase-order, customer and product endpoint groups (`rg "RequireFeature" src`) | low: same metadata, same middleware; endpoint tests and the toggle-off 404 re-run |
| `Program.cs` pipeline (SignalR, a new endpoint beside `/api/v1` and its fallback) | every endpoint; `ApiVersioningTests`, `HostingEndpointsTests`, `FeatureEndpointsTests` | low: an explicit route outranks the `/api/{**path}` fallback; re-run the API tests |
| `adapt-purchase-order-list` (new inputs) | the purchase-orders page only (`rg "adapt-purchase-order-list" client/src`) | low: defaults reproduce today's markup; re-verify the list frames with Monitor Mode off |
| List body-cell markup (each cell's content wrapped in `.po-table__cell`; the customer ellipsis moves onto it) | the purchase-orders page with Monitor Mode off | low: same 7 columns and 56px rows; re-verified against `sales/purchase-orders/list/desktop` |
| Purchase-orders NgRx slice (new `monitor` state and actions) | the page, its effects, `purchase-orders.feature.spec.ts` (`rg "purchaseOrdersFeature\|PurchaseOrdersActions" client/src`) | low: additive; the existing `loaded` path is untouched |
| `proxy.conf.json` (`ws: true` on `/api`) | every `/api` call from `ng serve` | low: plain HTTP requests are unaffected |
| `a-toggle` (reused, unchanged) | header Demo Mode toggle, welcome page (`rg "a-toggle" client/src`) | none: not modified |

## Deployment

None: no configuration key, migration or toggle. The client gains `@microsoft/signalr`; `npm install`
picks it up.

## Milestone records

### Milestone 1 — Live feed (closed)

- **Implemented:** the hub and change notifications; the Monitor Mode toggle (remembered), the hidden
  New, Actions and expansion controls, the health chip with its disconnected prompt, and the quiet
  re-fetch of the current page on each pushed change.
- **How to test:** `dotnet test --filter PurchaseOrderMonitorHubTests` (6 pass); `npm test` in
  `client/`; then `npm start`, turn Monitor Mode on at `/purchase-orders`, change a status from another
  tab, and watch the row update with no skeleton; stop the API and see *Disconnected*.
- **Assumptions:** the typed hub client is `public` (SignalR emits its proxy in another assembly).
- **Next:** Milestone 2 — Change animations,
  `feat/purchase-order-management/monitor-purchase-orders-animations`.

### Milestone 2 — Change animations (closed)

- **Implemented:** in Monitor Mode, a refresh compares the old page with the new one. Arriving rows
  (a created order, or one pushed onto the page) grow into place; leaving rows (a deleted order, or
  one pushed off or filtered out) shrink and fade; edited rows are outlined in the primary colour and
  lifted for 2 s; status changes also take the new status's pill background for 2 s. The table animates
  its cells (a row cannot animate its height), cards animate themselves. With
  `prefers-reduced-motion`, rows appear and go at once and the highlight shows without the lift.
- **How to test:** `npm test` in `client/`; then the How To Test on AB#1483, including its visual
  sign-off step.
- **Assumptions:** rows that arrive or leave because the page shifted animate like created and deleted
  rows, so the grid never jumps.
- **Verification note:** the agent's browser pane ran hidden, so CSS motion did not advance and could not
  be screenshotted. The end states (outline, shadow, tint, lift, the 2 s expiry) and the enter/leave
  classes and animation names were read from the live page; the motion itself needs the human sign-off
  step in How To Test.
- **Next:** raise the PR from `feat/purchase-order-management/monitor-purchase-orders` to `main`.

