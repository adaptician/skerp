# Purchase Order State Machine — Feature plan (AB#1436)

## Outcome

A user can move an order through its lifecycle from the list grid:

- Pending → Confirmed or Cancelled;
- Confirmed → Fulfilled or Cancelled.

Fulfilled and Cancelled are terminal, and every change is recorded additively for audit. The backend is
the only authority on transitions. In Demo Mode, every status is offered so a reviewer can watch the
backend refuse an invalid one.

## Decision boundary

**In scope**

- **The state machine:** the GoF State pattern in the Domain, with one class per status implementing
  `IPurchaseOrderState`, and `PurchaseOrderStatusContext`. The context guards transitions, edits and
  deletes, and becomes the single path for every status assignment, including:
  - the initial Pending set on create (AB#1466). A create request may only carry Pending; anything
    else is a 400 invalid request ([`asmp-1453-create-initial-status`](../../../../../assumption-ledger/asmp-1453-create-initial-status.md));
  - the Pending guards on edit and delete (AB#1468, AB#1469).
- **The Update Status endpoint** (PUT, id plus statusId). It appends a `PurchaseOrderStatusChanges` row
  for each successful change and updates `CurrentStatusId`. Refusals carry a descriptive error and leave
  the status unchanged.
- **The editable status dropdown in the list grid**, which triggers the update on change:
  - with Demo Mode off, only valid next statuses, and a terminal status renders as a pill;
  - with Demo Mode on, all statuses plus an info icon carrying the brief's tooltip text.
- **Unit tests** covering every transition the brief lists, plus the endpoint's refusals.

**Out of scope**

- A status-history view in the UI. History is persisted for audit only.
- Bulk status changes, and statuses beyond the four in `entities.md`.
- The CRUD capability itself (AB#1433).

## Evidence

| Claim | Tier | What settles it |
|---|---|---|
| The client shows the valid next statuses without mirroring the transition table | derived | Settled by AB#1470: list rows and the order response carry `allowedStatusIds` from `PurchaseOrderStatusContext`; the client never holds a copy of the rules |
| Approved status-control frames (normal and Demo Mode) exist | demonstrated | Six frames indexed and approved (Tyler Pieterse, 2026-10-22), fingerprints confirmed live 2026-10-23 (AB#1470 spec) |

## Work-item decomposition

| ADO | Type | Primary slug | Points | Adds |
|---|---|---|---|---|
| AB#1470 | User Story | `update-purchase-order-status` | 8 | State classes and `PurchaseOrderStatusContext`, transition rules, the Update Status endpoint with additive history, the status dropdown in the grid, and unit tests |

**Order.** After AB#1467 (List), and before AB#1468 (Edit) and AB#1469 (Delete), so that their Pending
guards use the context.

## Observable proof

- **Positive:** confirm a Pending order, then fulfil it. The status updates, and three history rows exist.
- **Negative:**
  - With Demo Mode on, choosing Fulfilled for a Pending order shows the transition error in the popup,
    and the status stays Pending.
  - A Cancelled order shows as a pill.
  - A direct API request to change a Cancelled order's status, or to edit or delete it, is refused.

## Completion boundary

- No code path sets `CurrentStatusId` except through `PurchaseOrderStatusContext`.
- All 16 (from, to) status pairs are covered by tests.
- The status control passes the design verification bar at desktop and mobile, in both Demo Mode states.
