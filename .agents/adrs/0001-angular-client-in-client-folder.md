---
id: ADR-0001
title: Angular Client in client/, .NET Projects in src/
aliases: [ADR-0001]
status: Accepted
evidence: measured
decided: 2026-10-22
implemented: 2026-10-22
evidence-note: >
  Measured 2026-10-23 on branch feat/solution-preparation/app-shell-landing-navigation: with
  FRONTEND_DIRS = ["client"] in verify.mjs (human-approved by Tyler Pieterse), `node .agents/scripts/verify.mjs`
  runs frontend lint, tests and format check in client/ directly, none skipped. First measured
  2026-10-22 through a root package.json, removed on PR review so client files live in client/.
supersedes: []
superseded-by: []
depends-on: []
tags: [repository-structure, client, layout]
---

# ADR 0001 — Angular Client in client/, .NET Projects in src/

## Date

2026-10-22

## Status

Accepted (2026-10-22; was Provisional until AB#1464 measured the gate running the client checks)

## Context

`.agents/standards/repository-structure.md` says all production source lives under `src/`. The
solution-preparation brief (`.agents/specs/epics/solution-preparation/brief.md`) asks for the .NET
solution under `src/` and the Angular app under `client/`. The two disagree, and the choice fixes paths
for the run command, the quality gate, the README and every client Story. The product owner was asked to
decide (assumption-ledger entry `asmp-1439-client-folder-location`).

## Decision

We will place the Angular 21 client in a top-level `client/` folder, a sibling of `src/`. All .NET
projects live under `src/`, with their mirrored test projects under `tests/`. This is a deliberate
deviation from `repository-structure.md` for this solution only.

## Options Considered

- **Option A: `client/` at the root, .NET under `src/` (chosen).** The client and server are separate
  toolchains with separate package managers, and each sits in its own root folder.
  - Pros: matches the product owner's brief; a clear client–server split; npm tooling never scans the
    .NET tree.
  - Cons: deviates from the standard; the gate's frontend checks must find `client/`.
- **Option B: the client under `src/` (e.g. `src/client/`).** This follows the standard.
  - Pros: no deviation.
  - Cons: contradicts the brief; mixes npm and .NET roots inside one folder.

## Rationale

The product owner ruled for Option A. A clear client–server split is worth a documented, single-solution
deviation, and keeping the toolchains apart simplifies the one-command run and the gate configuration.

## Consequences

- **Benefits:** each toolchain has its own root, and the run command and README stay simple.
- **Trade-offs / risks:** the gate's frontend checks currently run `npm --prefix .`. If they do not pick
  up `client/`, `verify.mjs`, which is human-owned, needs a human-approved change. This is why the
  status is Provisional.
- **Follow-up:** Spike AB#1464 (Solution setup) creates `client/` and confirms that the gate runs the
  client's lint and tests. Once that is shown, move this ADR to Accepted with evidence `demonstrated`.

## Related Documentation

- `.agents/standards/repository-structure.md`
- `.agents/specs/epics/solution-preparation/brief.md`
- `.agents/assumption-ledger/asmp-1439-client-folder-location.md`
- `.agents/specs/epics/solution-preparation/features/development-preparation/README.md`

## Evidence

The gate's frontend checks are configured for `client/`: `FRONTEND_DIRS = ["client"]` in
`.agents/scripts/verify.mjs`, changed with Tyler Pieterse's approval on 2026-10-23. Every client file,
including `package.json`, lives in `client/`; only solution-level files stay at the root.

History: AB#1464 first met the claim on 2026-10-22 without editing the gate, through a root `package.json`
that delegated to `client/`. PR review (PR 727) asked for the client files to be nested in `client/`, so
that root file was removed and the gate was pointed at `client/` instead.
