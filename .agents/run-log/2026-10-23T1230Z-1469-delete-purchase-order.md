---
work-item: AB#1469
summary: Soft-delete a Pending purchase order behind a confirmation; shared confirm modal.
---
# AB#1469 Delete Purchase Order

## Planning

- 3 points: no spec; AC, How To Test, decisions and functional impact are in the ADO item. No open
  assumptions or Provisional ADRs apply. No remote branch existed for `delete-purchase-order`.

## What changed

- API: `DELETE /api/v1/purchase-orders/{id}` → 204 (no body), behind the toggle;
  `DeletePurchaseOrderCommand` checks `EnsureDeletable` (422 `PurchaseOrder.NotDeletable`), then
  `IPurchaseOrderRepository.Remove` marks the order and its live lines deleted, which the audit
  interceptor turns into soft deletes. Customer, products and status history are untouched.
- `isDeletable` on list rows and the order response, from the context.
- Client: `ApiClient.delete` accepts an empty 2xx body (204) as success — only `delete`; every other
  call still refuses an empty body. `PurchaseOrdersApi.deleteOrder`; `orderDeleted` reloads the page
  (stepping back from an emptied last page) and drops the row's cached lines.
- `a-confirm-modal` (Overlay/ConfirmModal): `alertdialog` named by the title and described by the
  message; Cancel focused first; Escape cancels; Tab trapped; busy disables both buttons. 440px dialog
  from lg, bottom sheet with handle and stacked buttons (confirm first) below.
- Actions gain a danger Delete after a divider, disabled with its reason unless `isDeletable`.
- `.button--danger` is now the plain Button/Danger fill; the Demo Mode Save's inset ring moved to
  `.button--danger-ring` (the create form applies both).
- Tests: 7 integration test cases (soft delete only with `DeletedAt`, customer/products/history kept,
  excluded from list, 404 for GET/PUT/DELETE/status after delete, 422 for Confirmed and Cancelled,
  404/400, `isDeletable` on rows); 11 client tests (confirm modal, page delete/cancel/refusal/disabled,
  reducer page step-back, ApiClient 204) — 134 client tests in total.
- Functional impact re-checks: Demo Mode Save still shows the danger fill and the 3px
  `danger-muted` inset ring (DOM, computed styles); `a-action-menu` on every row (View, Edit, Delete,
  divider); list/get/create/status/edit responses (their tests pass with `isDeletable`).
- design-fidelity-check verify (light, Sales):

| Frame | L1 tokens | L2 inventory | L3 visual | L4 mechanism |
|---|---|---|---|---|
| `delete-confirm/desktop` (32:3685) | pass (surface-raised, xl radius, modal elevation, danger-muted disc, danger fill, display title) | pass | pass, screenshot side by side | pass (confirm → 204, row gone, 31 → 30, popup) |
| `delete-confirm/mobile` (34:6380) | pass | pass (handle, centred, Delete above Cancel, 44px) | pass at 375, screenshot | pass |
| `actions-open-locked/desktop` (32:3183) | pass (`--color-text-disabled`, divider) | pass (View, Edit, Delete) | pass, screenshot | pass (Delete inert with reason) |
| `actions-open-locked/mobile` (34:6167) | pass (same component) | pass | **unverified** — human sign-off step | pass |

## What surprised you

- A template reference named `#cancel` shadowed the component's `cancel()` method, and the Angular
  compiler reported it as a template error; renamed to `#cancelButton`.
- 204 cannot carry the Result envelope, so `ApiClient.delete` needed an empty-body path.

## What you assumed

- After a delete the page reloads rather than removing the row locally, so it stays full and the
  pager stays right (ADO decision).

## Conformance review (subagent; gate green)

- Blocking (documentation): the ADO Functional impact table lacked the shared `ApiClient.delete`
  change. Added: consumers by `rg "\.delete\(" client/src` → `PurchaseOrdersApi.deleteOrder` only;
  re-check: `api-client.spec` proves a 204 delete succeeds and an empty body still fails every other
  call. Risk nil.
- Advisories addressed: a refused delete reloads the page so a stale row refreshes; the create form's
  Demo Mode Save test pins `button--danger-ring`; `a-confirm-modal` handles Escape and Tab on the scrim
  (focus that drifted off the dialog), keeps focus on the dialog while busy and on a click in its
  padding; the `isDeletable` list test creates its own Pending and Confirmed orders.

## Coherence review of the Epic (subagent, fresh context; gate green)

- Verdict: coherent, with concerns. Fixed here: the Demo Mode save note no longer shows in the edit
  modal; the initial status is read from `PurchaseOrderStatusContext.InitialStatus` by the create
  validator; a refused status change reloads the page (a refusal can mean a stale row). Recorded in the
  CRUD Feature plan's as-built notes: response shapes and the 204 exception, Calculate as POST, the
  lookups behind the purchase-order toggle, concurrency left out, delete tests as integration tests.
- Raised with the human: the release toggle ships off on merge (a deployment decision), and the design
  verify ran per milestone (run logs), not again in the review session.
