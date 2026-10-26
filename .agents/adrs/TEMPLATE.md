---
id: ADR-NNNN
title: <Short Decision Title>
aliases: [ADR-NNNN]          # REQUIRED, must contain the id — see adrs/README.md
status: Proposed             # Proposed | Provisional | Accepted | Superseded | Deprecated
evidence: assumed            # measured | demonstrated | derived | assumed
decided: YYYY-MM-DD
implemented: null            # ISO date | null (not implemented) | undated (running, date unrecorded)
evidence-note: >             # REQUIRED unless evidence is `measured`
  One sentence naming precisely what is not yet evidenced.
supersedes: []
superseded-by: []
depends-on: []
tags: []
---

# ADR NNNN — <Short Decision Title>

<!--
Replace NNNN with the next zero-padded sequential number (e.g. 0007), in both the
filename and the `id`/`aliases` frontmatter above. Replace the title with a short
noun phrase describing what was decided (e.g. "Postgres as Primary Store"). The
filename should match: NNNN-kebab-case-version-of-the-title.md
-->

## Date

YYYY-MM-DD

## Status

Proposed

<!--
Status values:
- Proposed: under discussion; not yet in force.
- Provisional: in force, but a load-bearing claim it rests on is still `assumed`.
  See adrs/README.md "Evidence tiers".
- Accepted: in force, and its load-bearing claims are measured/demonstrated/derived.
- Superseded by NNNN: replaced by a later ADR. Keep the original text intact.
- Deprecated: no longer in force, no replacement ADR exists.

Status transitions are append-only edits — never rewrite the Context,
Decision, or Consequences when changing status. Keep this section's value in
step with the frontmatter `status` field above; the quality gate reads the
frontmatter.
-->

## Context

State the problem, the forces at play, and the constraints. Why does a decision need to be made? What conditions or pressures — technical, organizational, regulatory, time — shape the choice? Be specific about the situation as it is today; do not assume the reader has prior context.

## Decision

State, in a single declarative paragraph, what is being decided. Use active voice ("We will use Postgres as the primary store"). Avoid hedging language.

## Options Considered

List the options that were evaluated. For each, give a brief description and the main reasons it was or was not chosen. Include rejected options — the absence of a rejected option from the historical record makes future re-litigation harder than it should be.

- **Option A — <name>**: brief description. Pros: …  Cons: …
- **Option B — <name>**: brief description. Pros: …  Cons: …
- **Option C — <name>**: brief description. Pros: …  Cons: …

## Rationale

Explain why the chosen option was selected. This is the connective tissue between the Context, the Options, and the Decision. Cover the key trade-offs the decision accepts; name the criteria that drove the choice; acknowledge what was sacrificed.

## Consequences

State the consequences of the decision — both intended and incidental. Include benefits, trade-offs, risks, and follow-up work. Make any commitments this decision implies for future work explicit.

- **Benefits**: …
- **Trade-offs / risks**: …
- **Follow-up**: …

## Related Documentation

Link to the code, READMEs, external resources, or other ADRs that this decision depends on or relates to. Use repository-relative paths where possible.

- `src/<area>/README.md`
- `.agents/adrs/NNNN-related-decision.md`
- `.agents/specs/<feature-slug>/requirements.md`
- External: <link>
