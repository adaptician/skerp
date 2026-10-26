# Update Purchase Order Status — Story spec (AB#1470)

User Story under Feature AB#1436 *Purchase Order State Machine* (Epic AB#1429), slug
`update-purchase-order-status`, **8 points**. Primary branch:
`feat/purchase-order-management/update-purchase-order-status`, cut from AB#1467's primary branch
`feat/purchase-order-management/list-purchase-orders` (stacked; one PR for the Epic).

## What and why

A user moves an order through its lifecycle from the list's status control: Pending → Confirmed or
Cancelled; Confirmed → Fulfilled or Cancelled. Fulfilled and Cancelled are final. Every change is
appended to the order's status history. The backend alone decides what is allowed, through a GoF
State pattern that is also the only way any code sets a status: create's initial Pending, the seed,
and the edit and delete guards that AB#1468 and AB#1469 use.

## Acceptance criteria

### Transitions

- **Given** each of the 16 (from, to) status pairs
- **When** a status change is requested
- **Then** exactly Pending→Confirmed, Pending→Cancelled, Confirmed→Fulfilled and Confirmed→Cancelled
  succeed; every other pair is refused with a descriptive error and the status is unchanged
- **Given** a Pending order
- **When** the user selects Confirmed, then Fulfilled
- **Then** both succeed, the row shows Fulfilled as a pill, and three status-change rows exist
- **Given** a Fulfilled or Cancelled order
- **Then** any status change is refused (422), and the order reports it cannot be edited or deleted
- **Given** an undefined statusId or a malformed id
- **Then** 400; an unknown id is 404

### Status control

- **Given** Demo Mode is off and a Pending order
- **Then** the control offers only Confirmed and Cancelled; a Fulfilled or Cancelled order shows a pill
- **Given** Demo Mode is on
- **Then** every order's control offers all four statuses, the current one ticked, each with an info
  icon whose tooltip carries the brief's note (on hover and on focus)
- **Given** Demo Mode is on and a Pending order
- **When** the user selects Fulfilled
- **Then** the error popup "Status change not allowed" shows the server's reason and the row still
  shows Pending
- **Given** a valid change
- **Then** the row updates in place without a reload and a success popup confirms it

## Step 1: Tracer bullet

| Element | New / changed | Layer / project / folder | Access | Stub behaviour |
|---|---|---|---|---|
| `IPurchaseOrderState`, `PendingState`, `ConfirmedState`, `FulfilledState`, `CancelledState` | new | Domain `PurchaseOrders/States/` | public interface, internal sealed states | allowed transitions, terminal, can edit/delete |
| `PurchaseOrderStatusContext` | new | Domain `PurchaseOrders/` | public | `For(order)`, `Start`, `ChangeTo`, `EnsureEditable`, `EnsureDeletable`, `AllowedTransitions` |
| `PurchaseOrder.RecordStatus` | changed | Domain | `internal`, and requires a `StatusTicket` that only the context issues | appends a status change |
| `PurchaseOrderErrors.InvalidStatusTransition`, `NotEditable`, `NotDeletable` | new | Domain | public | 422 |
| `UpdatePurchaseOrderStatusCommand` (+ validator, handler) | new | Application `PurchaseOrders/UpdateStatus/` | public / internal | `Result<PurchaseOrderListItem>` |
| `allowedStatusIds` on list items and the order response | new | Application | public | from the context |
| `PUT /api/v1/purchase-orders/{id}/status` | new | Api | internal | behind the toggle |
| `adapt-status-control` (+ tooltip) and the list's `statusTemplate` | new | client feature `components/` | standalone | pill or select |
| `statusChangeRequested` / `statusChanged` / `statusChangeFailed` + effect | new | client `state/` | — | update the row in place |

The round hits when: a PUT travels to the context and back as a Result · no code outside the context
sets `CurrentStatusId` (`RecordStatus` needs a context-issued ticket; Infrastructure, which sees Domain internals for audit stamping, could forge one, so that path is held by review: the seeder goes through the context) · the seed builds every status through valid
transitions · the control reads `allowedStatusIds` from the server rather than a client copy of the
rules.

## Milestones

| # | Milestone | Branch | Complete when |
|---|---|---|---|
| 1 | State machine and endpoint | `feat/purchase-order-management/update-purchase-order-status-state-machine` | All 16 pairs are unit-tested; create and the seed go through the context; the endpoint answers per the AC with history rows; integration tests pass |
| 2 | Status control | `feat/purchase-order-management/update-purchase-order-status-control` | The control works in both Demo Mode states at desktop and mobile; the row updates in place; client tests pass; design verify passes |

## Decisions where the plan sources are silent

- **The client never mirrors the transition table.** List rows and the order response carry
  `allowedStatusIds` from `PurchaseOrderStatusContext`; the control shows them with Demo Mode off.
  This settles the Feature plan's `assumed` evidence row without a client copy of the rules.
- **Demo Mode applies to terminal orders too.** The brief makes the pill the Demo-Mode-off rendering
  of a terminal status, and Demo Mode's purpose is to let a reviewer attempt invalid changes; so with
  Demo Mode on, Fulfilled and Cancelled rows get the full control. The Demo Mode frames show terminal
  rows as pills; the brief wins where they differ (delegated judgement, recorded here).
- **Selecting the current status** is refused like any invalid transition (Pending→Pending is one of
  the 12 refused pairs), so Demo Mode can show it.
- **Refusals are 422** (`PurchaseOrder.InvalidStatusTransition`), titled "Status change not allowed"
  in the popup as the error frame shows; a malformed request stays 400.
- **History rows** are appended only for successful changes; the initial Pending on create is the
  first row.
- **The response** of the status PUT is the updated list row, so the client replaces it in place.

## Design

`design-fidelity-check: applies — the status control, its Demo Mode variant, the tooltip and the
error popup are UI surfaces.` Frames confirmed live 2026-10-23 with fingerprints matching the index.

| Screen · state · breakpoint | Citation | Page | Approval | Fingerprint |
|---|---|---|---|---|
| Purchase orders · status-control · desktop | `sales/purchase-orders/status-control/desktop` (`31:2084`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:6ff30ccfaa0ae99d` |
| Purchase orders · status-control · mobile | `sales/purchase-orders/status-control/mobile` (`33:5727`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:e9b78d7c167a7475` |
| Purchase orders · status-control-demo-mode · desktop | `sales/purchase-orders/status-control-demo-mode/desktop` (`31:2657`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:17408b1923fc1569` |
| Purchase orders · status-control-demo-mode · mobile | `sales/purchase-orders/status-control-demo-mode/mobile` (`34:5650`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:157178c7ab051071` |
| Purchase orders · error · desktop | `sales/purchase-orders/error/desktop` (`32:4151`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:68ba590252d17853` |
| Purchase orders · error · mobile | `sales/purchase-orders/error/mobile` (`34:6575`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:9ca5df8e8a8c357f` |

## Functional impact

| Shared mechanism | Consumers (search) | Risk |
|---|---|---|
| `PurchaseOrder.Create` / status recording | `CreatePurchaseOrderCommandHandler`, `PurchaseOrderSeeder`, `PurchaseOrderTests`, persistence tests (`rg "RecordStatus\|PurchaseOrder.Create" src tests`) | medium: the seed's status paths must be valid transitions; re-run seed and create tests |
| `PurchaseOrderListItem` / `PurchaseOrderResponse` (new field) | list, get, create endpoints; client models | low: additive |
| `adapt-purchase-order-list` `statusTemplate` (context now `{ $implicit, size }`, was `compact`) | the page | low: default pill unchanged; `compact` was never read |
| `PurchaseOrderListItem` / `PurchaseOrder` client models (`allowedStatusIds`) | reducer's created-row mapping, page and reducer test fixtures | low: compile-checked |
| `a-info-tip` (new common component) | status control only | none |
| `apiErrorInterceptor` popup titles (422 → "Not allowed") | every 422 | none: the status call passes its own title |

## Deployment

None: no configuration or migration.

## Milestone records

### Milestone 1 — State machine and endpoint (closed)

- **Implemented:** the State pattern and context as the only status path; the Update Status endpoint
  with history rows; `allowedStatusIds` on rows and orders.
- **How to test:** `dotnet test`; in Swagger, PUT `/api/v1/purchase-orders/{id}/status` with
  `{"statusId": 20}` on a Pending order → 200 Confirmed; with 60 on a Pending order → 422.
- **Next:** Milestone 2 — Status control, `feat/purchase-order-management/update-purchase-order-status-control`.

### Milestone 2 — Status control (closed)

- **Implemented:** `adapt-status-control` (SM in the table, LG on cards) with `a-info-tip`; NgRx
  status-change actions and effects; the row updates in place with a success popup; a refusal keeps
  the row and shows "Status change not allowed" with the server's reason.
- **How to test:** see the item's How To Test in ADO.
- **Next:** AB#1468 Edit Purchase Order, primary branch
  `feat/purchase-order-management/edit-purchase-order` cut from this Story's primary branch.
