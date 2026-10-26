# Context Pack

This directory holds a small, curated set of documents that agents (and humans new to the project) read at the start of a working session for orientation.

It complements, but is distinct from:

- `AGENTS.md` (repo root) — the constitution (rules and workflow).
- `.agents/standards/` — per-area conventions.
- `.agents/adrs/` — architectural history.
- `.agents/specs/<feature>/` and `.agents/plans/` — in-flight work.

The context pack is none of those. It is the *quick warmup*: project vision, current focus, glossary, tech quickref — high-signal orientation that an agent would otherwise have to reconstruct from scratch on every session.

## How agents use this

Read every file in `.agents/context/` at session start, alongside the root `AGENTS.md`. Treat the pack as load-bearing context — current, opinionated, and small enough to read in full in a few minutes.

## Budget and lifecycle

`current-focus.md` has a **150-line budget**, enforced by `node .agents/scripts/verify.mjs`. It holds only the active work area, open decisions and live constraints. When an item finishes, remove its narrative and link where it now lives — its run-log entry (`.agents/run-log/`) or spec — rather than keeping it here; finished work left in this file is how stale claims stay in front of every session. Every relative link in this directory must resolve (also gate-checked), and ADRs are cited by filename link, never by bare number (see `.agents/adrs/README.md` → *Citing an ADR*).

## How humans add to this

See `.humans/writing-context.md` for what belongs here, what does not, the per-file template, and the lifecycle expectations.

## Initial state

This directory is intentionally empty (apart from this README) when a project is scaffolded from `Grimoire-Init`. Two files should be created early, before the project grows complex enough to make them hard to write:

- **`tech-quickref.md`** — as soon as build, run, and test commands are established. `AGENTS.md` records the stack; this file records how to operate it. An agent that cannot run the project cannot verify its work.
- **`current-focus.md`** — on day one, even if just a sentence: *"New project, no application code exists, standards apply from the first line."* This prevents agents from spending time on repository discovery against an empty codebase. Update it as priorities shift.

All other context files should wait until the project has a shape worth summarising.
