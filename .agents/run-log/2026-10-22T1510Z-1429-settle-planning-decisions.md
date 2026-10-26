---
work-item: AB#1429
summary: >
  Recorded five product-owner decisions: no price-range filter; 1–100 line items; create accepts Pending
  only; 576px mobile frames; client/ for Angular and src/ for .NET (ADR 0001).
---
# Settle the five planning decisions

## What changed

- **Assumption ledger:** all five entries are settled, each with an `outcome` and a *Settled* section.
  Their filenames are unchanged, because they are stable ids.
- **ADR 0001** (`adrs/0001-angular-client-in-client-folder.md`): Angular in `client/`, .NET in `src/`.
  It is a documented deviation from `repository-structure.md`. It stays Provisional until AB#1464 shows
  that `verify.mjs` runs the client checks. The ADR index was regenerated.
- **ADO:** Description and/or AC were corrected on AB#1433, AB#1464, AB#1466, AB#1467 and AB#1468, and
  AB#1463's Description was regenerated from the revised prompt. A decision summary comment was added
  on AB#1429.
- **Designer prompt** (`docs/prompts/design-system-designer-prompt.md`):
  - removed the price-range filter and the numeric-range input;
  - the creation status is now a fixed, read-only Pending pill;
  - added the 100-line limit states.
- **Plans:** the CRUD, State Machine and Development preparation plans carry the decisions in their
  decision boundaries. The settled rows were removed from the evidence tables. `current-focus.md` lists
  no open decisions.

## What surprised you

- The ADO MCP `update` action has no format option. A Markdown Description sent through it had its
  `<Category>/<Name>`-style placeholders stripped as HTML tags. Re-sending through `update_batch` with
  `format: Markdown` and escaped brackets fixed it (revision 3 of AB#1463).

## What you assumed

- Nothing new is load-bearing. The `verify.mjs` detection of `client/` is the only open claim, and ADR
  0001 tracks it.
