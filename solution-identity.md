# Solution Identity

A solution commonly has two names that are not the same word, for good reasons: the public brand
may not be decided yet, an available domain may not be confirmed, or the solution may need to prove
itself before it earns formal branding. This file is the single, easy-to-reference place both names
live, so contributors and agents never have to guess which one applies or invent a third variant.

## Current

| | Name |
|---|---|
| **Alias** (code name) | `Skerp` |
| **Brand name** (public) | `Sharp ERP` |

## Where each name is used

**Alias** — everywhere the audience is a contributor or a system, not an end user:

- documentation, including `docs/`, `README.md`, and every `.build/` guide;
- planning specs, ADRs, plans, and diagrams under `.agents/`;
- code comments, class/namespace/package names, and code artefacts (assemblies, container image
  names, repository name);
- CI/CD pipeline names, environment names, and internal tooling.

**Brand name** — everywhere the audience is an end user, i.e. any copy text:

- emails, site text, marketing pages;
- error messages and user-facing dialogs — see `.agents/standards/client.md`;
- footers, disclaimers, and legal notices.

When in doubt, ask: would an end user read this? If yes, brand name. Otherwise, alias.

## Why this file, and not just "the repo name"

The repository is typically named after the alias, but this file — not the repository name — is the
canonical source. A repository can be renamed or mirrored; a generated artefact, an agent session, or
a contributor working from a checked-out copy under a different local folder name should still be
able to find the current names here rather than inferring them from a path.

## Version history

**Append-only.** If either name changes, add a row below — never overwrite or delete a prior row. A
rename is a deliberate, human-approved decision (see `.agents/owned-by-humans.md`); this table is how
it stays traceable, the same way `.agents/adrs/` and `.agents/run-log/` never overwrite history.

| Date | Field | Old value | New value | Reason |
|---|---|---|---|---|
| — | — | — | — | _No renames yet._ |
