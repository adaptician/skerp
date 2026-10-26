# AGENTS.md

Entry point for AI coding agents working in this repository. This file is the
discoverable root of the solution's conventions: it states the always-apply rules
inline and routes to the detailed standards under `.agents/`. Read it in full at
the start of every session.

> **Canonical source.** This root `AGENTS.md` is the single source of truth for
> agent conventions. `CLAUDE.md` at the root is a generated mirror of this file
> (Claude Code reads `CLAUDE.md`; Codex and most other tools read `AGENTS.md`).
> Edit this file, then regenerate the mirror with
> `node .agents/scripts/sync-claude-md.mjs`. Never hand-edit `CLAUDE.md`.

---

## Repository overview

Grimoire-Init is a stack-agnostic scaffold that ships an agent-governance framework:
layered standards, an architectural-decision record, per-feature specs, human-owned
guardrails, and reusable agent skills. It is not tied to a particular language or
framework — the framework is dropped into a real solution, and the rules below describe
how new and modified code should look there. "Solution" is this repo's term for the
codebase as a whole (one repository is one solution); "project" is reserved for
code-level project references — a .NET project, an Angular workspace project — never for
the repository as a whole. The solution's top-level layout (`src/`, `tests/`, `docs/`,
`.build/`, and the rest) is defined in
[`.agents/standards/repository-structure.md`](.agents/standards/repository-structure.md).

**Standards are split into general and technology-specific.** Durable,
technology-agnostic discipline lives in the category standards under
`.agents/standards/` (for example `backend.md`, `client.md`, `api.md`). Concrete stack
conventions live under [`.agents/standards/technologies/`](.agents/standards/technologies/)
(for example `c-sharp.md`, `angular.md`) and are indexed by the category standard they
specialise. Unused technology files stay in place — they cost nothing and are ready if the solution later adopts that technology. A file's presence is not a decision to use it: stack choices are made with a human, and an agent treats a standard as in scope only when the solution actually uses it.

**Example stack shipped with this scaffold** (replace under `technologies/` to match
your solution):

- Backend: .NET 9, ASP.NET Core, EF Core, PostgreSQL
- Frontend: Angular 21+, NgRx

If you are introducing this framework into an existing solution, **inspect the
repository first** (frameworks, versions, database, ORM, test frameworks, package
managers, build/test commands), then add or replace the files under `technologies/` to
match. Do not "upgrade" or refactor a solution merely to satisfy this file; treat these
as target conventions for future work unless a task explicitly asks for migration.
Adding the scaffold to a new solution, pulling scaffold updates into one that already has
it, or onboarding a legacy codebase are exactly the jobs of
[`sync-scaffold`](.agents/skills/sync-scaffold/SKILL.md) — run it rather than improvising
the equivalent checks by hand.

---

## Always-apply rules

These hold on every task, regardless of area.

**Align incrementally, don't rewrite.** These rules define preferred conventions
for new and modified code. Where existing code diverges: follow the local pattern
for small changes, improve toward these conventions when already touching the
area, and avoid broad unrequested refactors. Document any significant deviation in
your final response.

**Respect the human-owned boundary.** Some files govern the agent's behavior, the
solution's rules, or irreversible state. They must not be modified without explicit
human authorization naming the file and the change. The list and the authorization
procedure live in [`.agents/owned-by-humans.md`](.agents/owned-by-humans.md); it
includes this file, `CLAUDE.md`, the standards, accepted ADRs, hook and MCP
configuration, committed migrations, lockfiles, secrets, and CI/release config. If
a task would touch one, **pause, name the file and the proposed change in plain
language, and wait for an explicit "yes"** — do not proceed on implicit assent. One
tier is stricter: `.humans/**` is **hook-enforced** and cannot be edited by an agent
at all, even with approval — describe the change and propose the content for a human
to apply. The same boundary is enforced VCS-side by the repo-root `CODEOWNERS`.

**Never commit to an environment branch.** `main`, `qa` and `production` are deployment
targets, not workspaces — see [`.agents/standards/commits.md`](.agents/standards/commits.md)
→ *Environment Branches*. Before making a change, confirm the current branch is not one of
these. If you find yourself checked out on an environment branch, you are in the wrong
place: **do not commit there**. Consult the work item's plan or spec for which branch to
use; if that is not clear, **stop and ask a human** rather than guessing a branch name and
proceeding. This applies regardless of how small the change is.

**Verify before you hand off.** Run the quality gate (see *Build, test, and
verification* below) and fix failures before marking any task done. A rule that
matters is checked by something that runs — not left to the reviewer.

**Behavioural hooks are active.** The repo ships hook scripts (`.claude/hooks/`,
wired by `.claude/settings.json` and reused by Codex via `.codex/`): pre-tool guards
that block destructive `git`/`rm` commands and writes to hook-enforced human-owned
paths, a post-edit formatter, and a `Stop` hook that runs the fast quality gate
(`verify.mjs --fast`) and blocks hand-off if it fails. See
[`.claude/hooks/README.md`](.claude/hooks/README.md).

---

## Standards — read what the task touches

Before changing code, read the standards relevant to the affected area; if a task
touches several areas, read all of them. The full index — the category standards and
the stack-specific conventions under `technologies/` — is in
[`.agents/standards/README.md`](.agents/standards/README.md). Adding or renaming a
standard updates that index, not this file.

**Unknown convention?** Inspect nearby code, check official framework guidance,
propose a convention, and document it in the relevant standard or nearby README.

---

## Workflow

At session start, read every file in [`.agents/context/`](.agents/context/) for
orientation — it is small by design and meant to be read in full.

Before implementing:

1. Read the work item and its parent Feature/Epic/Deliverable from ADO, or the user request. Scoping a
   brand-new Deliverable may start with `plan-deliverable`'s interview when a structured intake is the
   right tool — this is optional, never a gate; a human may also build the Deliverable and its Epics
   directly in ADO. Planning an Epic or Feature-sized request runs `plan-epic`; planning a User Story or
   Spike runs `plan-work-item` — see [`.agents/skills/README.md`](.agents/skills/README.md).
2. Read the relevant standards. If the item has a spec under `.agents/specs/`, its Feature-level plan's
   evidence table and the spec's own scope are the curated context to read; otherwise use the index
   linked above.
3. Check existing ADRs in [`.agents/adrs/`](.agents/adrs/adr-index.md) for constraints, and any load-bearing `assumed` claim in
   [`.agents/assumption-ledger.md`](.agents/assumption-ledger.md). An `assumed` claim may not constrain a
   design — `plan-work-item` refuses to plan past one. If a change would transgress an accepted ADR,
   write a new ADR that supersedes it — do not silently violate it.
4. Inspect nearby code and read nearby `README.md` / `AGENTS.md` for the area.
5. Check each impacted file against `.agents/owned-by-humans.md`; pause and request authorization if any is listed.
6. For work at 5 points or above, write or update the item's spec per
   [`.agents/specs/README.md`](.agents/specs/README.md) before implementing. Below 5 points, plan
   directly in ADO — no spec file.

While implementing: follow existing patterns unless they conflict with documented
standards; implement incrementally; run the most relevant build/test commands;
validate migrations when persistence changes; keep documentation, feature-folder
files, ADRs, and Mermaid diagrams current as the work demands.

The full workflow, the partial-work/stopping-point rules, the code-level
definition of done, and the code-review sequence are in
[`.agents/standards/agent-workflow.md`](.agents/standards/agent-workflow.md).

### Before completing any task

Verify or explain each of these (the authoritative checklist is in
`agent-workflow.md`):

- the relevant code builds, with no new warnings;
- tests were added or updated where appropriate, and the suite passes;
- nearby documentation, ADRs, and Mermaid diagrams were created or updated, or state why none was needed;
- the [`.agents/context/`](.agents/context/) pack was updated **if the change invalidated it** — a new build/run/test command updates `tech-quickref.md`; a shift in the active work area updates `current-focus.md`; a new domain term updates `glossary.md`; a structural change updates `operational-map.md` — or state why none was needed;
- the item's spec (or the Feature-level plan it falls under — see [`.agents/specs/README.md`](.agents/specs/README.md)) is current, and any load-bearing assumption made is recorded in [`.agents/assumption-ledger.md`](.agents/assumption-ledger.md);
- the run log has an entry for the work (`.agents/run-log.md`);
- the quality gate below was run and is green;
- the `conformance-review` skill was run as the final in-session check — it runs the full gate, walks the review categories in `agent-workflow.md`, and confirms the Definition of Done. Before a PR to `main`, `coherence-review` also runs, in a separate session with no build memory — see [`.agents/skills/README.md`](.agents/skills/README.md).

---

## Build, test, and verification

> **Quality gate.** Run the whole gate with one command before handing off:
>
> ```
> node .agents/scripts/verify.mjs
> ```
>
> It auto-detects which checks apply to the current state of the repository, runs
> every applicable one, and **fails (exit 1) if any fail**. Checks that do not
> apply — or whose tooling is absent — are skipped *loudly* and counted; a skip is
> never a silent pass. Run `node .agents/scripts/verify.mjs --list` to see what
> would run. This is the executable form of the "Verify before you hand off" rule
> above: fix failures before marking work done.

The gate currently wraps:

- Skills mirror in sync: `node .agents/skills/sync-to-claude.mjs --check`
- CLAUDE.md mirror in sync: `node .agents/scripts/sync-claude-md.mjs --check`
- Backend build: `dotnet build` *(active once a .NET project exists)*
- Backend format: `dotnet format --verify-no-changes` *(active once a .NET project exists)*
- Backend tests: `dotnet test` *(active once a .NET project exists)*
- Frontend lint and tests: `npm run lint`, `npm test` *(active once an Angular app exists)*

Standards become executable as the solution gains the code to enforce them: warnings-as-errors, nullability, and analyzers via `Directory.Build.props` and `.editorconfig` (surfaced by the build and format checks); layer-boundary rules via an architecture test under the test check; consistent line endings via `.gitattributes`. Add a check above when a standard gains a new executable form, and run a single check ad hoc with its own command during development.

---

## Specs, ADRs, and the ledgers

Planning artefacts live under `.agents/specs/` at the altitude the work calls for — an Epic overview, a
Feature-level plan, or a one-page item spec (no spec at all below 5 points) — never one fixed set of
files per feature. See [`.agents/specs/README.md`](.agents/specs/README.md) for the depth ladder, file
roles, and the Given/When/Then format.

Architecture Decision Records live under [`.agents/adrs/`](.agents/adrs/) (start from `TEMPLATE.md`),
carry an evidence tier (`measured` / `demonstrated` / `derived` / `assumed`), and use `Provisional`
status for a decision that is in force but not yet evidenced — see that directory's `README.md`.
`adr-index.md` is generated; never edit it by hand.

Two ledgers record what happened and what is still being taken on faith, written **during** the work,
not after: [`.agents/run-log.md`](.agents/run-log.md) (what changed, what surprised you) and
[`.agents/assumption-ledger.md`](.agents/assumption-ledger.md) (load-bearing assumptions, their evidence
tier, and what would settle them). Both are **generated** indexes — one entry per file in a sibling
directory, regenerated with `node .agents/scripts/generate-ledger-indexes.mjs`; never hand-edit the
index files themselves. `run-milestone` writes the entries and regenerates as it works.

---

## Agent skills

Reusable agent workflows live under [`.agents/skills/`](.agents/skills/), one
folder per skill with a `SKILL.md`. This is the **canonical** location, discovered
directly by Codex. **Claude Code does not read `.agents/skills/`** — it scans
`.claude/skills/`, which is a *generated mirror*. Author and edit skills only under
`.agents/skills/`, then regenerate with `node .agents/skills/sync-to-claude.mjs`
(use `--check` in pre-commit/CI). Mirrored files carry a `MIRROR — do not edit
here` banner. See [`.agents/skills/README.md`](.agents/skills/README.md).
