# Create Purchase Order — Story spec (AB#1466)

User Story under Feature AB#1433 *Purchase Order CRUD* (Epic AB#1429), slug `create-purchase-order`,
**21 points** (the depth ladder's size limit is suspended by the product owner; see
[`current-focus.md`](../../../../../../../context/current-focus.md)). Primary branch:
`feat/purchase-order-management/create-purchase-order`, cut from `main` at `8ce2933`. The Epic's five
Stories are stacked: each next primary branch is cut from the previous one, and only the last raises a PR
to `main` (Tyler Pieterse, 2026-10-23).

## What and why

A sales user opens Purchase Orders, selects *New purchase order* and captures an order with its customer
and line items in a modal. Reference, customer and product lookups help them as they type, and every
total comes from the server. This Story lays the whole foundation the other four stand on: the schema,
the normalisation rules, `PurchaseOrderCalculator`, the endpoints and the list screen shell. The server
enforces every rule; Demo Mode leaves Save enabled for a known duplicate so a reviewer can watch the
backend refuse it.

## Acceptance criteria

### Create a valid order

- **Given** the creation modal is open
- **When** the user enters a new reference, a new customer with a valid email and two new products, and saves
- **Then** the API answers 201 and the modal closes with a success popup
- **And** the order is stored Pending with server-computed totals, and the customer, both products and one
  status-change row exist

### Defaults and limits

- **Given** the user opens the modal
- **Then** status shows a read-only Pending, currency ZAR, and one empty line item
- **Given** 100 line items
- **Then** *Add line item* is disabled

### Totals come from the server

- **Given** lines 5 × 9.99 and 3 × 12.99
- **Then** sub-totals 49.95 and 38.97 and grand total 88.92 are shown, read-only
- **Given** line totals summing to 10.125 (or 10.135)
- **Then** the grand total is 10.12 (or 10.14)

### Lookups

- **Given** a reference that exists
- **When** the reference field loses focus
- **Then** a red stop sign shows; for a new reference a green check, and the field shows the normalised value
- **Given** 5 or more characters in customer name
- **Then** matching customers are listed; selecting one shows it as a pill and fills and disables email
- **Given** a product is selected for a line
- **Then** its SKU and name are filled and disabled

### The server enforces integrity

- **Given** Demo Mode is on and the reference exists
- **When** the user clicks the enabled, danger-styled Save
- **Then** the error popup shows the duplicate-reference description, and nothing is created
- **And** with Demo Mode off, Save is disabled for that reference
- **Given** a request with a null reference, `PO 2026 001`, a null customer name, an invalid email, zero
  or 101 line items, or a line with quantity or price ≤ 0
- **Then** the API answers 400 with a descriptive error, and nothing is persisted
- **Given** a create request with statusId Confirmed, Fulfilled or Cancelled
- **Then** 400, and nothing is persisted
- **Given** a customer id plus name and email, or a product id plus SKU and name
- **Then** 400
- **Given** a new customer name that exists case-insensitively, or a new SKU that exists
- **Then** 409 with `Customer.DuplicateName` or `Product.DuplicateSku`, and nothing is persisted

### Release toggle

- **Given** `Feature_PurchaseOrders` is off
- **Then** every purchase-order, customer and product endpoint answers 404, and `/purchase-orders` shows
  the placeholder card

## Step 1: Tracer bullet

| Element | New / changed | Layer / project / folder | Access | Stub behaviour |
|---|---|---|---|---|
| `CurrencyId`, `StatusId` enums | new | Domain `PurchaseOrders/` | public | values per `entities.md` |
| `PurchaseOrder`, `PurchaseOrderLineItem`, `PurchaseOrderStatusChange`, `Customer`, `Product` | new | Domain `PurchaseOrders/`, `Customers/`, `Products/` | public, private setters, factory methods | create with given values |
| `ReferenceNormalizer`, `SkuNormalizer`, `NameNormalizer` | new | Domain `Shared/Normalization/` | public static | return input |
| `PurchaseOrderCalculator` | new | Domain `PurchaseOrders/` | public static | return zeros |
| `PurchaseOrderErrors`, `CustomerErrors`, `ProductErrors` | new | Domain, beside each entity | public static | — |
| `IPurchaseOrderRepository`, `ICustomerRepository`, `IProductRepository` | new | Domain `*/` (interfaces only, architecture.md) | public | — |
| Repository implementations | new | Infrastructure `Persistence/Repositories/` | internal sealed | EF Core |
| Entity configurations + decimal convention | new / changed | Infrastructure `Persistence/EntityConfigurations/`, `SqliteConventions` | internal | indexes, filters, precision |
| `AddPurchaseOrders` migration | new | Infrastructure `Persistence/Migrations/` | generated | — |
| `PurchaseOrderSeeder` | new | Infrastructure `Persistence/Seeders/` | internal sealed | seeds once |
| `CreatePurchaseOrderCommand`, `CalculatePurchaseOrderTotalsQuery`, `CheckReferenceAvailabilityQuery`, `LookupCustomersQuery`, `LookupProductsQuery` + handlers + validators | new | Application `PurchaseOrders/`, `Customers/`, `Products/` | public records, internal handlers | return `Result` |
| `PurchaseOrderEndpoints`, `CustomerEndpoints`, `ProductEndpoints`, `FeatureEndpoints` | new | Api `Endpoints/` | internal static | map, gate, send |
| `FeatureFlags.PurchaseOrders` (`Feature_PurchaseOrders`) | new | Api `Features/` | internal | off in `appsettings.json` |
| `GET /api/v1/features` + client `FeatureService` / `featureEnabled` `canMatch` | new | Api; client `common/services`, `common/guards` | — | returns enabled flags |
| `adapt-purchase-orders-page`, `adapt-purchase-order-form-modal`, `PurchaseOrdersApi`, `purchase-orders` state | new | client `features/purchase-orders/` | lazy route | title, button, modal |

The round hits when: `POST /api/v1/purchase-orders` travels Api → MediatR → handler → repository → SQLite
and back as a Result envelope · Domain stays free of EF Core and Application free of Infrastructure (the
architecture tests pass) · the toggle binds from configuration and answers 404 when off · the integration
tests order and filter on `CreatedAt` and `Total` against real SQLite with the chosen mappings · the
unit tests reach the normalisers and calculator through their public API, without widened access.

## Milestones

| # | Milestone | Branch | Complete when |
|---|---|---|---|
| 1 | Domain and persistence | `feat/purchase-order-management/create-purchase-order-persistence` | Entities, normalisers, calculator, repositories, configurations, migration and seed exist; the release toggle exists, off; unit tests for normalisation and the calculator pass; an integration test proves ordering and range filters on `CreatedAt` and `Total` on real SQLite |
| 2 | Endpoints | `feat/purchase-order-management/create-purchase-order-endpoints` | Create, calculate, reference, customer and product lookups answer per the AC behind the toggle; every minimum creation test in the brief passes |
| 3 | Create modal | `feat/purchase-order-management/create-purchase-order-create-modal` | The list screen shell and create modal work end to end in a browser at desktop and mobile, in both Demo Mode states; client tests pass; design verify passes |

## Decisions where the plan sources are silent

- **Where queries reach EF Core.** Writes go through Domain repository interfaces with domain-meaningful
  methods, one per aggregate root (architecture.md → *Repositories*), implemented in Infrastructure. Reads
  that shape a response (lookups, and the list in AB#1467) go through the same repositories, returning
  domain entities or small read records declared beside the interface. Application stays EF-free; no
  `IApplicationDbContext` is introduced.
- **Validation error contract.** One failed request yields one error: `General.Validation` (400) with the
  failing rules' messages joined, as `ValidationBehavior` already does. Field-level messages are the
  client's job; the server's message is descriptive enough for the popup. Domain rule failures keep their
  own codes (`PurchaseOrder.DuplicateReferenceNumber`, `Customer.DuplicateName`, …).
- **Money on SQLite.** Every `decimal` is stored as a 64-bit integer of ten-thousandths (precision 18,4
  fits), so ordering, range filters and equality translate to integer comparisons. `HasPrecision` is
  still declared for the model's intent.
- **Status-change rows carry `ChangedAt`.** `entities.md` exempts the table from `MinimumAudit`; an audit
  history without a time cannot answer "when", so the row stores the UTC time it was written.
- **Calculate is `POST /api/v1/purchase-orders/calculate`.** `api.md` lists it as GET with a request body;
  a GET body is ignored by proxies and the fetch API, so the verb is POST. The contract is otherwise as
  written.
- **Lookup routes:** `GET /purchase-orders/reference-availability?reference=`, `GET /customers/lookup?name=`
  (contains, case-insensitive, 10 results), `GET /products/lookup?sku=` (starts with, 10 results). Each
  normalises its input with the same Domain rule as create, and the response carries the normalised value.
- **Duplicates inside one request.** Two new products with the same SKU on one order is
  `Product.DuplicateSku`; the same existing product on two lines is allowed.
- **Create response.** 201 with the created order in the list's item shape, so AB#1467 can insert it.
- **Release toggle.** `Feature_PurchaseOrders`, in the `FeatureManagement` section (`appsettings.json`
  false). The `http` launch profile sets it true for local development and staging. Endpoints answer 404
  when it is off (api.md). The client asks `GET /api/v1/features` once; `/purchase-orders` matches the
  real page only when the flag is on and falls back to the existing placeholder.
- **Seed data.** Development seeding adds customers, products and 30 orders over the last 60 days in every
  status, one with 25 line items, only when no order exists yet.

## Design

`design-fidelity-check: applies — the list screen shell, the create modal and its states are UI surfaces.`
All frames confirmed live on 2026-10-23 (node exists, name slugs to key, Sales page).

| Screen · state · breakpoint | Citation | Page | Approval | Fingerprint |
|---|---|---|---|---|
| Purchase orders · list · desktop (title, New button) | `sales/purchase-orders/list/desktop` (`28:316`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:a4a608ba5f90c4e0` |
| Purchase orders · list · mobile | `sales/purchase-orders/list/mobile` (`33:4809`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:156c780ae0409b46` |
| Purchase orders · error · desktop | `sales/purchase-orders/error/desktop` (`32:4151`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:68ba590252d17853` |
| Purchase orders · error · mobile | `sales/purchase-orders/error/mobile` (`34:6575`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:9ca5df8e8a8c357f` |
| Create modal · empty · desktop | `sales/purchase-orders/create-modal/desktop` (`35:6421`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:9c07da2c49af2454` |
| Create modal · empty · mobile | `sales/purchase-orders/create-modal/mobile` (`35:7949`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:5aa4084b9027ab56` |
| Create modal · filled · desktop | `sales/purchase-orders/create-modal-filled/desktop` (`35:7114`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:64f777c7b3b5615d` |
| Create modal · filled · mobile | `sales/purchase-orders/create-modal-filled/mobile` (`35:8241`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:94cbb7c44ff18fee` |
| Create modal · reference available · desktop | `sales/purchase-orders/create-modal-reference-available/desktop` (`36:7952`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:0c00aa257bcad527` |
| Create modal · reference available · mobile | `sales/purchase-orders/create-modal-reference-available/mobile` (`40:14320`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:79ccb63aa479c0ff` |
| Create modal · reference exists · desktop | `sales/purchase-orders/create-modal-reference-exists/desktop` (`36:8613`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:b0018cc2097fe93a` |
| Create modal · reference exists · mobile | `sales/purchase-orders/create-modal-reference-exists/mobile` (`40:14573`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:3d7ec965f219f638` |
| Create modal · customer search · desktop | `sales/purchase-orders/create-modal-customer-search/desktop` (`36:9237`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:877e25d7950f36e1` |
| Create modal · customer search · mobile | `sales/purchase-orders/create-modal-customer-search/mobile` (`40:14800`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:2172500e9ad1e3ca` |
| Create modal · customer selected · desktop | `sales/purchase-orders/create-modal-customer-selected/desktop` (`36:9871`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:77a9b3f2f9f176d4` |
| Create modal · customer selected · mobile | `sales/purchase-orders/create-modal-customer-selected/mobile` (`40:15033`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:56605c08694d246d` |
| Create modal · new customer · desktop | `sales/purchase-orders/create-modal-new-customer/desktop` (`36:10491`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:d216251b99aceb2c` |
| Create modal · new customer · mobile | `sales/purchase-orders/create-modal-new-customer/mobile` (`40:15258`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:851414688504e402` |
| Create modal · product selected · desktop | `sales/purchase-orders/create-modal-product-selected/desktop` (`38:10451`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:332213f53b6b62fc` |
| Create modal · product selected · mobile | `sales/purchase-orders/create-modal-product-selected/mobile` (`40:15479`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:200e1d5be49eff4d` |
| Create modal · validation errors · desktop | `sales/purchase-orders/create-modal-validation-errors/desktop` (`38:11244`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:b3c49027a2235f37` |
| Create modal · validation errors · mobile | `sales/purchase-orders/create-modal-validation-errors/mobile` (`41:15239`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:12d80109e1aaa067` |
| Create modal · calculating · desktop | `sales/purchase-orders/create-modal-calculating/desktop` (`38:11914`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:7b03d405e629849f` |
| Create modal · calculating · mobile | `sales/purchase-orders/create-modal-calculating/mobile` (`41:15544`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:ff9fc0b415c0df16` |
| Create modal · save disabled · desktop | `sales/purchase-orders/create-modal-save-disabled/desktop` (`38:12752`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:9b73bfcfb37b318c` |
| Create modal · save disabled · mobile | `sales/purchase-orders/create-modal-save-disabled/mobile` (`41:16020`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:c8653894c51281c8` |
| Create modal · Demo Mode duplicate · desktop | `sales/purchase-orders/create-modal-demo-mode-duplicate/desktop` (`38:13586`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:2d9791e57129414e` |
| Create modal · Demo Mode duplicate · mobile | `sales/purchase-orders/create-modal-demo-mode-duplicate/mobile` (`41:16487`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:aa57e5821181f901` |

The list frames' grid, filters and pagination are AB#1467's; this Story builds only the page header
(title, description, *New purchase order*) and shows the empty placeholder below it until AB#1467 lands.
Where the design is silent or two frames disagree, the user delegated the call ("exercise your best
judgement to reach a consistent look-and-feel"); each such call is recorded in the run log.

## Functional impact

| Shared mechanism | Consumers (search) | Risk |
|---|---|---|
| `SqliteConventions` (new decimal converter) | every entity configuration; today none has a `decimal` (`rg "decimal" src`) | none today |
| `ApplicationDbContext` model + new migration | `DatabaseInitializer`, `DatabaseHealthCheck`, `AuditInterceptorTests` | low: migrations apply in order; re-run integration tests |
| `ValidationBehavior` (changed in M2: one shared dotted code is reported instead of `General.Validation`) | every MediatR request with a validator (`rg "AbstractValidator<" src`): only this Story's validators; `ValidationBehaviorTests` | low: mixed failures keep `General.Validation` |
| `RouteHandlerOptions.ThrowOnBadRequest = true` (M2) and `UseRouting` + `UseFeatureGates` (review fix) | every minimal-API endpoint: health (`/health`, `/alive`, no bound parameters), `/api/v1/features`, the purchase-order, customer and product groups, the `/api/v1` fallback | low: binding failures now answer a 400 Result body in every environment; re-checked by `HostingEndpointsTests`, `ApiErrorResponseTests`, `Create_MalformedJson_Returns400ResultBody` and the toggle-off POST tests |
| Global styles: `_forms.scss` (new), `.button--danger` and `.button--block` in `_buttons.scss`, `styles.scss` | every screen; existing class names unchanged (`rg "button--" client/src`) | low: additive classes only; re-checked by `app.spec.ts`, header and welcome tests and the welcome screen in the browser |
| `app.routes.ts` `/purchase-orders` route | header menu, welcome page *View purchase orders* link (`rg "purchase-orders" client/src`) | low: the path is unchanged; the placeholder still answers when the flag is off |
| `apiErrorInterceptor` / `NotificationService` (used for the first time by a feature) | `popup-host` | low: re-check the popup with a real 409 |
| `appsettings.json` feature-management section (schema changed to `FeatureManagement`) | `Program.AddFeatureManagement` only (`rg "feature_management|FeatureManagement" src`) | none: no flag existed |

## Deployment

- New configuration key `FeatureManagement:Feature_PurchaseOrders` (default false), documented in
  `.build/config/env-variables.md`.
- A new migration applies automatically at startup (`DatabaseInitializer`). Resetting the local database is
  not required.

## Milestone records

### Milestone 1 — Domain and persistence (closed)

- **Implemented:** the schema, rules and demo data the Story stands on. Starting the API applies the
  `AddPurchaseOrders` migration and seeds 30 orders. `GET /api/v1/features` lists
  `Feature_PurchaseOrders` when the toggle is on. No purchase-order endpoint exists yet, so the
  capability is unreachable.
- **How to test:** `dotnet test` (all green); `npm run start:api` in `client/`, then
  `curl http://localhost:5000/api/v1/features` → `{"isSuccess":true,…,"value":{"enabled":["Feature_PurchaseOrders"]}}`.
  With `FeatureManagement__Feature_PurchaseOrders=false` the list is empty.
- **Assumptions:** see the run-log entry (`ChangedAt`, the price ceiling, `Notes`).
- **Next:** Milestone 2 — Endpoints, `feat/purchase-order-management/create-purchase-order-endpoints`.

### Milestone 2 — Endpoints (closed)

- **Implemented:** create, calculate and the reference, customer and product lookups answer per the
  AC behind the toggle; every refusal carries a descriptive code.
- **How to test:** `dotnet test`; with the API running (`npm run start:api` in `client/`), open
  `http://localhost:5000/swagger` and try `GET /api/v1/purchase-orders/reference-availability?reference=po-2026-001`
  → `isAvailable: false`, reference `PO-2026-001`; `POST /api/v1/purchase-orders` with `statusId: 20`
  → 400 `PurchaseOrder.InitialStatusMustBePending`.
- **Assumptions:** see the run-log entry (customer id precedence, lookup email, unique race).
- **Next:** Milestone 3 — Create modal, `feat/purchase-order-management/create-purchase-order-create-modal`.

### Milestone 3 — Create modal (closed)

- **Implemented:** the Purchase Orders title row and the create modal, end to end, at desktop and
  mobile, in both Demo Mode states; the release toggle hides the screen behind the placeholder.
- **How to test:** see the item's How To Test in ADO (generated from this spec); `npm test` and
  `npm run lint` in `client/` are green.
- **Assumptions:** see the run-log entry (new-customer confirmation, locked products, demo note).
- **Next:** AB#1467 List Purchase Orders, primary branch `feat/purchase-order-management/list-purchase-orders`
  cut from this Story's primary branch.
