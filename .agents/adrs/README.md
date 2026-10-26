# Architecture Decision Records (ADRs)

This directory holds Architecture Decision Records — short documents that capture significant architectural decisions made on the project, the reasoning behind them, and their consequences. ADRs are the long-term memory of *why* the system is shaped the way it is.

## When to write an ADR

Write or update an ADR when the change introduces or modifies a significant architectural decision. Triggers include:

- choosing a payment provider, queue, or other significant external dependency
- introducing a new package or framework with cross-cutting impact
- changing persistence strategy (storage engine, ORM, schema approach)
- changing messaging or eventing patterns
- changing authentication or authorization flow
- introducing background processing
- changing deployment or runtime assumptions
- introducing a mock/fake provider strategy
- accepting a meaningful technical risk

Do not write ADRs for trivial implementation details (variable naming, formatting, single-file refactors). If a decision affects only one item and won't be re-encountered elsewhere, capture it directly in that item's own `spec.md` instead (see `.agents/specs/README.md`).

## Format

ADRs follow Michael Nygard's classic three-section flow (Context → Decision → Consequences), extended with Date, Status, Options Considered, Rationale, and Related Documentation. Use `.agents/adrs/TEMPLATE.md` as the starting point for every new ADR.

## Naming convention

```
NNNN-short-decision-name.md
```

- `NNNN` is a zero-padded sequential number starting at `0001`.
- The slug uses lowercase kebab-case and describes *what was decided*, not the question being asked. Prefer "postgres-as-primary-store" over "choose-a-database".
- Numbers are never reused — not after a supersession, and not after a deletion. If an ADR is superseded, the original keeps its number and the new ADR takes the next available number. See [ADRs are never deleted](#adrs-are-never-deleted-and-their-numbers-are-never-reused).

Examples:

- `0001-record-architecture-decisions.md`
- `0014-postgres-as-primary-store.md`
- `0023-mediatr-for-application-layer.md`

## Status lifecycle

An ADR's `Status` field uses one of these values:

- **Proposed** — under discussion; the decision has not been ratified.
- **Provisional** — **in force, but its load-bearing claims are not yet evidenced.** Follow it; expect to overturn it cheaply if a probe contradicts it, and re-evaluate when that probe returns.
- **Accepted** — the decision is in force, **and** its load-bearing claims are `measured`, `demonstrated`, or `derived` from those.
- **Superseded by NNNN** — replaced by a later ADR. The text remains but its decision is no longer in force.
- **Deprecated** — the decision is no longer in force, but no replacement ADR exists. Used when something was removed without a successor.

Status transitions are append-only edits: change the `Status` field value, but keep the original Context / Decision / Consequences intact. The historical record matters. Keep the frontmatter `status` and the `## Status` section in step — the quality gate reads the frontmatter.

## ADRs are never deleted, and their numbers are never reused

A decision that no longer applies is marked `Superseded by NNNN` (with the replacement named) or `Deprecated` (with the reason), and **stays in this directory**. Deleting an ADR removes the only record of why something was decided or ruled out; the next session then honours, contradicts or re-creates it blind. The cost of a retired ADR is a file; the cost of a deleted one is work built to a constraint that no longer exists.

- **Never delete an ADR file**, whatever its status.
- **Never reuse an ADR number**, including the numbers of the ADRs listed under [Retired ADRs](#retired-adrs) below. The next ADR takes the next number no file has ever held.
- **Never rename an ADR file.** Citations link the filename; a rename breaks them silently.

`verify.mjs` enforces this from git history (`check-context-health.mjs adr-history`): it fails when an ADR filename that has ever been added on the current history is missing, or when one number has been held by more than one filename — naming the file and the number. The only allowance is the Retired ADRs table below, which records deletions that predate the rule.

### Retired ADRs

ADRs deleted before this rule existed, if the solution has any, are listed here so the gate allows their absence. Their text is recoverable from git history (`git show <commit>^:.agents/adrs/<filename>`). The gate reads the **Filename** column. **Only a human adds a row here** — an agent must never add a row to make the gate pass. A solution that never deleted an ADR leaves the table empty.

| Filename | Status when deleted | Deleted in | Number now held by |
|---|---|---|---|
| _none_ | | | |

Where a retired number was later reused, anything written before this rule that cites it by number may mean either ADR — check the surrounding date and subject.

## Citing an ADR

**Cite an ADR by a Markdown link to its file, never by a bare number in prose.** Write `[0003-postgres-as-primary-store.md](../adrs/0003-postgres-as-primary-store.md)`, not "ADR-0003" or "ADR 3". A number alone cannot say which decision is meant if a number was ever reused, and a link to a file that no longer exists is caught by the link check in `verify.mjs` rather than silently misleading. The `[[ADR-NNNN]]` wikilinks in an ADR's own frontmatter and the generated `adr-index.md` tables are the tooling's convention and are exempt.

## Evidence tiers

Every claim another decision depends on — a **load-bearing** claim — carries an evidence grade. This exists so the lifecycle above can distinguish a decision that has been *tested* from one that has only been *argued*; without it, an unimplemented record carries the same authority as one proven in production.

| Tier | Meaning |
|---|---|
| `measured` | A number from a run. Cite it. |
| `demonstrated` | A working slice a human exercised. |
| `derived` | Follows necessarily from something `measured` or `demonstrated`. |
| `assumed` | Believed, untested. **The default for anything new.** |

Four rules give the grades force:

1. **An `assumed` claim may not constrain a design.** It may only generate a probe (a Spike, or an Analysis/Spike-equivalent work item). This is what gives a named unknown the power to block work that depends on it.
2. **`Accepted` + `assumed` is invalid** and fails the quality gate. Use `Provisional`.
3. **Only load-bearing claims carry a tier.** Tagging ordinary prose is prohibited — it makes the mechanism theatre, which is worse than not having it.
4. **Verify a surprising negative before reporting it.** An absence that would surprise whoever built the thing is evidence about your instrument, not about the system. Check a second way first.

## Frontmatter

Every ADR opens with a YAML block, machine-read by [`.agents/scripts/generate-adr-index.mjs`](../scripts/generate-adr-index.mjs) and gated by `verify.mjs`. Copy it from [`TEMPLATE.md`](TEMPLATE.md).

```yaml
---
id: ADR-0001
title: Short Decision Title
aliases: [ADR-0001]          # REQUIRED, must contain the id — see "Wikilinks and aliases" below
status: Proposed             # Proposed | Provisional | Accepted | Superseded | Deprecated
evidence: assumed            # measured | demonstrated | derived | assumed
decided: 2026-01-01          # date the decision was taken
implemented: null            # ISO date | null (not implemented) | undated (running, date unrecorded)
evidence-note: >             # REQUIRED unless evidence is `measured`
  One sentence naming precisely what is not yet evidenced.
supersedes: []
superseded-by: []
depends-on: []
tags: []
---
```

Field rules:

- `evidence-note` is **mandatory** unless `evidence: measured`. State what is unevidenced, not why it is probably fine.
- `implemented: undated` means the decision is running but its first-run date was never recorded. It counts as implemented. Do **not** invent a date — that manufactures evidence.
- **Split claims** — part of a decision evidenced, part not — go in `evidence-note` rather than being forced into a single tier.
- Link fields use wikilinks (`[[ADR-0001]]`) so backlinks resolve in tools that follow them (e.g. Obsidian, if used to browse this folder). Where a supersession is partial, name the part in parentheses.
- A `depends-on` entry pointing at no existing ADR fails the gate.
- Quote a link entry as a **single scalar**: `['[[ADR-0001]] (the part superseded)']`. Writing `["[[ADR-0001]]" (the part)]` is invalid YAML.

### Wikilinks and aliases

`aliases` is **required** and must contain the record's own `id`. The gate enforces it. If this folder is browsed in Obsidian, note that Obsidian resolves `[[ADR-0001]]` to a note named **exactly** `ADR-0001` — not to `ADR-0001-full-slug.md`. Without the alias, every wikilink is *unresolved*, and clicking one creates an empty stub note.

## Updating an ADR vs writing a new one

- **Update the existing ADR** for clerical changes only — fixing a typo, repairing a broken link, clarifying phrasing that does not change meaning.
- **Write a new ADR that supersedes the old one** whenever the decision itself changes. The new ADR cites the old one in its *Context*; the old ADR's *Status* is updated to `Superseded by NNNN`.

This rule keeps each ADR atomic — a single decision, captured at a single point in time — and makes the audit trail readable.

## Cross-referencing

- A Feature-level plan or item `spec.md` should cite the ADRs it depends on. If the work *triggers* a new ADR, it links to it there.
- A cross-cutting Plan (`.agents/plans/<slug>.md`, per `.agents/standards/plans.md`) should cite ADRs whose decisions constrain its design, in *Context and Orientation* or *Interfaces and Dependencies*.
- ADRs may cite other ADRs (especially the one being superseded), the relevant code (with repo-relative paths or component READMEs), and external documentation.
- Code-level READMEs may cite ADRs in their *Design Notes* section to explain *why* the component is shaped a particular way.

## Working through the agent workflow

Before proposing a decision that touches architectural shape, check existing ADRs in this directory. If an ADR already constrains the decision, follow it; if you must transgress it, that is a signal the existing ADR should be superseded — write a new one rather than silently violating the old. The "Workflow" section in the root `AGENTS.md` enforces this practice as part of the standard implementation loop.

## Index

This directory is intentionally flat — ADRs sort by filename. To browse, list the directory; the numerical prefix gives chronological order.

**There is no hand-maintained index.** [`adr-index.md`](adr-index.md) is **generated** by [`.agents/scripts/generate-adr-index.mjs`](../scripts/generate-adr-index.mjs) from the frontmatter and checked by `verify.mjs` — a stale index fails the gate. Never edit it by hand; it does not exist until the first ADR is written. Its first two tables are the ones worth reading:

1. **Provisional decisions with dependents** — decisions being relied upon whose load-bearing claims are untested.
2. **Accepted but unimplemented** — decisions in force that nothing has yet exercised.
