---
work-item: 1470
summary: >
  GoF State machine for purchase-order statuses with PurchaseOrderStatusContext as the only path to a
  status, the Update Status endpoint with history rows, then the list's status control.
---
# Update purchase order status

## Milestone 1 — State machine and endpoint

### What changed

- `IPurchaseOrderState` with `PendingState`, `ConfirmedState`, `FulfilledState`, `CancelledState`
  (next statuses, terminal, edit and delete permissions), and `PurchaseOrderStatusContext`
  (`For`, `ChangeTo`, `EnsureEditable`, `EnsureDeletable`, `AllowedTransitions`).
- `PurchaseOrder.RecordStatus` now requires a `StatusTicket` that only the context issues; create's
  initial Pending and the demo seed both go through the context (the seed reaches every status by
  valid transitions).
- `PUT /api/v1/purchase-orders/{id}/status` returns the updated list row; refusals are 422
  `PurchaseOrder.InvalidStatusTransition` with the reason; an undefined status or malformed id is
  400; an unknown id 404.
- List rows and the order response carry `allowedStatusIds` from the context, so the client never
  mirrors the rules (settles the Feature plan's `assumed` evidence row).
- Tests: 24 new unit test cases (all 16 pairs, history, edit/delete guards), 7 new integration test cases.
- Functional impact re-checks: `CreatePurchaseOrderTests`, `PurchaseOrderTests`, the persistence and
  seeder tests all pass with the context in the create path; the seed still covers every status.
- design-fidelity-check verify: not applicable — no UI surface in this milestone.

### What surprised you

- `Error` does not convert to a non-generic `Result` implicitly; the context wraps with
  `Result.Failure`.
- `StatusTicket`'s constructor is `internal`, so Infrastructure (which sees Domain internals for audit
  stamping) could still forge one; the seeder deliberately uses the context instead.

### What you assumed

- Choosing the current status is one of the 12 refused pairs ("already Pending").

## Milestone 2 — Status control

### What changed

- `adapt-status-control` (Field/StatusSelect + Menu/SelectPanel): 120px outline trigger with the
  status pill, 32px in the table and 44px on cards; open state 2px focus border plus ring; 232px
  panel of 44px options. Demo Mode off: only `allowedStatusIds`, a plain pill when there are none.
  Demo Mode on: all four, current ticked and bold on surface-selected, each with an info icon.
- `a-info-tip` (common): Icon/Info + Overlay/Tooltip (inverse surface, 304px, caption text, arrow),
  shown on hover and focus, Escape hides it without closing the panel; fixed-positioned and clamped
  16px inside the viewport.
- NgRx: `statusChangeRequested` / `statusChanged` / `statusChangeFailed`, `statusChanging` ids (the
  trigger is disabled with a spinner meanwhile), `changeStatus` effect (PUT, error title "Status
  change not allowed") and a success popup ("Status updated · PO-… is now Confirmed.").
- `statusTemplate` context is `{ $implicit, size }`.
- 11 new client tests (109 in total).
- design-fidelity-check verify (light, Sales), with browser screenshots:

| Frame | L1 tokens | L2 inventory | L3 visual | L4 mechanism |
|---|---|---|---|---|
| `status-control/desktop` (31:2084) | pass (border-strong, surface-raised, SM 32, radius md; panel surface-raised, border, dropdown elevation) | pass | pass side by side (trigger x=915 as in the frame, panel 232 wide) | pass (Pending → Confirmed, row in place, success popup) |
| `status-control-demo-mode/desktop` (31:2657) | pass (surface-selected current, primary check, info icons, inverse tooltip) | pass | pass (tooltip clamped inside the viewport where the frame's runs past the edge) | pass |
| `status-control/mobile` (33:5727) | pass (LG 44px) | pass (Cancelled and Fulfilled as pills) | pass at 375 and 576 | pass |
| `status-control-demo-mode/mobile` (34:5650) | pass | pass | pass at 576 | pass |
| `error/desktop`, `error/mobile` (32:4151, 34:6575) | pass (Feedback/ErrorPopup) | pass ("Status change not allowed" + server reason) | pass desktop | pass (row stays Pending) |

### What surprised you

- A `z-index` on the info-tip host (to lift it over the row-wide click target) made each option a
  stacking context, so the next option's icon painted over the tooltip. DOM order already lifts it;
  the z-index was removed.

### What you assumed

- Terminal rows get the full control in Demo Mode (spec decision; the frames show them as pills).
- The success popup's wording ("Status updated") — the design has no status-success frame; it
  follows the create popup's pattern.


## Conformance review fixes

### What changed

- Review (subagent, gate green, no blocking findings) advisories addressed: the seeder throws on an
  invalid status path instead of discarding the result; under a status filter, a row that moves to
  another status reloads the page (`reloadAfterStatusChange`), as create already does; an API test
  pins the "Status change not allowed" title and the server's reason through the interceptor; a
  hover test for the info tooltip; spec wording for `RecordStatus` (internal, ticket-guarded) and the
  Feature plan's evidence rows brought up to date; `current-focus.md` moved to Epic AB#1429.

### What you assumed

- The `StatusTicket` guard stays convention-held against Infrastructure (which sees Domain internals
  for audit stamping); making it compiler-held would need a Domain-only factory and an architecture
  test, more than this Story needs.
