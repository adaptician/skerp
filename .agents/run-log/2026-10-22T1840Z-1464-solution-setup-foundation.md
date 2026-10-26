---
work-item: 1464
summary: >
  Built the .NET 10 API and Angular 21 client foundations, the one-command run, gate wiring through a
  root package.json, and the onboarding README; ADR 0001 accepted and tabular figures settled by measurement.
---
# Solution setup foundation

## What changed

- `Skerp.slnx` with Domain, Application, Infrastructure and Api projects under `src/`, and
  `Skerp.Unit.Tests` / `Skerp.Integration.Tests` under `tests/` (26 tests). Warnings are errors; versions
  are central.
- The API serves `/api/v1` (Result-shaped, including unknown routes), `/health`, `/alive` and Swagger UI,
  redacts unhandled exceptions, and migrates and seeds SQLite on startup. An empty `InitialCreate`
  migration is the baseline.
- `MinimumAudit` plus an audit interceptor stamp UTC times and soft-delete; DateTimeOffset is stored as
  UTC ticks so SQLite can order and filter it (proved with a test-only entity).
- The client: token partials mirrored from the Figma variables, the 35 icons exported verbatim, the
  global button partial, `ApiClient`, the API error interceptor, and the popup (16 tests).
- `npm start` at the root runs both apps; root `lint`, `test` and `format:check` delegate to `client/`, so
  the gate runs the client checks without changing `verify.mjs`.
- README onboarding, `.build/development/` guides and `.build/config/env-variables.md`.
- design-fidelity-check locate: applies — popup and tokens; 55 Sales frames recorded as approved
  (Tyler Pieterse, 2026-10-22) with live fingerprints; two reads of the same frames returned identical
  fingerprints.
- design-fidelity-check verify: popup checked in the browser at 900px and 576px against
  `Feedback/ErrorPopup` (16:56): L1 tokens pass (computed colours, radius, padding, shadow match the bound
  variables), L2 inventory pass (icon, title, description, dismiss), L3 visual pass, L4 n/a for the
  in-context frame — no screen calls the API until AB#1466; the interceptor → popup mechanism is covered
  by component tests.

## What surprised you

- The scaffold's governance files (`.agents/standards/**`, `scripts`, `skills`, `context`, the ADR index)
  are git-ignored in this repository. The screen-index approvals and the filled-in `solution/figma.md`
  exist only on this machine; a reviewer cannot see them in the PR.
- CA1716 (Visual Basic keywords) rejects `Domain/Shared` and `Error`, both prescribed by architecture.md;
  it is turned off in `src/.editorconfig`.
- The root `.gitignore` carries a macOS `Icon` rule without its trailing carriage returns, so on a
  case-insensitive file system it ignores any folder named `icon`. The icon component lives in
  `common/components/icons/` instead; the rule itself is human-owned and left alone.
- MediatR 13+ and FluentAssertions 8+ are commercially licensed; pinned to 12.5.0 and 7.2.2.
- Nunito Sans digits are already equal-width (`1111` and `8888` both 38.41px), so the tabular-figures
  risk did not materialise.
- The Figma usage note says error popups stay until dismissed; the spec's first draft said they close
  after a delay. The spec and ADO AC now follow the design.

## What you assumed

- Ports 5000/4200 (confirmed by Tyler Pieterse). Business-rule failures map to 422, conflicts to 409.
- The API is anonymous by design (authentication is out of scope); the `/api/v1` group says so with
  `AllowAnonymous`.
