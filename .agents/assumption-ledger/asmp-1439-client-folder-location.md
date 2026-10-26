---
status: settled
tier: assumed
claim: >
  The Angular client's location is undecided: the solution-preparation brief says `client/`, while
  repository-structure.md says all production source lives under `src/`.
settles: >
  A human picks `client/` (recorded as a deviation) or a path under `src/` when AB#1439 is planned.
outcome: >
  Product owner decision (2026-10-22): the Angular app lives under client/ and the .NET projects live under src/. This is recorded as ADR 0001 (.agents/adrs/0001-angular-client-in-client-folder.md), a deliberate deviation from repository-structure.md.
---
# Angular client folder

`.agents/specs/epics/solution-preparation/brief.md` asks for "an Angular app with Typescript under
`client/`"; `.agents/standards/repository-structure.md` → `src/` says all production source code lives
under `src/`. AB#1439 (client foundation), AB#1440 (run command and README) and the `verify.mjs` frontend
check all depend on the path.

## Re-planned 2026-10-22

The backlog was condensed. AB#1439 and AB#1440 are now Removed and merged into Spike AB#1464 (Solution setup). Decide when AB#1464 is planned.

## Settled 2026-10-22

Product owner decision (2026-10-22): the Angular app lives under client/ and the .NET projects live under src/. This is recorded as ADR 0001 (.agents/adrs/0001-angular-client-in-client-folder.md), a deliberate deviation from repository-structure.md.
