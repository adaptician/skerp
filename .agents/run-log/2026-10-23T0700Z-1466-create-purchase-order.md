---
work-item: 1466
summary: >
  Purchase-order schema, normalisers, calculator, repositories, demo seed and the Feature_PurchaseOrders
  release toggle; then the create, calculate and lookup endpoints; then the list shell and create modal.
---
# Create purchase order

## What changed

### Milestone 1 — Domain and persistence

- Domain: `CurrencyId`, `StatusId`, the `PurchaseOrder` aggregate (line items, status history),
  `Customer`, `Product`, their error catalogues and repository interfaces; `ReferenceNormalizer`,
  `SkuNormalizer`, `NameNormalizer` and `PurchaseOrderCalculator`.
- Infrastructure: five entity configurations (NOCASE on names and SKU, unique indexes filtered on
  `IsDeleted = 0`, restrict deletes), repositories, the `AddPurchaseOrders` migration and the
  demo `PurchaseOrderSeeder` (8 customers, 25 products, 30 orders over 60 days, every status,
  `PO-2026-001` with 25 lines).
- Every `decimal` is stored as an INTEGER of ten-thousandths (`SqliteConventions`), so `Total`
  orders and filters in SQL; proven by `PurchaseOrderPersistenceTests` on migrated in-memory SQLite.
- Release toggle `Feature_PurchaseOrders` (off in `appsettings.json`, on in the `http` launch
  profile) and `GET /api/v1/features`.
- Tests: 79 new unit tests (normalisation rules 1 and 2 with lengths, characters and case; the
  calculator's equations and rounding; the aggregate), 13 new integration tests.
- Functional impact re-checks: `SqliteConventions` — `AuditInterceptorTests` still pass;
  `DatabaseInitializer` and the health check — `HostingEndpointsTests` pass with the new migration
  and seeder; `FeatureManagement` section — the only consumer is `AddFeatureManagement`, covered by
  `FeatureEndpointsTests`.
- design-fidelity-check verify: not applicable — this milestone has no UI surface.

## What surprised you

- A shell heredoc containing C# interpolated strings failed to parse and wrote nothing; files are
  now written with the editor tools.
- Python's text mode on Windows wrote CRLF into edited files; `dotnet format` flagged them. Edits
  now go through the editor tools.
- `SkerpApiFactory` runs in Development with seeding on, so every API integration test now starts
  from the 30 seeded orders. Tests that need a known set must create their own uniquely named data.

## What you assumed

- Status-change rows carry `ChangedAt` (UTC); the table stays exempt from `MinimumAudit`.
- The unit-price ceiling is 999 999 999.9999 so 100 lines × 1 000 units still fit 18,4 precision.
- Order notes (`api.md` has them, `entities.md` does not) are stored as `Notes`, at most 512 characters.

## Milestone 2 — Endpoints

### What changed

- `POST /api/v1/purchase-orders` (201 with the created order), `POST /purchase-orders/calculate`,
  `GET /purchase-orders/reference-availability`, `GET /customers/lookup` and `GET /products/lookup`,
  each group behind `Feature_PurchaseOrders` (404 when off).
- Request validators reuse the Domain rules through `SatisfiesDomainRule` / `WithError`, so a
  rejected request carries the Domain's own code and description. `LineItemProductResolver` is
  shared with edit (AB#1468).
- `ValidationBehavior` (shared): when every failure carries one dotted code, that code is reported
  (for example `PurchaseOrder.InitialStatusMustBePending`); mixed failures stay `General.Validation`.
  Re-checked: its only consumers are the new validators and `ValidationBehaviorTests` (two new tests).
- `RouteHandlerOptions.ThrowOnBadRequest = true`, so malformed JSON answers with a Result body in
  every environment (`Create_MalformedJson_Returns400ResultBody`).
- Tests: 36 new unit tests (every minimum creation test in the brief, plus ambiguity, duplicates in
  one request and unknown ids), 19 new integration tests over HTTP.
- design-fidelity-check verify: not applicable — no UI surface in this milestone.

### What surprised you

- Minimal APIs return an empty 400 outside Development unless `ThrowOnBadRequest` is set; the global
  handler only saw binding failures in Development before.
- A user-defined implicit conversion cannot target an interface, so `Result<IReadOnlyList<T>>` needs
  `Result.Success<…>(…)` explicitly.

### What you assumed

- When a customer id is sent with only one of name or email, the id wins and the stored customer is
  used unchanged; only all three together is refused (api.md's wording).
- The customer lookup returns the email as well, so the form can fill and lock it (brief).
- A unique-index race between the existence check and the insert surfaces as a 500; acceptable for a
  small internal team, recorded here rather than mapped.

## Milestone 3 — Create modal

### What changed

- `/purchase-orders` now matches the real screen only while `Feature_PurchaseOrders` is on
  (`featureEnabled` `canMatch` guard over `FeatureService`), and falls back to the placeholder.
- The screen's title row with *New purchase order*, and the create form in a new shared `a-modal`:
  reference check on blur (check / stop sign, normalised value shown), customer typeahead from five
  characters with a removable pill and locked email, Enter to confirm a new customer, SKU typeahead
  that fills and locks SKU and name, server totals on quantity/price blur and on line removal,
  1–100 lines, every client message from the validation-errors frame, and Demo Mode's enabled,
  danger-styled Save with the brief's note.
- New shared pieces: `a-modal`, `a-status-pill`, `a-pill-removable`, `a-typeahead-menu`,
  `a-demo-note`, `MoneyPipe`, the `_forms.scss` field styles and `.button--danger`.
- 24 new client tests (65 in total).
- Functional impact re-checks: the header menu item and the welcome *View purchase orders* link
  still route to `/purchase-orders` — `app.routes.spec.ts` covers both toggle states; global styles
  only gained new classes (`app.spec.ts`, header and welcome tests pass); the popup host is unchanged
  and now proven to sit above the modal in the running app.
- design-fidelity-check verify, light scheme, Sales theme (all 52 purchase-order frames re-fingerprinted
  live: no drift):

| Screen · breakpoint | L1 tokens | L2 inventory | L3 visual | L4 mechanism |
|---|---|---|---|---|
| `sales/purchase-orders/create-modal-filled/desktop` (35:7114) | pass — modal surface, 16px radius, modal elevation, 20/24 header padding, Fraunces 24/32 title, 44px controls with border-strong, sunken totals, Numeric/LG grand total | pass — every element present | pass — side by side at 1400px; columns 160/88/128/128/40 aligned with the header | pass — calculate request seen, server totals rendered |
| `sales/purchase-orders/create-modal-demo-mode-duplicate/desktop` (38:13586) | pass — danger fill, 3px inset danger-muted ring, info-muted note with 3px info rule | pass | pass | pass — Save enabled; POST answered 409, popup above the modal and dismissible |
| `sales/purchase-orders/create-modal-save-disabled/desktop` (38:12752) | pass | pass | pass | pass — Save disabled after the lookup returned `isAvailable: false` |
| `sales/purchase-orders/create-modal-customer-selected/desktop` (36:9871) | pass — pill primary-muted / text-link, disabled email surface | pass | pass | pass — lookup from 5 characters, selection locks email |
| `sales/purchase-orders/create-modal-filled/mobile` (35:8241) | pass | pass — stacked line card, labels visible | pass — at 576px, full-screen sheet, buttons fill the width at 44px | pass |
| list title row (`sales/purchase-orders/list/desktop`, 28:316) | pass | title, description and *New purchase order* only (grid is AB#1467) | pass | pass — opens the modal |

### What surprised you

- A native modal `<dialog>` makes the popup host inert: the Demo Mode duplicate error rendered under
  the modal and could not be dismissed (`elementFromPoint` hit the backdrop). `a-modal` is a scrim
  plus `role="dialog"` with its own focus trap instead; the popup host keeps its z-index above it.
- jsdom has no layout, so a focus trap that filtered by `offsetParent` trapped Tab on the first field
  in tests; the filter was removed (nothing hidden in the modal is focusable).
- Number inputs render the browser locale's decimal separator (`24,5`), where the frame shows `24.50`.

### What you assumed

- Any typed, unselected customer name is a new customer at save; Enter (or leaving the field) only
  confirms it and closes the suggestions.
- A chosen product cannot be un-chosen on its line; removing the line is the way to change it.
- The demo note shows whenever Demo Mode is on (brief), not only for a duplicate.

## Conformance review (fresh subagent, 2026-10-23) and fixes

Findings and what was done:

- **Fixed (blocking):** the spec's Functional impact table listed `ValidationBehavior` as unchanged and
  omitted `ThrowOnBadRequest` and the global styles. The table now lists all three with their
  consumers and re-checks.
- **Fixed (blocking):** design verify had rows for 6 of the 28 cited frames. Added below for the
  remaining states; the mobile variants share one stylesheet and were checked at 576px and 375px.
- **Fixed:** a line that became invalid kept its old total in the grand total until another line
  recalculated; it now triggers a recalculation that leaves it out (client test fails without the fix).
- **Fixed:** two quick reference checks could let a stale answer overwrite the field; checks now go
  through `switchMap`.
- **Fixed:** the release toggle ran as an endpoint filter, after binding, so an unbindable POST with
  the toggle off answered 400 and revealed the endpoint. It is now middleware after routing
  (`UseFeatureGates`); three new tests cover POSTs, including malformed JSON, with the toggle off.
- **Fixed:** the 409 duplicate-name and duplicate-SKU integration tests now assert nothing was
  persisted.
- **Fixed:** a failed `GET /features` was cached as "all off" until a reload; failures are no longer
  cached (`feature.service.spec.ts`).
- **Recorded:** the unit-price ceiling and the customer/product id precedence are now
  assumption-ledger entries (`asmp-1466-*`, settled, derived).
- **Accepted, documented:** SQLite's NOCASE folds ASCII only, so "Éclair" and "éclair" are different
  names. Acceptable for this demo; recorded here as a known limit.

Additional design-fidelity-check verify rows (desktop, light scheme, Sales):

| Screen · breakpoint | L1 tokens | L2 inventory | L3 visual | L4 mechanism |
|---|---|---|---|---|
| `create-modal/desktop` (35:6421) | pass — placeholders `text-placeholder`, empty totals `R 0.00` on sunken | pass | pass | n/a — static |
| `create-modal-reference-available/desktop` (36:7952) | pass — `color/success` check, muted helper | pass | pass | pass — lookup on blur, normalised value written back |
| `create-modal-reference-exists/desktop` (36:8613) | pass — `border-error`, danger stop sign and message | pass | pass | pass — lookup returned `isAvailable: false` |
| `create-modal-customer-search/desktop` (36:9237) | pass — raised panel, dropdown elevation, muted second line | pass — active option tint appears on arrow keys, not by default | pass | pass — request only from 5 characters |
| `create-modal-new-customer/desktop` (36:10491) | pass | pass — "New customer — add their email below." | pass | pass — Enter confirms; email required message |
| `create-modal-product-selected/desktop` (38:10451) | pass — disabled surface with search icon | pass | pass | pass — SKU and name disabled after selection |
| `create-modal-validation-errors/desktop` (38:11244) | pass — error borders and caption messages | pass — messages listed below the row | pass | pass — Save shows every message, nothing sent |
| `create-modal-calculating/desktop` (38:11914) | pass — loader and caption on sunken totals | pass | pass — captured with the calculate call delayed in the page | pass |
| mobile variants (40:14320 … 41:16487) | pass — same tokens | pass — stacked fields and line card | pass — checked at 576px and 375px, no horizontal scroll | pass |
