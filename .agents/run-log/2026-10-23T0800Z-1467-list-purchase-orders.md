---
work-item: 1467
summary: >
  List and get-by-id endpoints with every filter and lazy line items; then the grid and cards with
  paging, states and line items; then the filters and the mobile filter sheet.
---
# List purchase orders

## Milestone 1 — List and get endpoints

### What changed

- `POST /api/v1/purchase-orders/list`: search (rule 1, any part of the reference), status,
  up to 10 customers, an inclusive created range, sorting by reference, customer, total, status or
  createdAt (ties by reference) and paging (`skipCount` required, `maxResultCount` 1–100, default 10).
  Each row carries `lineItemCount` instead of its lines.
- `GET /api/v1/purchase-orders/{id}?skipCount&maxResultCount`: the order with one page of lines
  (default 20) and `lineItemCount`; a malformed id is 400 `PurchaseOrder.InvalidId`.
- `IPurchaseOrderRepository` gained `ListAsync`, `FindByIdAsync`, `ListLineItemsAsync`;
  `ReferenceNormalizer.NormalizeSearch` applies rule 1 to a partial reference.
- Tests: 12 new unit tests (sorting), 20 new integration tests (paging, every filter, refusals,
  20 + 5 line items, soft-delete exclusion).
- Functional impact re-checks: `IPurchaseOrderRepository` substitutes in `CreatePurchaseOrderTests`
  compile and pass unchanged; `/list` and `/{id}` do not shadow `/calculate` or
  `/reference-availability` (both still answer in `CreatePurchaseOrderEndpointTests`).
- design-fidelity-check verify: not applicable — no UI surface in this milestone.

### What surprised you

- Nothing beyond analyzer nudges (CA1806 on a discarded `TryParse`, CA1826 in a test).

### What you assumed

- Lines are ordered by creation time then SKU; there is no position column (spec decision).

## Milestone 2 — Grid

### What changed

- A `purchaseOrders` NgRx slice on the lazy route (query, page, rows, expanded rows, their line
  items) with effects: load on open, page, sort and retry (a newer load cancels an older one), lazy
  line items 20 at a time, and a reload after a create the reducer cannot place.
- `adapt-purchase-order-list`: the table from lg (header band, 56px rows, columns 40/140/fill/140/
  180/128/112, Created sort button with `aria-sort`), cards below lg, an 8-row skeleton, the empty
  placeholder (filter-aware) and a retry state. Status renders through a template hook AB#1470 fills.
- `adapt-line-items-panel` (sub-table / two-line card rows, Load more, "Showing x of y").
- Shared: `a-pagination` (numbered and compact), `a-action-menu` (Actions ▾ and kebab, arrow keys,
  Escape, click-away), `a-pill`, `ViewportService.isWide`.
- Creating an order puts it first on the unfiltered first page without a reload.
- 19 new client tests (87 in total).
- Functional impact re-checks: the create modal still opens from the page and its tests pass;
  `app.routes.spec.ts` passes with the route's new state providers.
- design-fidelity-check verify (light, Sales): `row-expanded/desktop` (30:714) and `list/desktop`
  (28:316) — L1 pass (sunken header, border, lg radius, Numeric/MD totals, Caption/Strong headers,
  sunken sub-table 12/24/12/64 padding), L2 pass (filter bar is Milestone 3), L3 pass side by side at
  1400px, L4 pass (expand loads 20, Load more adds 5 and hides itself; Actions → View expands).
  `list/mobile` (33:4809) and `row-expanded/mobile` (33:4988): L1–L2 pass by DOM at 375px (cards,
  compact pager "Page 1 of 4", no horizontal scroll); L3 compared after Milestone 3 adds the toolbar.

### What surprised you

- `concatLatestFrom` is not in this NgRx version and `@ngrx/operators` is not installed; the effects
  use RxJS `withLatestFrom`.
- The browser pane's device emulation resizes without firing `resize` or a media-query `change`, so
  the table/cards switch needs a reload there; a real resize switches live (checked by dispatching
  `resize`).
- The page first rendered the placeholder because `GET /features` ran while the API was still
  starting; the next navigation retries (the AB#1466 review fix).

### What you assumed

- With no filters, the empty placeholder reads "No purchase orders yet" (the design shows only the
  filtered message).

## Milestone 3 — Filters

### What changed

- `adapt-purchase-order-filters`: the Filter Bar from lg (reference search debounced 300ms, customers,
  status, created range, Clear filters disabled until something is set); below lg a search field and
  a Filters button ("Filters · n") that opens a bottom sheet editing a draft, with "Show N orders"
  from a count query (`maxResultCount: 1`) and Clear filters.
- `adapt-customer-multi-select` (Menu/SelectPanel): searchable checkbox options (44px rows,
  selected rows tinted), first selection as a removable pill plus "+N more", at most 10 with the
  remaining options disabled and the hint "Up to 10 customers · n selected".
- `adapt-date-range-field`: "Any date" or "D Mon YYYY – D Mon YYYY"; From/To inputs in a panel with
  Apply/Clear; a start after the end is flagged and Apply is disabled. In the sheet the dates apply
  to the draft as they change.
- `a-modal` gained `variant="sheet"` (bottom-anchored, rounded top, handle).
- 8 new client tests (95 in total).
- Functional impact re-checks: `a-modal` (create form) — its tests pass and the create modal still
  opens as an 800px dialog; `a-pill-removable` reused unchanged.
- design-fidelity-check verify (light, Sales): `filters-open/desktop` (30:1309) — L1 pass
  (surface card, lg radius, 20/16 padding, raised panel, dropdown elevation, surface-selected rows,
  primary checkbox), L2 pass, L3 pass side by side, L4 pass (search, tick, limit). `filters-open/mobile`
  (33:5228) — L1–L3 pass at 576px (sheet, handle, fields, footer buttons), L4 pass ("Show 6 orders",
  apply → "Filters · 1", only Fulfilled cards). `list/lg` (32:4605) — the bar wraps Created to a
  second row as the frame shows. `empty/*` and `loading/*` covered by DOM checks and page tests.

### What surprised you

- Formatter-wrapped `<option>` text broke `selectOptions` by label in tests; they select by value.
- A filter-component edit to add `variant="sheet"` did not land the first time because the formatter
  had rewrapped the element; caught in the browser (the sheet rendered full-screen).

### What you assumed

- The status filter is a styled native `<select>`: the closed field matches Field/Select, the open
  list is the platform's (accessible, keyboard and touch friendly). The status *control* in AB#1470
  uses a custom panel because it carries Demo Mode info icons.
- The created range uses native date inputs in a panel rather than a custom calendar (Menu/Calendar
  has no open-state frame among the cited screens).

## Conformance review fixes (commits 9a634dc and the review-fix commit)

### What changed

- 9a634dc: the filter panels' Escape and outside-click handling moved from inner `<div>`s to the
  component hosts (`interactive-supports-focus` lint); options take `tabindex="-1"`.
- Search was silently dropped when the same text was re-applied after *Clear filters*
  (`distinctUntilChanged` remembered the old text); the filter now compares with the applied query.
  Regression test added.
- Expanding a row while its first page of lines was still loading requested it again; the effect
  now skips an order whose lines are loading.
- Page tests for clearing from the filtered empty state and for reload-after-create on page 2.
- md (768–1199px) layout aligned with `list/md` (32:5047): title row stacks, heading at 32px,
  *New purchase order* full width at 44px; `.shell__main` padding 48/32 between md and xl (64 at
  xl, unchanged at 1400). Welcome page re-checked at 768 and 1400: no horizontal scroll.
- Spec: functional impact now lists `a-modal` (sheet variant), `ReferenceNormalizer.NormalizeSearch`
  and the shell padding; the optional paging on `GET /{id}` recorded as a decision. Feature README
  rewritten for the list, filters, state and breakpoints.
- 98 client tests.

### Design verify (light, Sales)

| Frame | L1 tokens | L2 inventory | L3 visual | L4 mechanism |
|---|---|---|---|---|
| `list/md` (32:5047) | pass (DOM: 32px sides, 44px button, 32px h1) | pass | **unverified** — screenshots unavailable in this session | pass (cards, toolbar, sheet) |
| `actions-open/desktop` (31:3187) | pass (148px menu, raised surface, dropdown elevation) | pass (View only, per Story scope) | **unverified** | pass (View expands the row) |
| `actions-open/mobile` (34:5948) | pass (44px kebab, right-aligned) | pass | **unverified** | pass |
| `empty/desktop`, `empty/mobile` (30:1978, 33:5551) | pass (52px icon on surface-hover, 20px title) | pass | **unverified** | pass (Clear filters resets) |
| `loading/desktop`, `loading/mobile` (31:1797, 33:5628) | pass (8 skeleton rows, 40px, skeleton colour) | pass | **unverified** | pass |
| `list/mobile`, `row-expanded/mobile` (33:4809, 33:4988) | pass | pass | **unverified** | pass (expand, Load more) |

L3 for these rows needs a human side-by-side; a visual sign-off step was added to AB#1467's How To
Test.

### What surprised you

- The browser emulator does not fire `matchMedia` change events on resize; `ViewportService` also
  listens to `resize` (a tooling limit, not a product bug).
