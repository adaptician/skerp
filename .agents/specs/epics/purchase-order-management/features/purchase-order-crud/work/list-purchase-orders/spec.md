# List Purchase Orders — Story spec (AB#1467)

User Story under Feature AB#1433 *Purchase Order CRUD* (Epic AB#1429), slug `list-purchase-orders`,
**13 points** (depth-ladder size limit suspended; see
[`current-focus.md`](../../../../../../../context/current-focus.md)). Primary branch:
`feat/purchase-order-management/list-purchase-orders`, cut from AB#1466's primary branch
`feat/purchase-order-management/create-purchase-order` (stacked; one PR for the Epic).

## What and why

The Purchase Orders screen lists every order, newest first, ten to a page. The user narrows it by
reference, customers, status and created date, and expands any order to read its line items, twenty
at a time. Every amount is the server's. This is the screen every later Story (status, edit, delete)
acts on.

## Acceptance criteria

### First page

- **Given** 15 orders exist
- **When** the user opens Purchase Orders
- **Then** 10 are shown newest first with reference (pill), customer, currency symbol and total, status
  pill, created date (local, date only) and an Actions button
- **And** the pager reports 15 in total

### Search and filter

- **Given** the user searches ` po-2026-001 `
- **Then** PO-2026-001 is found and the list returns to page 1
- **Given** two customers and status Pending are selected
- **Then** only Pending orders for those customers are shown
- **Given** a created-date range
- **Then** only orders created within it (inclusive, local dates) are shown; a start after its end is
  flagged and not applied
- **Given** 10 customers are selected
- **Then** no more can be selected and a hint explains the limit
- **Given** any filter is set
- **When** the user selects *Clear filters*
- **Then** every filter is cleared and page 1 of all orders is shown

### Line items

- **Given** an order with 25 line items
- **When** its row is expanded (or Actions → View)
- **Then** 20 load with server sub-totals, and *Load more line items* fetches the last 5

### Refusals and empty

- **Given** 11 customer ids, maxResultCount 101, a sort field that does not exist, or a malformed GUID
- **Then** the API answers 400 with a descriptive error code; an unknown id answers 404
  `PurchaseOrder.NotFound`
- **Given** no order matches
- **Then** the empty placeholder is shown with *Clear filters*
- **Given** an order is soft-deleted
- **Then** it never appears in the list and its id answers 404

### Responsive

- **Given** a viewport below 992px
- **Then** each order is a card, filters open in a sheet from a *Filters* button that shows the active
  filter count, and at 576px and 375px there is no horizontal page scroll

### Creating updates the list

- **Given** the user creates an order on page 1 with no filters
- **Then** it appears first in the list without a reload, and the total grows by one

## Step 1: Tracer bullet

| Element | New / changed | Layer / project / folder | Access | Stub behaviour |
|---|---|---|---|---|
| `PurchaseOrderListCriteria`, `PurchaseOrderSortField` | new | Domain `PurchaseOrders/` | public records/enums | — |
| `IPurchaseOrderRepository.ListAsync`, `FindByIdAsync`, `ListLineItemsAsync` | changed | Domain interface, Infrastructure implementation | public / internal | EF Core queries |
| `ReferenceNormalizer.NormalizeSearch` | new | Domain `Shared/Normalization/` | public static | rule 1 for a partial reference |
| `ListPurchaseOrdersQuery` (+ validator, handler, `PurchaseOrderListItem`, `PagedResponse<T>`) | new | Application `PurchaseOrders/List/` | public / internal | `Result<PagedResponse<…>>` |
| `GetPurchaseOrderQuery` (+ validator, handler) | new | Application `PurchaseOrders/Get/` | public / internal | `Result<PurchaseOrderResponse>` with a page of lines |
| `POST /purchase-orders/list`, `GET /purchase-orders/{id}` | new | Api `Endpoints/PurchaseOrderEndpoints` | internal | behind the toggle |
| `purchase-orders` NgRx feature (actions, reducer, selectors, effects) | new | client `features/purchase-orders/state/` | exported via `index.ts` | query → load → results |
| `adapt-purchase-order-table`, `adapt-purchase-order-cards`, `adapt-line-items-panel`, `adapt-purchase-order-filters`, `a-pagination`, `a-menu-button` | new | client feature `components/`, common `components/` | standalone | inputs/outputs only |

The round hits when: the page dispatches one query, the effect calls `POST /list` through
`PurchaseOrdersApi`, and the reducer renders 10 rows · filters, paging and sorting all travel as one
`PurchaseOrderListQuery` · expanding a row loads `GET /{id}` · the architecture tests still pass.

## Milestones

| # | Milestone | Branch | Complete when |
|---|---|---|---|
| 1 | List and get endpoints | `feat/purchase-order-management/list-purchase-orders-endpoints` | Both endpoints answer per the AC with validation and soft-delete exclusion; unit and integration tests on real SQLite pass |
| 2 | Grid | `feat/purchase-order-management/list-purchase-orders-grid` | Table (≥ lg) and cards (< lg), pagination, sorting on Created, loading, empty and error states, lazy line items and Actions → View work in the browser; client tests pass |
| 3 | Filters | `feat/purchase-order-management/list-purchase-orders-filters` | Reference search, customer multi-select (max 10), status, created range, clear, and the mobile filter sheet work; design verify passes |

## Decisions where the plan sources are silent

- **The list carries no line items.** `api.md`'s response shows them, but the brief lazy-loads them on
  expand; the list item carries `lineItemCount` instead (the cards show "3 line items").
  `GET /{id}?skipCount&maxResultCount` returns the order with one page of lines and `lineItemCount`.
  Both paging parameters are optional on the get (`skipCount` defaults to 0, `maxResultCount` to 20):
  a plain `GET /{id}` is the natural single-order read for Edit (AB#1468).
- **Line order.** Lines have no position column (`entities.md`); a page orders them by creation time,
  then SKU, so the order is stable.
- **Search** matches any part of the reference, after rule 1 (trim, upper-case, allowed characters;
  any length from 1). `po-2026` finds every 2026 order.
- **Sorting** accepts `reference`, `customer`, `total`, `status`, `createdAt`, each `asc` or `desc`
  (case-insensitive); default `createdAt desc`. Ties sort by reference. The UI sorts by Created only,
  as the design shows; the API is ready for the rest.
- **Dates.** `createdMin` and `createdMax` are instants (ISO 8601 with offset). The client sends the
  user's local start of the first day and end of the last day, so "created on 22 Oct" means the
  user's 22 Oct. `createdMin` after `createdMax` is a 400.
- **Malformed GUIDs.** A malformed `customerIds` entry fails JSON binding (400 `General.BadRequest`);
  a malformed `{id}` in the path is a 400 `PurchaseOrder.InvalidId` rather than a routing 404.
- **Actions in this Story** hold *View* only (expands the row). Edit (AB#1468) and Delete (AB#1469)
  add theirs.
- **Failure to load** shows the error popup (interceptor) and, in the table body, the empty-state
  layout with a warning icon and *Try again* — the design has no list-failure frame.
- **The mobile filter sheet's** primary button reads "Show N orders" with N from a count query
  (`maxResultCount: 1`) for the pending filters.
- **Creating** prepends the server's order to page 1 when no filter is active; otherwise it reloads
  the current page, so a filtered list never shows an order outside its filters.

## Design

`design-fidelity-check: applies — the grid, cards, filters, pagination and their states are UI
surfaces.` All frames confirmed live 2026-10-23 with fingerprints matching the index.

| Screen · state · breakpoint | Citation | Page | Approval | Fingerprint |
|---|---|---|---|---|
| Purchase orders · list · desktop | `sales/purchase-orders/list/desktop` (`28:316`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:a4a608ba5f90c4e0` |
| Purchase orders · list · lg | `sales/purchase-orders/list/lg` (`32:4605`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:feb56f0b58133469` |
| Purchase orders · list · md | `sales/purchase-orders/list/md` (`32:5047`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:c216c36c24612c42` |
| Purchase orders · list · mobile | `sales/purchase-orders/list/mobile` (`33:4809`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:156c780ae0409b46` |
| Purchase orders · row-expanded · desktop | `sales/purchase-orders/row-expanded/desktop` (`30:714`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:5987433fc83d445e` |
| Purchase orders · row-expanded · mobile | `sales/purchase-orders/row-expanded/mobile` (`33:4988`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:2e7f7ee8efa4147c` |
| Purchase orders · filters-open · desktop | `sales/purchase-orders/filters-open/desktop` (`30:1309`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:0e85236a100a1f2e` |
| Purchase orders · filters-open · mobile | `sales/purchase-orders/filters-open/mobile` (`33:5228`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:c8b23deb0ea7d637` |
| Purchase orders · empty · desktop | `sales/purchase-orders/empty/desktop` (`30:1978`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:a20a0e85422a6624` |
| Purchase orders · empty · mobile | `sales/purchase-orders/empty/mobile` (`33:5551`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:23d8e2834581f69a` |
| Purchase orders · loading · desktop | `sales/purchase-orders/loading/desktop` (`31:1797`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:b97447ec755689c6` |
| Purchase orders · loading · mobile | `sales/purchase-orders/loading/mobile` (`33:5628`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:fa23ec23819931bb` |
| Purchase orders · actions-open · desktop (View only) | `sales/purchase-orders/actions-open/desktop` (`31:3187`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:47f0b7919e03482a` |
| Purchase orders · actions-open · mobile (View only) | `sales/purchase-orders/actions-open/mobile` (`34:5948`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:71f9e1226b1ce77c` |

The status column shows a pill in this Story; the status control frames belong to AB#1470. Where the
design is silent or two frames disagree, the user delegated the call ("exercise your best judgement to
reach a consistent look-and-feel"); each call is recorded in the run log.

## Functional impact

| Shared mechanism | Consumers (search) | Risk |
|---|---|---|
| `IPurchaseOrderRepository` (new members) | `CreatePurchaseOrderCommandHandler`, `CheckReferenceAvailabilityQueryHandler`, `CreatePurchaseOrderTests` substitutes (`rg "IPurchaseOrderRepository"`) | low: additive; substitutes need no change |
| `PurchaseOrderEndpoints` group | create, calculate, reference availability | low: new routes; `/list` and `/{id}` must not shadow `/calculate` or `/reference-availability` |
| `PurchaseOrderResponse` (now also the get-by-id shape) | create endpoint, create form | low: additive `lineItemCount` already present |
| `purchase-orders-page` | the route, `app.routes.spec.ts` | low: composed, not replaced |
| `a-pill-removable`, `a-typeahead-menu`, `_forms.scss` (reused by filters) | create form | low: inputs only; re-check the create modal |
| `a-modal` (new `variant: 'sheet'` and drag handle, for the mobile filter sheet) | create modal (`purchase-order-form`) | low: `dialog` stays the default; create modal re-checked at desktop and mobile |
| `ReferenceNormalizer.NormalizeSearch` (new; partial reference, any length) | list query handler only; `Normalize` unchanged for create and availability | low: additive; unit-tested beside `Normalize` |
| `.shell__main` padding in `styles/_pages.scss` (md 48/32, xl 48/64, to match `list/md`) | every routed page: welcome, placeholder, purchase orders | low: spacing only; welcome page re-checked at 768 and 1400, no horizontal scroll |

Search: `rg "IPurchaseOrderRepository|PurchaseOrderResponse|a-pill-removable|typeahead-menu|a-modal|NormalizeSearch|shell__main" src client/src`.

## Deployment

None beyond AB#1466: no new configuration, no migration (indexes from AB#1466 cover the queries).

## Milestone records

### Milestone 1 — List and get endpoints (closed)

- **Implemented:** both endpoints per the AC, behind the toggle.
- **How to test:** `dotnet test`; in Swagger, `POST /api/v1/purchase-orders/list` with
  `{"skipCount": 0, "search": " po-2026-001 "}` → one row; `GET /api/v1/purchase-orders/{id}` for it →
  20 lines and `lineItemCount: 25`.
- **Assumptions:** line order (run log).
- **Next:** Milestone 2 — Grid, `feat/purchase-order-management/list-purchase-orders-grid`.

### Milestone 2 — Grid (closed)

- **Implemented:** table and cards, pagination, Created sort, loading, empty and retry states, lazy
  line items, Actions → View, and a created order appearing first.
- **How to test:** open `/purchase-orders`; page 4 holds PO-2026-001: expand it → 20 lines, Load more →
  25. `npm test` in `client/`.
- **Next:** Milestone 3 — Filters.

### Milestone 3 — Filters (closed)

- **Implemented:** every filter on desktop and in the mobile sheet, per the AC.
- **How to test:** see the item's How To Test in ADO.
- **Assumptions:** native status select and date inputs (run log).
- **Next:** AB#1470 Update Purchase Order Status, primary branch
  `feat/purchase-order-management/update-purchase-order-status` cut from this Story's primary branch.
