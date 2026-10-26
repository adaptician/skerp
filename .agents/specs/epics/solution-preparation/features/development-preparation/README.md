# Development preparation — Feature plan (AB#1431)

## Outcome

Everything feature work needs before it starts:

- an approved Figma design system and core screens, at desktop and mobile;
- a .NET 10 backend skeleton in Clean Screaming Architecture, with mirrored tests;
- an Angular 21 client skeleton on the three-layer token architecture;
- one command to run both, documented in the root README.

After this Feature ships, Stories under AB#1429 can be picked up without inventing infrastructure.

## Decision boundary

**In scope**

- **Design:** mobile frames at 576px and desktop frames at 1400px, confirmed by the product owner on
  2026-10-22 ([`asmp-1463-mobile-frame-width`](../../../../../assumption-ledger/asmp-1463-mobile-frame-width.md)). The Figma file, variables, components and screens described in the designer prompt
  [`docs/prompts/design-system-designer-prompt.md`](../../../../../../docs/prompts/design-system-designer-prompt.md).
- **Backend:** the .NET solution under `src/` and the test projects under `tests/`. This covers:
  - the Domain, Application, Infrastructure and Api layers, and an architecture test;
  - the minimal-API host with the `/api/v1/` prefix, and Swagger and Swagger UI;
  - EF Core SQLite with migrations and seed applied on startup;
  - the Result pattern and a global exception handler;
  - `Directory.Build.props`.
- **Client:** the Angular client in `client/` ([ADR 0001](../../../../../adrs/0001-angular-client-in-client-folder.md)),
  using SCSS with SSR disabled, with:
  - the token partials (`_colors`, `_themes`, `_typography`, `_spacing`, `_breakpoints`) populated from
    the approved Figma variables;
  - Vitest and Angular Testing Library, lint, and an API proxy;
  - a typed Result-unwrapping API client and the shared popup error message.
- **Onboarding:**
  - one run command;
  - the backend and frontend checks wired into `verify.mjs`, which is human-owned, so a human authorises
    the change;
  - the root README onboarding section the Deliverable lists. The README is also human-owned.

**Out of scope**

- Purchase-order entities and endpoints (AB#1466 onwards).
- The navigation header, Demo Mode and the landing screen as code (AB#1465).
- Authentication, deployment, CI pipelines, Docker, rate limiting and concurrency safety (all excluded by
  the Deliverable).
- SignalR hubs. They are registered only when a feature needs live updates.
- Dark mode.

## Evidence

| Claim | Tier | What settles it |
|---|---|---|
| .NET SDK 10.0.100 and Node 24.19.0 (pinned in `global.json`, `.tool-versions`) run Angular 21 and EF Core SQLite together on the demo machine | assumed | AB#1464's tracer bullet builds and tests green on a clean clone |
| The gate's frontend checks detect and run the client under `client/` without changes to `verify.mjs` | assumed | AB#1464 shows lint and tests running in the gate; see [ADR 0001](../../../../../adrs/0001-angular-client-in-client-folder.md) |

## Work-item decomposition

| ADO | Type | Primary slug | Points | Adds |
|---|---|---|---|---|
| AB#1463 | Design | `design-system-and-core-screens` | 8 | The Figma design system, the nine common components, and the landing, list, create and edit screens at desktop and mobile |
| AB#1464 | Spike | `solution-setup` | 13 | Backend foundation, client foundation, the one-command run, the gate wiring and the onboarding README |

**Design artefact.** AB#1463's Figma file is
[`Skerp`](https://www.figma.com/design/yzLk80i2s6D2NaP0CO0Irc/Skerp) (key `yzLk80i2s6D2NaP0CO0Irc`). Its
spec and handover — every component and screen frame with its node ID — are in
[`design-system-and-core-screens/spec.md`](design-system-and-core-screens/spec.md). The frames await
stakeholder approval.

**Order.** AB#1463 and the backend half of AB#1464 can proceed in parallel. The client token work in
AB#1464 waits for AB#1463's approved variables.

## Observable proof

- **Positive:** on a clean clone, follow only the README. One command starts both apps; Swagger UI
  responds; the client loads and a deliberately failing API call shows the popup error message;
  `node .agents/scripts/verify.mjs` reports the backend and frontend checks as run and passing.
- **Negative:** an endpoint that throws returns a generic 500 Result body with no stack trace or
  internal detail. An architecture test fails if Domain references another layer.

## Completion boundary

- Every frame AB#1463 delivers is marked Ready for dev and recorded as approved in
  `.agents/standards/solution/figma-screen-index.json`. `solution/figma.md` names the file. That file is
  human-owned, so a human updates it.
- The gate runs build, format, test, lint and client tests, with none skipped for missing tooling.
- The README covers every item in the Deliverable's *Solution setup* list.
