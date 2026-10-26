# Solution setup — Spike spec (AB#1464)

Spike under Feature AB#1431 *Development preparation* (Epic AB#1428), slug `solution-setup`, **13 points**.
Primary branch: `feat/solution-preparation/solution-setup`. The product owner suspended the
no-spec-above-8-points rule on 2026-10-22 (see `.agents/context/current-focus.md`), so this item is planned
as one spec rather than refused.

## What and why

Lay the foundation every later Story builds on, so that AB#1465 and the Purchase Order Management Epic
(AB#1429) start from working infrastructure instead of inventing it:

- a .NET 10 API under `src/` in Clean Screaming Architecture, with mirrored tests under `tests/`;
- an Angular 21 client under `client/` ([ADR 0001](../../../../../../../adrs/0001-angular-client-in-client-folder.md))
  on the three-layer token architecture, populated from the approved Figma variables;
- one command to run both, the client checks running in the quality gate, and the root README onboarding.

The Spike also settles three open claims: the pinned SDK/Node versions run the stack, the gate runs the
client checks without editing `verify.mjs` (ADR 0001), and Nunito Sans renders tabular figures
(`asmp-1463-tabular-figures`).

## Acceptance criteria

### One command runs the solution

- **Given** a clean clone with the prerequisites in the README installed
- **When** the contributor runs `npm install` then `npm start` in `client/`
- **Then** the API listens on `http://localhost:5000` and the client on `http://localhost:4200`
- **And** `http://localhost:5000/swagger` shows Swagger UI for the `v1` document
- **And** `http://localhost:4200` loads the Sharp ERP client

### Migrations and seed run on startup

- **Given** no SQLite database file exists at `src/Skerp.Api/App_Data/skerp.db`
- **When** the API starts
- **Then** the database file is created, every migration is applied and every registered seeder runs
- **And** restarting the API applies nothing twice

### Health probes

- **Given** the API is running
- **When** a client requests `GET /health` or `GET /alive`
- **Then** the response is `200` with body `{"status":"healthy"}`

### Unexpected failures are redacted

- **Given** an endpoint throws an unhandled exception
- **When** a client calls it
- **Then** the response is `500` with a Result body: `isSuccess` false, error code `General.Unexpected`,
  and a generic description
- **And** the body contains no exception type, message or stack trace
- **And** the exception is logged with its stack trace

### Unknown API routes are Result-shaped

- **Given** the API is running
- **When** a client requests an unknown route under `/api/v1/`
- **Then** the response is `404` with a Result body whose error code is `General.NotFound`

### The layer rule fails the build when broken

- **Given** the architecture tests
- **When** the Domain project references Application, Infrastructure or Api, or Application references
  Infrastructure or Api
- **Then** `dotnet test` fails

### The client surfaces API failures

- **Given** the client calls the API through the shared API client
- **When** the API answers with a failure Result (any 4xx/5xx) or is unreachable
- **Then** the error popup appears with a short title and the server's description (or a connection
  message when there is no Result body)
- **And** the error popup stays until the user dismisses it with its × button (the design's rule for
  `Feedback/ErrorPopup`); info and success popups also close on their own

### The quality gate runs every check

- **Given** the branch is checked out with dependencies installed
- **When** `node .agents/scripts/verify.mjs` runs
- **Then** backend build, backend format, backend tests, frontend lint, frontend tests and frontend format
  are reported as run and passing, none skipped for missing tooling

## Step 1: Tracer bullet

| Element | New / changed | Layer / project / folder | Access | Stub behaviour |
|---|---|---|---|---|
| `Skerp.slnx` + `Directory.Build.props` + `src/.editorconfig` | new | root, `src/` | — | nullable, warnings-as-errors, analyzers on |
| `Skerp.Domain` — `Shared/Result`, `Shared/Error`, `Shared/Entity`, `Shared/MinimumAudit`, `Shared/IAuditStamp` | new | Domain | public; `IAuditStamp` internal (persistence only) | Result/Error final; audit base has properties only |
| `Skerp.Application` — `Abstractions/Data/IApplicationDbContext`, `Behaviors/`, `DependencyInjection` | new | Application | public / internal | MediatR registered; no handlers |
| `Skerp.Infrastructure` — `Persistence/ApplicationDbContext`, `Persistence/Interceptors/AuditInterceptor`, `Persistence/Seeders/ISeeder` + `DatabaseInitializer`, `DependencyInjection` | new | Infrastructure | public / internal | migrate + run zero seeders |
| `Skerp.Api` — `Program`, `Endpoints/`, `ErrorHandling/GlobalExceptionHandler`, `Results/ResultHttpExtensions`, health endpoints, Swagger | new | Api (Presentation) | public / internal | `/health`, `/alive`, `/api/v1` group, Swagger |
| `InitialCreate` migration | new | Infrastructure/Persistence/Migrations | — | empty baseline, proves `dotnet ef` tooling |
| `Skerp.Unit.Tests`, `Skerp.Integration.Tests` | new | `tests/` | — | architecture test; one API pipeline test |
| `client/` Angular 21 workspace, `src/styles/` partials, `common/services/api-client`, `common/interceptors/api-error.interceptor`, `common/components/popup` + `popup-host`, `common/components/icon` | new | client | — | app boots, API client unwraps `Result<T>` |
| `client/package.json` scripts | new | client | — | `start` runs the API and `ng serve` together |

The round hits when: `npm start` serves both apps and `GET /api/v1/...` through the client proxy reaches
the API · Domain has no project references and the architecture test passes · `ConnectionStrings` and
options bind and inject · tests reach Domain/Application types without widening access
(`InternalsVisibleTo` only where a type is internal by design) · the SQLite file is created from the
connection string.

## Design

`design-fidelity-check: applies — the shared popup error message (Feedback/ErrorPopup) and the token
partials are UI surfaces.`

| Screen · state · breakpoint | Citation | Page | Approval | Fingerprint |
|---|---|---|---|---|
| Popup over list · error · desktop | `sales/purchase-orders/error/desktop` (`32:4151`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:68ba590252d17853` |
| Popup over list · error · mobile | `sales/purchase-orders/error/mobile` (`34:6575`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:9ca5df8e8a8c357f` |

Component master: [`Feedback/ErrorPopup`](https://www.figma.com/design/yzLk80i2s6D2NaP0CO0Irc/Skerp?node-id=16-56)
(also `Feedback/InfoPopup` 16-75 and `Feedback/SuccessPopup` 16-94, one code component with a `kind`
input). Tokens: the Primitives (`Value`) and Color (`Light`) collections, read with `get_variable_defs`
and mirrored one-to-one in `_colors.scss`, `_themes.scss`, `_typography.scss`, `_spacing.scss`.

The popup's own frame is the list screen, which AB#1466 builds. This Spike verifies the popup in isolation
(component test plus a browser check of the component on a host page) and leaves the in-context check to
AB#1466. **Decision:** the Feature plan's "a deliberately failing API call shows the popup" is proven by
tests and by a browser check against a stopped API, because no screen calls the API until AB#1466.

## Decisions

- **Packages.** MediatR 12.x (the last Apache-2.0 line; 13+ is commercially licensed). FluentAssertions
  7.x (8+ is commercially licensed). FluentValidation for request validation. `Microsoft.FeatureManagement`
  registered with no flags, so AB#1466 adds `Feature_PurchaseOrders` without new wiring.
- **Projects.** `Skerp.Domain`, `Skerp.Application`, `Skerp.Infrastructure`, `Skerp.Api` (the Presentation
  layer, named as the Feature plan names it). Domain concepts become folders inside each project
  (`PurchaseOrders/` from AB#1466).
- **Tests.** `Skerp.Unit.Tests` (Domain/, Application/, Architecture/) and `Skerp.Integration.Tests`
  (Api/, Infrastructure/) per `testing.md`; integration tests use a real SQLite file per test fixture,
  never the EF InMemory provider.
- **Clock.** `TimeProvider` is injected; the audit interceptor stamps `CreatedAt`, `LastModifiedAt` and
  `DeletedAt` in UTC and turns deletes of `ISoftDeletable` entities into soft deletes.
- **Ports.** API `5000`, client `4200` — confirmed by Tyler Pieterse on 2026-10-22 (the framework defaults).
- **Gate wiring.** `verify.mjs` runs the client checks in `client/` (`FRONTEND_DIRS = ["client"]`, approved by
  Tyler Pieterse on 2026-10-23). A first version used a root `package.json`; PR review moved every client
  file into `client/`.
- **Release toggle: not applicable.** The Spike adds infrastructure and no user capability.

- **Popups.** One `a-popup` component with a `kind` input (error, info, success) renders all three
  Figma popup masters; `a-popup-host` places them (desktop top-right below the header, mobile at the
  bottom). A request can name its popup title (`errorTitle`) or suppress the popup when the caller
  shows the failure itself (`suppressErrorPopup`, for inline form validation in AB#1466).
- **Icons.** The 35 `Icon/*` masters are exported verbatim to `client/public/icons/*.svg` and drawn by
  `a-icon` as a CSS mask, so each host sets the colour (the design binds one default colour per icon).
- **Status codes.** Validation → 400, not found → 404, conflict → 409, any other expected failure → 422,
  unexpected → 500.

## Functional impact

| Shared mechanism | Consumers (search) | Risk |
|---|---|---|
| `.gitignore` (append SQLite entries, approved) | `git ls-files` — every tracked file | none: entries added only |
| Root `README.md` (onboarding section, approved) | human readers only | none |
| Quality gate behaviour (`verify.mjs` now finds a root `package.json` and `.slnx`) | `.claude/hooks` Stop hook runs `verify.mjs --fast` (slow checks skipped) | low: slow checks only run on demand |

Search: `rg -l "verify.mjs" .claude .codex` and `git ls-files`. No application code exists yet, so no
other consumers.

## Deployment

Local only (the Deliverable excludes deployments). `.build/development/` documents the environment and
setup; `.build/config/env-variables.md` lists the configuration keys. Staging is `main` after merge.
