# Purchase Order CRUD — Feature plan (AB#1433)

## Outcome

A sales user can manage customer purchase orders end to end from the "Purchase Orders" screen:

- **create** an order with line items in a modal, with live reference, customer and product lookups and
  server-calculated totals;
- **view** a paginated list, newest first, searchable by reference and filterable by customers, status
  and created-date range, and expand any order to lazily load its line items;
- **edit** a Pending order's currency, notes and line items;
- **delete** a Pending order after confirming.

The backend enforces every rule. Demo Mode shows reviewers that the client's conveniences are never what
protects the data.

## Decision boundary

**In scope**

- **Persistence:** every entity in [`entities.md`](../../entities.md), with:
  - the `MinimumAudit` base, stamped in UTC per transaction;
  - explicit configurations, soft-delete query filters, and `NOCASE` collation on Name and Sku;
  - filtered unique indexes on `IsDeleted = 0`, explicit delete behaviour and the decimal precisions;
  - a tooling-generated migration and demo seed data.
- **Domain rules:** `ReferenceNormalizer` and `SkuNormalizer` (rule 1), the name normaliser (rule 2), and
  `PurchaseOrderCalculator`.
- **Product owner decisions (2026-10-22):**
  - an order holds 1 to 100 line items, enforced on the client and the server, on create and edit
    ([`asmp-1434-line-item-limit`](../../../../../assumption-ledger/asmp-1434-line-item-limit.md));
  - a create request may only carry the Pending `statusId`; any other value is a 400 invalid request,
    and the form shows status as a fixed Pending
    ([`asmp-1453-create-initial-status`](../../../../../assumption-ledger/asmp-1453-create-initial-status.md)).
- **Endpoints** from [`api.md`](../../api.md): create, calculate, list, get by id (lazy line items),
  edit, delete, and the reference, customer and product lookups.
- **UI:** the list screen and grid, search and filters, expandable rows, empty state, the create and edit
  modals, the Actions dropdown with Edit and a danger-styled Delete, and the delete confirmation modal.
- **Demo Mode:** the creation Save button behaviour (disabled, or enabled and danger-highlighted with the
  brief's note).
- **Tests:** every minimum unit test the brief lists for normalisation, the calculator, creation, edit
  and delete, and integration tests on real SQLite.

**Out of scope**

- **Status transitions after creation**, the state classes and `PurchaseOrderStatusContext`, the Update
  Status endpoint and the status dropdown. These belong to Purchase Order State Machine (AB#1436).
- **A price-range filter.** The product owner removed it from scope on 2026-10-22
  ([`asmp-1433-list-price-range-filter`](../../../../../assumption-ledger/asmp-1433-list-price-range-filter.md)).
- **Live updates over SignalR.** No requirement here needs push.
- **Tax, currency conversion and concurrency safety** (excluded by the Deliverable).
- **Restoring soft-deleted orders or lines**, editing an existing customer's email, and merging customers
  or products.

## Evidence

| Claim | Tier | What settles it |
|---|---|---|
| SQLite (EF Core) cannot natively order or filter on `decimal` or `DateTimeOffset`, so a supported mapping is needed | derived | EF Core SQLite provider limitations; proven by the first tracer bullet of AB#1466 on real SQLite |
| The creation form can be reused in edit mode without restructuring | derived | Settled by planning AB#1468 (2026-10-23): the form is one component with inputs and a `FormArray` of line groups; an `order` input pre-fills it and locks reference and customer |
| Approved list, create, edit and confirmation frames exist | demonstrated | Indexed and approved (Tyler Pieterse, 2026-10-22); fingerprints confirmed live 2026-10-23 |

## Work-item decomposition

| ADO | Type | Primary slug | Points | Adds |
|---|---|---|---|---|
| AB#1466 | User Story | `create-purchase-order` | 21 | Persistence and migration; normalisers and `PurchaseOrderCalculator`; create, calculate and lookup endpoints; the list screen shell; the create modal with lookups and Demo Mode save behaviour; unit tests |
| AB#1467 | User Story | `list-purchase-orders` | 13 | List and get-by-id endpoints with validation; the paginated grid, search and filters; lazily loaded line items; unit and integration tests |
| AB#1468 | User Story | `edit-purchase-order` | 8 | Edit endpoint with line-item diffing, soft-delete and recalculation; the edit modal; unit tests |
| AB#1469 | User Story | `delete-purchase-order` | 3 | Soft-delete endpoint with its line-item cascade; the danger Delete action and confirmation modal; unit tests |

**Order.** AB#1466 comes first, because it creates the schema, the domain rules and the screen everything
else sits on. AB#1467 comes next. Then the State Machine Story (AB#1470), so that the Pending guards in
AB#1468 and AB#1469 go through `PurchaseOrderStatusContext` from the start. Then AB#1468 and AB#1469.
Until AB#1470 lands, AB#1466 sets the initial Pending status directly; AB#1470 routes it through the
context.

## Observable proof

- **Positive:**
  - Create an order with a new customer and two new products. It appears first in the list as Pending,
    with server totals.
  - Search `po-2026-001` and it finds `PO-2026-001`. Filter by two customers and Pending, then expand an
    order with more than 20 line items and load more.
  - Edit it: remove a line and add one, and the totals recalculate.
  - Delete another Pending order after confirming. The order and its lines are soft-deleted, and its
    customer and products remain.
- **Negative:**
  - With Demo Mode on, saving a duplicate reference shows `PurchaseOrder.DuplicateReferenceNumber`, and
    nothing is created.
  - 11 customer ids, a malformed GUID, 101 line items, or a create request with a non-Pending
    `statusId` each return 400.
  - A direct PUT or DELETE on a Confirmed order is refused with a descriptive error.
  - A soft-deleted order never appears in the list.

## Completion boundary

- Totals are never accepted from a request. Create, calculate and edit all use `PurchaseOrderCalculator`,
  and the client computes no total.
- The UI never re-implements normalisation.
- No hard delete exists in any purchase-order path.
- Every screen and modal passes the design verification bar (`.agents/standards/design.md`) at desktop
  and mobile.

## As-built notes (coherence review, 2026-10-23)

Recorded so the next Epic copies a documented contract rather than an accident:

- **Response shapes.** Create and get return `PurchaseOrderResponse` (with lines); list, status, and
  edit return the list row (`PurchaseOrderListItem`) so the client replaces the row in place; delete
  answers **204 with no body** — the one `/api/v1` success without the Result envelope (HTTP forbids a
  204 body); `ApiClient.delete` accepts it.
- **Calculate is `POST /purchase-orders/calculate`**, not the `GET` that `api.md` shows: the request
  carries a list of lines, which does not fit a query string.
- **Customer and product lookups sit behind `Feature_PurchaseOrders`.** They exist only for this screen
  today; a future Customers or Products Epic should give them their own toggle.
- **Concurrency is out of scope** (Deliverable), and the state machine's "terminal is final" guarantee
  relies on it: two simultaneous changes to one Pending order can both pass the guard. Adding a
  concurrency token later means a migration and a 409 path in the client.
- **The brief's delete tests** are integration tests on SQLite (`DeletePurchaseOrderEndpointTests`) plus
  the domain guard test, rather than handler unit tests: the behaviour under test is the soft delete
  in persistence.
- **The release toggle ships off.** Turning it on per environment is a deployment decision.
