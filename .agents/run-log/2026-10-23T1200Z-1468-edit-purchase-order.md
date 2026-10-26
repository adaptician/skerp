---
work-item: AB#1468
summary: Edit a Pending purchase order — line diffing with soft deletes, then the edit modal.
---
# AB#1468 Edit Purchase Order

## Planning

- 8 points, one-page spec. The Feature plan's `assumed` row "the creation form can be reused in edit
  mode without restructuring" was settled as `derived` by reading the built form (one component, inputs
  and a `FormArray` of line groups). No open assumptions or Provisional ADRs apply.
- No remote branch existed for `edit-purchase-order` (checked with `git ls-remote --heads devops`).

## Milestone 1 — Edit endpoint

### What changed

- Domain: `PurchaseOrder.Revise(currency, notes, lines)` checks `EnsureEditable` itself, validates every
  line before changing any, updates kept lines only when quantity or price differ, adds new lines,
  removes absent ones, and recalculates the total only when a line changed. It returns a `Revision`
  (added and removed lines). `PurchaseOrderLineItem.Revise`; errors `UnknownLineItem`,
  `DuplicateLineItem`, `LineItemProductChanged`.
- Application: `EditPurchaseOrderCommand` (+ validator, handler). The handler checks editability before
  resolving products, so a refused edit never creates a product. Create now refuses a line `id`.
- Persistence: `FindForEditAsync` (tracked, live lines with products, split query) and `SaveRevision`
  (adds new lines, removes old ones; the audit interceptor turns the removal into a soft delete).
- API: `PUT /api/v1/purchase-orders/{id}` (id bound as text for a descriptive 400), behind the toggle.
- Responses: `isEditable` on list rows and the order response; the customer summary carries `email`.
- Tests: 13 new unit test cases (the brief's five edit tests, refusals, create guard) and 9 new
  integration test cases on SQLite (soft delete with `DeletedAt`, untouched lines keep
  `LastModifiedAt`, 422 with no product created, foreign line id, changed product, line counts, 404/400,
  email and `isEditable` on get).
- Functional impact re-checks: create (unit and integration tests unchanged and passing, plus the
  line-id guard); list and status endpoints (their tests pass with the new fields); `CustomerSummary`
  consumers updated (`CreatePurchaseOrderTests`).
- design-fidelity-check verify: not applicable — no UI surface in this milestone.

### What surprised you

- The tracer could not hold stub bodies: warnings-as-errors rejects unread primary-constructor
  parameters, so the path was committed with its behaviour (11c3627) rather than as an empty skeleton.
- A line added to an already-tracked order has a client-generated GUID key, so EF Core's change
  detection took it for an existing row and issued an UPDATE (0 rows, `DbUpdateConcurrencyException`).
  The repository now adds new lines explicitly, which keeps the fix local to the edit path rather than
  changing key generation for every audited entity in the model.
- Rule 2 keeps the typed casing ("salted kettle chips"); only whitespace is normalised.

### What you assumed

- An existing line's product is fixed: a different product id for an existing line id is a 400
  (spec decision).

### Conformance review (subagent; gate green, no blocking findings)

- Advisories addressed: integration cases for every edit 400 (undefined currency, long notes,
  duplicate line id, quantity, price, a soft-deleted line id), each asserting the order row, its total
  and every line stamp are unchanged; the unchanged request now also checks the order row; a
  currency-and-notes-only edit leaves the lines alone; a new line for an existing product leaves the
  product row untouched; spec tracer row and run-log wording corrected.
- Noted, not changed: api.md's Edit example sends a product's id, SKU and name together, which the
  shared line validator refuses (`Product.Ambiguous`), as on create (`asmp-1466-customer-id-precedence`).
- A soft-deleted order returning 404 is covered once delete exists (AB#1469).

## Milestone 2 — Edit modal

### What changed

- `PurchaseOrderForm` gained an `order` input and `edited` output. Edit mode: title "Edit purchase
  order", reference (pill) and customer (name, email helper) locked in dashed read-only fields, status
  locked with "Change the status from the purchase-order list.", lines pre-filled with server totals
  and their product locked, *Save changes* disabled until the request differs from the loaded order.
  Create mode is unchanged (its 21 tests pass unmodified).
- `a-action-menu` items may be `disabled` (muted with `--color-text-disabled`, skipped by the arrow
  keys); the page offers View and Edit, Edit disabled unless `isEditable`.
- `PurchaseOrdersApi.getForEdit` (all lines) and `edit`; `orderEdited` replaces the row and drops its
  cached lines; `reloadLinesAfterEdit` reloads an expanded row's lines.
- Client models carry `isEditable` and the customer email. 7 new client tests (119 in total).
- Functional impact re-checks: create modal (its spec unchanged and passing; opened in the browser);
  `a-action-menu` on every row (View still expands; arrow keys skip a disabled item); the list and
  status control with the new model fields (their tests pass).
- design-fidelity-check verify (light, Sales):

| Frame | L1 tokens | L2 inventory | L3 visual | L4 mechanism |
|---|---|---|---|---|
| `edit-modal/desktop` (38:14423) | pass (readonly dashed border, surface-sunken, lock icons, pill reference) | pass (title, locked rows, helpers, line columns, Save changes) | pass, screenshot side by side | pass (edit saved, row total updated, success popup) |
| `edit-modal/mobile` (41:16954) | pass | pass (stacked locked fields, line cards) | pass at 375, screenshot | pass |
| `edit-modal-line-removed/desktop` (38:15217) | pass | pass ("n of 100", server total) | **unverified** — the browser stopped rendering screenshots | pass (€ 1 665.41 → € 946.21 from the server) |
| `edit-modal-line-removed/mobile` (41:17381) | pass | pass | **unverified** | pass |
| `actions-open-locked/desktop` (32:3183) | pass (`--color-text-disabled`) | pass for View and Edit; Delete arrives with AB#1469 | **unverified** | pass (Edit disabled, not selectable) |
| `actions-open-locked/mobile` (34:6167) | pass (same component, kebab trigger) | as desktop | **unverified** | pass |

L3 for the unverified rows is a human sign-off step in AB#1468's How To Test.

### What surprised you

- Rendering a 100-line order in jsdom takes about 11 s, so that one test has a 30 s timeout.

### What you assumed

- Demo Mode does not enable Edit on a locked order (spec decision).

### Conformance review (subagent; gate green)

- The one blocking item asked for the human L3 sign-off step; it is in AB#1468's How To Test (rev 5),
  naming 38:15217, 41:17381, 32:3183 and 34:6167.
- Advisories addressed: one edit load at a time (a second Edit while loading, or while the modal is
  open, is ignored), so the form can never show one order's lines under another's reference;
  disabled menu items now stay focusable with `aria-disabled`, are inert when chosen, and carry their
  reason (title and visually hidden text), per WAI-ARIA menu practice; the create form's status lock
  keeps `field__icon`; tests for the expanded-row reload (and none when collapsed), the success popup,
  the load race and the disabled menu item (123 client tests).

### Later visual check (during AB#1469)

- Browser screenshots worked again: `edit-modal-line-removed/desktop` (38:15217) and
  `actions-open-locked/desktop` (32:3183) now pass L3 side by side. The two mobile states stay on the
  human sign-off step.

