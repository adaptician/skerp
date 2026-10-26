# Purchase Order Monitor Mode — Feature plan (AB#1482)

## Outcome

A user can turn on **Monitor Mode** on the purchase-order list screen and leave it running. The screen
then becomes a live monitor:

- creating, the row Actions menus and line-item expansion are hidden; the status dropdown still works;
- every create, edit, status change and delete, from any session, makes the grid fetch its current page
  again under the user's own search, filters, sort and page, without a page reload;
- changed rows animate: created rows expand into place, edited rows are outlined and lifted for two
  seconds, status changes add the new status's colour for two seconds, and deleted rows shrink and fade;
- a health indicator shows the live connection's state, and says plainly when it has dropped, with a
  prompt to refresh.

With Monitor Mode off, the screen looks and works exactly as before.

## Decision boundary

**In scope**

- **Server:** a SignalR hub, behind the existing `Feature_PurchaseOrders` toggle. After each successful
  create, edit, status change and delete, the Application layer raises a purchase-order change (id and
  kind) through an abstraction that the Api implements by broadcasting to every connected client.
  Refused requests broadcast nothing.
- **Client:** the Monitor Mode toggle on the list screen, remembered in the browser; the connection opened
  when it is on and closed when it is off or the screen closes; the health indicator; the background
  re-fetch with the current query; the monitor variant of the grid and cards; and the row animations.
- **Tests:** integration tests for the hub (each change kind, refusals, toggle off) and client tests for
  the monitor state, the re-fetch and the hidden controls.

**Out of scope**

- **Automatic reconnection.** A follow-up enhancement; for now the user refreshes.
- **A new release or feature toggle** (product owner, 2026-10-25). The hub sits behind `Feature_PurchaseOrders`.
- **Concurrency safety** (excluded by the Deliverable).
- **Figma changes.** No new frames; the new surfaces follow the existing design system (see the Story spec).
- Pushing row data over the connection, per-user targeting, or presence (who else is monitoring).
- Live updates of line items inside an expanded row; Monitor Mode has no expanded rows.
- A SignalR backplane. `Clients.All` reaches only the sessions connected to the same API instance; the
  Deliverable runs one local instance (deployments are out of its scope). Scaling out needs a backplane.

## Evidence

| Claim | Tier | What settles it |
|---|---|---|
| SignalR ships in the ASP.NET Core shared framework, so the server needs no new package | derived | Microsoft docs; settled by AB#1483's tracer bullet building with no package added to `Skerp.Api` |
| The hub can sit behind `UseFeatureGates` and next to the versioned `/api/v1` group without Asp.Versioning rejecting it | derived | AB#1483's tracer bullet: negotiate answers 200 with the toggle on and 404 with it off |
| The Angular dev server proxies the hub (`/api` with WebSockets on) | derived | AB#1483's tracer bullet: the client connects through `ng serve` |
| Angular 21's `animate.enter` / `animate.leave` keep a removed row in the DOM until its leave animation ends | derived | Angular docs (stable since 20.2); settled when AB#1483's milestone 2 is verified in the browser |
| The Deliverable chooses SignalR for live updates | demonstrated | [Deliverable README](../../../../deliverables/erp-web-app/README.md) → *Technology Overview* |

## Work-item decomposition

| ADO | Type | Primary slug | Points | Adds |
|---|---|---|---|---|
| AB#1483 | User Story | `monitor-purchase-orders` | 13 | The hub and change notifications, the Monitor Mode toggle and health indicator, the background re-fetch, the monitor grid variant, row animations, and tests |

**Order.** One Story, after the CRUD and State Machine Features (merged in PR 728), because it observes
every operation they built.

## Observable proof

- **Positive:** with two browsers on the list, turn Monitor Mode on in one. In the other, create, edit,
  change the status of, and delete orders. The monitoring browser's grid follows each change under its own
  filters and page, animating each row, without a reload or a loading skeleton.
- **Negative:**
  - A third browser with Monitor Mode off does not change.
  - A refused change (for example, Demo Mode Pending → Fulfilled) moves nothing in the monitoring browser.
  - Stopping the API turns the indicator to *Disconnected* with a prompt to refresh; nothing reconnects
    on its own.
  - With `Feature_PurchaseOrders` off, the hub answers 404.

## Completion boundary

- No purchase-order write path saves without raising its change, and no refused request raises one.
- The connection exists only while Monitor Mode is on and the list screen is open.
- With Monitor Mode off, the list screen passes the design verification bar exactly as before.
