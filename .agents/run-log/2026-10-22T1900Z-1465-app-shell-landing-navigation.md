---
work-item: 1465
summary: >
  Built the branded shell (backdrop, sticky header with lock-up, menu and Demo Mode toggle), the
  app-wide persisted Demo Mode state, the welcome landing screen and the Purchase Orders placeholder.
---
# App shell, landing and navigation header

## What changed

- Shared components mirroring their Figma masters: `a-header` (Navigation/Header + MenuItem),
  `a-toggle` (Control/Toggle), `a-card` (Card/Default), `a-brand-lockup` (Brand/Lockup),
  `a-avatar` (Media/Avatar). The emblem and backdrop are the Figma placeholder assets, saved to
  `client/public/brand` and `client/public/backgrounds`.
- Demo Mode is an NgRx feature slice (off by default), restored from local storage by an app initializer
  before the first render and persisted on every switch.
- Lazy routes: `/` (welcome, three cards) and `/purchase-orders` (placeholder until AB#1466); unknown
  routes redirect home.
- 25 new client tests (41 in total): reducer, storage, effects, toggle, header, welcome page and the shell.
- Functional impact re-checks: the popup host (a consumer of the new `--shell-header-height` token) now
  sits 24px below the 77px header — measured top 101px; root layout change covers both routes.
- design-fidelity-check verify, light scheme, Sales theme:

| Screen · breakpoint | L1 tokens | L2 inventory | L3 visual | L4 mechanism |
|---|---|---|---|---|
| `sales/welcome/default/desktop` (26:2) | pass — computed card/eyebrow/title/menu colours, radius, padding, shadow equal the bound variables | pass — reviewer toggle shown live (recorded decision) | pass — page height 1271px = frame, cards at y=125, 760px wide | pass — toggle click, Space key and focus ring observed |
| `sales/welcome/default/mobile` (26:149) | pass | pass | pass — page height 1355px = frame, no horizontal scroll | pass — navigation closes panel |
| `sales/welcome/menu-open/mobile` (26:279) | pass — scrim `color/overlay` | pass | pass | pass — open, Escape returns focus, item closes panel |
| `sales/purchase-orders/list/desktop` (28:316), header only | pass — active item `surface-selected` / `text-link`, `aria-current=page` | header only; list is AB#1466 | header pass | pass |

## What surprised you

- After stopping the background `npm start`, the API and `ng serve` child processes kept running and
  held their files and ports; `concurrently` handles Ctrl+C in a terminal, but a killed parent leaves
  orphans on Windows.
- At jsdom's default width the desktop menu is `display: none`, so Testing Library hides it from role
  queries; the header test asks for hidden links explicitly.
- The Deliverable forbids tests that depend on copy text, so queries use roles, hrefs and ARIA attributes
  instead of visible labels.

## What you assumed

- Demo Mode toggles are live in both places (the design shows the reviewer-card toggle on as an
  illustration).
- The developer details are configuration placeholders (`environment.developer`); the website placeholder
  is `https://example.com/`.

## Coherence review (fresh-context agent, before the PR)

Findings and what was done:

- **Fixed (blocking):** the README pointed contributors at `verify.mjs`, which a clean clone does not have
  (the governance tree is git-ignored). The README now lists the direct commands and names the gate
  only where the scaffold is installed. Whether to commit the gate is a human decision.
- **Fixed:** `DateTimeOffsetToBinaryConverter` encoded local ticks plus the offset, so a filter with a
  non-UTC parameter compared the wrong instants. Timestamps are now stored as UTC ticks; a new test
  (`FilterByCreatedAt_WithANonUtcParameter_ComparesTheSameInstant`) fails with the old converter.
- **Fixed:** the restore-on-boot wiring was untested. It now lives in `provideDemoMode()`, which the app
  and the shell test both use; the new test fails without the initializer.
- **Fixed:** 409 popups were titled "Already changed"; they are now "Already exists" (duplicates are the
  known conflicts in AB#1429). README seeding wording and the environment comment now match the code.
- **For AB#1466 to decide:** the architecture test keeps EF Core out of Application, so list queries go
  through Application-defined repositories or query abstractions; validation failures are one joined
  description, so per-field errors need a contract before the create form is built.
- **Accepted as is:** `Microsoft.FeatureManagement` registered with no flags (AB#1466 adds the first);
  the welcome copy describes Demo Mode behaviour that AB#1429 delivers.

## PR review (PR 727, 2026-10-23)

- **Thread 4268 — Fix:** client files must live in `client/`, with only solution-level files at the root.
  The root `package.json`/`package-lock.json` were removed; `client/package.json` now owns the combined
  `npm start` (API + `ng serve` via `concurrently`), and the gate runs the client checks through
  `FRONTEND_DIRS = ["client"]` in `verify.mjs` (human-owned, approved by Tyler Pieterse). ADR 0001's
  evidence was corrected (approved) and re-measured: gate 16/16, frontend checks run in `client/`.
- Scope: AB#1464's run-command AC changed from "at the repository root" to "in `client/`" at the
  reviewer's direction; no re-estimate (a relocation of existing scripts).
- Smoke test: `npm start` in `client/` served the client on 4200 and proxied `/api/v1` to the API on 5000.
- The governance tree is now committed (Tyler Pieterse removed its `.gitignore` rules); the frame
  approvals went in their own commit.
- `.gitignore` (changed at Tyler Pieterse's direction, 2026-10-23): `.mcp.json` is no longer ignored and is
  committed (it holds no secret; the token comes from `ADO_MCP_AUTH_TOKEN`). The macOS `Icon` rule was
  removed rather than restored to `Icon\r\r`, because `.gitattributes` normalises line endings and would
  strip the carriage returns. The icon component moved back to `common/components/icon/`.
