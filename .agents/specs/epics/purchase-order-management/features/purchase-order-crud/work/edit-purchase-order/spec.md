# Edit Purchase Order — Story spec (AB#1468)

User Story under Feature AB#1433 *Purchase Order CRUD* (Epic AB#1429), slug `edit-purchase-order`,
**8 points**. Primary branch: `feat/purchase-order-management/edit-purchase-order`, cut from AB#1470's
primary branch `feat/purchase-order-management/update-purchase-order-status` (stacked; one PR for the
Epic).

## What and why

A user corrects a Pending order before it is confirmed: its currency, notes and line items. Reference
and customer never change, and once an order leaves Pending it is immutable except for its status
(brief → *Purchase Order Edit*). The edit reuses the create form, so lookups, the 100-line limit and the
server-calculated totals behave the same in both.

## Acceptance criteria

### Editing

- **Given** a Pending order with lines A and B
- **When** the user changes A's quantity, removes B, adds C and saves
- **Then** the row's total and its expanded line items show the change, B is soft-deleted (`IsDeleted`
  = 1, `DeletedAt` set), A keeps its id, and C is a new line on the order
- **Given** a request whose lines match the persisted ones
- **When** it is saved
- **Then** no line-item row is written (no `LastModifiedAt` change), and the response is the unchanged row
- **Given** an edit with a new product (SKU and name)
- **Then** the product is normalised and created as on create; an existing product chosen by id is
  linked unchanged
- **Given** a currency or notes change only
- **Then** the order is updated and its lines are untouched

### Refusals

- **Given** zero or more than 100 lines, a quantity or price outside its range, an undefined currency,
  notes over 512 characters, a line id that is not one of the order's live lines, a line id sent twice,
  or an existing line whose product is changed
- **Then** 400 with a descriptive error code and nothing changes
- **Given** a Confirmed, Fulfilled or Cancelled order
- **When** a PUT is sent directly to the API
- **Then** 422 `PurchaseOrder.NotEditable` with the reason, and nothing changes
- **Given** an unknown or soft-deleted id
- **Then** 404 `PurchaseOrder.NotFound`; a malformed id is 400 `PurchaseOrder.InvalidId`

### Edit modal

- **Given** a Pending order
- **When** the user chooses Actions → Edit
- **Then** the edit modal opens with every line (up to 100), reference, customer (with email) and status
  shown read-only, currency and notes editable, and the server's totals
- **Given** the edit modal
- **Then** "Add line item" is disabled at 100 lines, an existing line's product is locked, and Save is
  disabled until something changed
- **Given** a non-Pending order
- **Then** Edit is shown disabled in its Actions menu and cannot be chosen
- **Given** a save
- **Then** the row updates in place, its cached line items reload if it is expanded, and a success
  popup confirms it; a refusal shows the error popup and keeps the modal open

## Step 1: Tracer bullet

| Element | New / changed | Layer / project / folder | Access | Stub behaviour |
|---|---|---|---|---|
| `PurchaseOrder.Revise(currency, notes, revisions)` returning a `Revision` (added and removed lines), and `LineRevision` (existing id or new product) | new | Domain `PurchaseOrders/` | public; reached after `PurchaseOrderStatusContext.EnsureEditable` | diff lines; recalc only when lines change |
| `PurchaseOrderErrors.UnknownLineItem`, `DuplicateLineItem`, `LineItemProductChanged` | new | Domain | public | 400 |
| `EditPurchaseOrderCommand` (+ validator, handler) | new | Application `PurchaseOrders/Edit/` | public / internal | `Result<PurchaseOrderListItem>` |
| `LineItemInput.Id` (optional) | changed | Application `PurchaseOrders/LineItems/` | public | create refuses it |
| `IPurchaseOrderRepository.FindForEditAsync` (tracked, live lines and products) | new | Domain interface / Infrastructure | public / internal | — |
| `isEditable` on list rows and the order response; customer `email` on the order response | new | Application | public | from the context / customer |
| `PUT /api/v1/purchase-orders/{id}` | new | Api | internal | behind the toggle |
| `PurchaseOrderForm` edit mode (`order` input) | changed | client `components/purchase-order-form/` | standalone | pre-filled, locked fields |
| `PurchaseOrdersApi.edit`, `orderEdited` action, line-items invalidation | new | client `services/`, `state/` | — | row in place |
| Actions → Edit (disabled unless `isEditable`) | changed | client page + `a-action-menu` (`disabled` item) | — | opens the modal |

The round hits when: a PUT reaches `Revise` through `EnsureEditable` and returns a row · removing a
line soft-deletes it through the existing `AuditInterceptor` path (no hard delete) · an unchanged
request leaves the change tracker with no modified line · the edit modal gets all lines from
`GET /{id}?maxResultCount=100` (the existing page cap equals the line cap) · the client reads
`isEditable` from the server rather than comparing status ids.

## Milestones

| # | Milestone | Branch | Complete when |
|---|---|---|---|
| 1 | Edit endpoint | `feat/purchase-order-management/edit-purchase-order-endpoint` | The brief's five edit unit tests and the refusal ACs pass; integration tests on real SQLite prove the soft-delete and the untouched lines |
| 2 | Edit modal | `feat/purchase-order-management/edit-purchase-order-modal` | Actions → Edit opens the pre-filled modal at desktop and mobile; save updates the row and its lines; client tests pass; design verify passes |

## Decisions where the plan sources are silent

- **Line identity.** A request line with `id` is an existing line; without one it is new. The order's
  live lines absent from the request are soft-deleted. An existing line keeps its product: to change a
  product, remove the line and add another (the create form already locks a chosen product). A request
  that names a different product for an existing line id is a 400.
- **"No changes written"** means an unchanged line's quantity and price are not reassigned, so EF Core
  marks nothing modified; the order's total is reassigned only when it differs.
- **Totals** are recalculated with `PurchaseOrderCalculator` whenever a line is added, removed or
  changed (api.md: "if line items have changed").
- **Editability comes from the server.** List rows and the order response carry `isEditable` from
  `PurchaseOrderStatusContext`, as `allowedStatusIds` does for status (AB#1470).
- **Non-Pending rows show Edit disabled**, as the `actions-open-locked` frames show; the AC's "Edit is
  not offered" is met by a disabled, unselectable item. Demo Mode does not enable it: the brief relaxes
  only the duplicate-reference and status guards in Demo Mode.
- **The modal loads the order** with `GET /{id}?maxResultCount=100`, so it always has every line; the
  list's 20-line cache is not used for editing.
- **The response** is the updated list row, so the client replaces the row in place; an expanded row's
  lines are dropped from the cache and reloaded.
- **Customer email** is added to the order response's customer, because the edit frame shows it under
  the locked customer field.

## Design

`design-fidelity-check: applies — the edit modal, its line-removed state and the locked Actions menu are
UI surfaces.` Fingerprints confirmed live 2026-10-23 (sweep of every purchase-order frame, zero drift).

| Screen · state · breakpoint | Citation | Page | Approval | Fingerprint |
|---|---|---|---|---|
| Purchase orders · edit-modal · desktop | `sales/purchase-orders/edit-modal/desktop` (`38:14423`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:1b0277ddc8bca9ce` |
| Purchase orders · edit-modal · mobile | `sales/purchase-orders/edit-modal/mobile` (`41:16954`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:f407db36f92e44f2` |
| Purchase orders · edit-modal-line-removed · desktop | `sales/purchase-orders/edit-modal-line-removed/desktop` (`38:15217`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:9fa865287deb8fae` |
| Purchase orders · edit-modal-line-removed · mobile | `sales/purchase-orders/edit-modal-line-removed/mobile` (`41:17381`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:36755d908dcfda8f` |
| Purchase orders · actions-open-locked · desktop | `sales/purchase-orders/actions-open-locked/desktop` (`32:3183`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:9078b1328bfe53e6` |
| Purchase orders · actions-open-locked · mobile | `sales/purchase-orders/actions-open-locked/mobile` (`34:6167`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:68a0228b1a094030` |

Where the design is silent (Save disabled until a change, the saving state, a refusal), the create
modal's states apply, so both modals behave alike.

## Functional impact

| Shared mechanism | Consumers (search) | Risk |
|---|---|---|
| `PurchaseOrderForm` (gains an edit mode) | create modal on the page; `purchase-order-form.spec.ts` | medium: create must be unchanged; its tests run unmodified |
| `LineItemInput` / `LineItemInputValidator` (optional `id`) | create command and validator | low: create refuses an `id`; create tests re-run |
| `LineItemProductResolver` | create handler | low: reused unchanged |
| `CustomerSummary` (gains `email`) | list query projection, order response, client models | low: additive |
| `PurchaseOrderListItem` / `PurchaseOrderResponse` (`isEditable`) | list, get, create, status endpoints; client models and fixtures | low: additive |
| `a-action-menu` (disabled items) | the list's Actions on every row | low: enabled items unchanged |
| `PurchaseOrderEndpoints` group (`PUT /{id}`) | `PUT /{id}/status`, `GET /{id}` | low: distinct method/route pairs |

Search: `rg "PurchaseOrderForm|LineItemInput|LineItemProductResolver|CustomerSummary|PurchaseOrderListItem|PurchaseOrderResponse|a-action-menu|MapPut" src client/src tests`.

## Deployment

None: no configuration or migration (soft-delete columns exist since AB#1466).

## Milestone records

### Milestone 1 — Edit endpoint (closed)

- **Implemented:** `PUT /api/v1/purchase-orders/{id}` per the Editing and Refusals ACs, behind the
  toggle; `isEditable` on rows and orders; the customer email on orders.
- **How to test:** `dotnet test`; in Swagger, edit a Pending order (change a quantity, drop a line,
  add one) → 200 with the new total; the dropped line has `IsDeleted = 1`; a Confirmed order → 422.
- **Assumptions:** an existing line's product is fixed (spec decision).
- **Next:** Milestone 2 — Edit modal.

### Milestone 2 — Edit modal (closed)

- **Implemented:** Actions → Edit (disabled unless `isEditable`) opens the form in edit mode with every
  line; locked reference, customer (with email) and status; *Save changes* waits for a change; the row
  updates in place and its expanded lines reload; a refusal keeps the modal open with the error popup.
- **How to test:** see the item's How To Test in ADO.
- **Next:** AB#1469 Delete Purchase Order, primary branch
  `feat/purchase-order-management/delete-purchase-order` cut from this Story's primary branch.
