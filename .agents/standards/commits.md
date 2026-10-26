---
title: Commits
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Writing a commit message.
disposition: >
  mechanise — a commitlint commit-msg hook is documented here as an adoptable toolchain; wiring it by
  default would move this from review to hook enforcement.
last-reviewed: 2026-09-08
---
# Commits

Commit messages in this repository follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). The convention is enforced because:

- It makes the changelog generatable instead of hand-written.
- It drives semantic version bumps automatically (`feat` = minor, `fix` = patch, `BREAKING CHANGE` = major).
- It surfaces what each commit *does* in a single line that humans and agents can both reliably parse.

## Format

```
<type>[optional scope]: <short description>

[optional body — wrap at ~72 columns]

[optional footers]
```

Examples:

```
feat(api): add /health endpoint returning service status
fix(auth): reject empty Authorization headers instead of 500
docs(adrs): add ADR 0007 for choosing PostgreSQL
refactor(domain)!: rename UserContext to ViewerContext

BREAKING CHANGE: callers of UserContext must update to ViewerContext;
the legacy class has been removed.
Refs: ADR-0014
```

## Types

| Type | Use for | Semver impact |
|---|---|---|
| `feat` | A new user-visible feature or capability. | minor |
| `fix` | A user-visible bug fix. | patch |
| `docs` | Documentation only (no code change). | none |
| `style` | Formatting / whitespace; no behavior change. | none |
| `refactor` | Internal change that neither fixes a bug nor adds a feature. | none |
| `perf` | Performance improvement with no behavioral change. | patch |
| `test` | Adding or fixing tests; no production-code change. | none |
| `build` | Build system, dependencies, package config. | none |
| `ci` | CI configuration. | none |
| `chore` | Maintenance, tooling, repo hygiene. | none |
| `revert` | Revert a previous commit. | matches reverted commit |

A `!` after the type or scope marks a breaking change, regardless of type. So `feat!:`, `fix!:`, and `refactor!:` are all major-version bumps.

## Scopes

Scopes are project-specific. Use the smallest, most stable identifier that locates the change. Suggested scopes for this repo:

- Backend: `api`, `domain`, `infra`, `db`, `auth`, `worker`.
- Frontend: `ui`, `state`, `routing`, `forms`.
- Cross-cutting: `build`, `ci`, `deps`, `docs`, `tooling`, `agents`.

Add new scopes to this list as the codebase grows. If a change spans multiple scopes, prefer no scope over guessing.

## Breaking changes

A breaking change must be marked **both** ways:

1. With `!` after the type or scope in the subject line: `feat(api)!: drop /v1 endpoints`.
2. With a `BREAKING CHANGE:` footer explaining what broke and what the migration path is.

The footer is what semantic-version tools and CHANGELOG generators read; the `!` is a fast visual signal in `git log`.

## Subject line

- Imperative mood — "add", not "added" or "adds".
- No trailing period.
- Under 72 characters total (including type, scope, colon, and space).
- Describes *what changed*, not *why*. The why goes in the body.

## Body

Optional, but use it whenever the change needs context. Cover:

- The problem the change addresses.
- Why this approach was chosen, briefly — full design context belongs in an ADR or Plan, not in the commit body.
- Any caveats, follow-ups, or known limitations.

Wrap at 72 columns. Separate paragraphs with a blank line.

## Footers

Footers appear after the body, separated by a blank line. Each footer is a single line in `Key: value` form. Recognized footers:

- `BREAKING CHANGE: <description>` — what broke and the migration path.
- `Refs: ADR-NNNN[, ADR-NNNN]` — ADRs cited as the constraint or rationale for this change.
- `Spec: <feature-slug>` — the feature folder under `.agents/specs/` the change implements.
- `Closes #<issue>` / `Refs #<issue>` — link to the issue tracker (Gitea, Azure DevOps).
- `Co-authored-by: Name <email>` — co-author attribution.

## Reverts

When reverting, use `revert:` followed by the subject of the reverted commit, and include the reverted commit hash in the body:

```
revert: feat(api): add /health endpoint

This reverts commit a1b2c3d4. The endpoint returned 503 in production
under load; rolled back pending investigation.
```

## Changelog generation

The `CHANGELOG.md` at the repo root is generated from commits matching the conventional-commit format. The recommended tooling, in order of preference:

- **[`commit-and-tag-version`](https://github.com/absolute-version/commit-and-tag-version)** — single Node CLI, works on any CI provider, generates `CHANGELOG.md`, bumps versions, tags releases. The maintained successor to `standard-version`.
- **[Changesets](https://github.com/changesets/changesets)** — better suited to monorepos with multiple independently versioned packages.
- **[release-please](https://github.com/googleapis/release-please)** — strong fit when the host VCS supports its release-PR workflow (originally GitHub-only; check current compatibility for Gitea / Azure DevOps).

The choice of tool should be captured in an ADR when the project crosses the threshold of needing automated releases. Until then, the convention itself (Conventional Commits + a hand-maintained `CHANGELOG.md`) is sufficient.

## Commit-message linting

To enforce the format locally, add a [commitlint](https://commitlint.js.org/) `commit-msg` hook. The configuration `@commitlint/config-conventional` matches the rules described above. Document the chosen toolchain in `.agents/standards/tooling.md` (added by the "pinned tool versions" standard) when adopted.

## Friendly intro

For human contributors, a less reference-heavy walkthrough lives at `.humans/writing-commits.md`.

---

## Branching Strategy

This project uses **scaled trunk-based development**: a single protected main branch that is always deployable, with short-lived feature branches that merge back via pull request. Feature flags (defined in `.agents/standards/api.md`) serve as the release gate — incomplete features are deployed behind a disabled flag, not held on a long-lived branch.

### Why Trunk-Based

Trunk-based development is the current industry standard for teams practicing CI/CD. Long-lived branches (Gitflow's `develop`, `release`, `hotfix` model) defer integration, accumulate merge conflicts, and slow feedback loops. Short branches integrated frequently keep the main branch current and keep conflict surface small. The feature flag infrastructure already in this project makes trunk-based development viable without exposing incomplete work to users.

Gitflow is appropriate for projects with scheduled release cycles, heavily regulated approval pipelines, or teams that cannot use feature flags. None of these apply here by default. If project requirements change to warrant Gitflow, document the decision as an ADR.

### Branch Naming

Branches follow the convention:

```
{type}/{scope}/{short-description}
```

The `type` and `scope` segments mirror Conventional Commits — consistency between branch names and commit messages makes the history readable without cross-referencing:

```
feat/payments/invoice-submission
fix/auth/token-expiry-handling
refactor/domain/rename-viewer-context
chore/deps/update-ef-core-9-1
docs/agents/add-integration-standards
test/payments/invoice-handler-edge-cases
```

Rules:
- All lowercase, hyphen-separated words within each segment.
- The `scope` segment matches one of the commit scopes defined in this file.
- The `short-description` is brief (3–5 words) and describes the work, not the ticket number. Ticket numbers belong in commit footers (`Refs #123`), not branch names.
- Branch names must not contain spaces, dots, or special characters beyond hyphens and forward slashes.

### Check the Remote Before Starting Work on a Slugged Branch

Whenever a work item carries a slug field (`Custom.epicslug`, `Custom.FeatureSlug`, `Custom.PrimarySlug`, `Custom.MilestoneSlug`, or `Custom.Slug` on a Bug/Issue), the branch tied to that slug may already exist on the remote — another agent or a human operator may have started it. **Fetch and check before creating or switching to it:**

```
git fetch origin
git ls-remote --heads origin '<branch-name>'
```

- **If the branch does not exist**, create it as normal.
- **If it exists**, check its current state — the latest commit, how far it has progressed — against what the work is expected to look like right now.
- **If it aligns**, continue on it.
- **If it does not align** — the branch is further along than expected, has diverged in an unexplained way, or looks like someone else's in-progress work — **do not make changes on it.** Raise the discrepancy with a human and wait for confirmation of the correct path forward, rather than overwriting or guessing.

### Sync Before Opening a Pull Request

Before raising a PR, merge or rebase the current target branch (`main`, or the primary feature branch for a milestone PR) into the branch being merged, and resolve any conflicts locally. This shrinks the window in which two branches can both change the same generated file — several files in this repo (`.agents/adrs/adr-index.md`, `.agents/standards/README.md`, `CLAUDE.md`) are regenerated from source files elsewhere in the repo, and two branches each adding an entry (a new ADR, a new standard) in parallel will still touch the same lines of the same generated file even though their actual source files never collide. The run log and assumption ledger deliberately have **no** committed index for this reason: each entry is its own file under `.agents/run-log/` or `.agents/assumption-ledger/`, so parallel branches adding entries never conflict.

**On a conflict in a generated file, do not hand-resolve it.** Every generated file in this repo opens with an `GENERATED — DO NOT EDIT BY HAND` banner naming the script that produces it. The correct resolution is: keep both branches' underlying source files (the new ADR, the new standard — these never conflict with each other), discard both conflicting versions of the generated file, and re-run the generator named in its banner. This is mechanical and always produces a correct result; manually reconciling the markdown by hand risks a malformed table or a silently dropped entry. Regenerate, then re-run `node .agents/scripts/verify.mjs` to confirm the tree is valid before pushing.

### Environment Branches

Three long-lived branches map to deployment environments and are maintained permanently:

| Branch | Environment | Purpose |
|---|---|---|
| `main` | Integration / staging | Receives all feature branches via PR; source of truth for current development state |
| `qa` | Quality assurance | Receives from `main` via automated pipeline; used for structured QA testing |
| `production` | Live application | Receives from `qa` via automated pipeline after QA sign-off |

Promotion between environments is handled by automated pipelines, not by manual merges or direct commits. `qa` and `production` are never committed to directly.

**An agent that finds itself checked out on `main`, `qa`, or `production` is in the wrong place, full stop.** Do not commit there, and do not make edits with the intention of committing there — not even a small fix. Check the work item's plan or spec for the primary or milestone branch it names, and switch to (or cut) that branch first. If it is not clear which branch the change belongs on, stop and ask a human — do not guess a branch name and proceed, and do not sit on an environment branch making changes while waiting for an answer.

**`main` must be production-ready at all times.** No assumption should be made that there is a delay between a merge to `main` and that code reaching `production`. Incomplete features must be behind a disabled feature flag before merging — not held on a branch pending a later promotion window. This is the coding implication of the pipeline topology: if it can reach `main`, it must be safe to run in production.

CI/CD pipeline configuration is not covered by these standards. When pipeline documentation is formalised, it should be captured separately and referenced here.

### Main Branch Protection

The `main` branch is protected. Direct commits are not permitted. All changes reach `main` via pull request. The following gates must pass before a PR is merged:

- CI build passes (compile, test, lint).
- At least one approval from a human reviewer or a designated review agent.
- No unresolved blocking findings from code review.
- No `TODO(agent)` markers from the current task remain in the diff.

### Complex Features: Primary Feature Branches and Milestone Branches

When a feature is classified as Complex in its `plan.md` (see `.agents/standards/plans.md`), the branching topology changes. Instead of a single feature branch targeting `main`, the work is structured as a primary feature branch with a series of milestone branches that target it.

**Primary feature branch.** Created before any milestone work begins. Follows the same naming convention as any other feature branch — `feat/{scope}/{feature-slug}` — but its target is the primary feature branch, not `main`. It acts as the integration point for all milestone branches and is never merged to `main` until the viability gate in the Plan is passed.

**Milestone branches.** Each milestone is implemented on its own branch cut from the primary feature branch. The branch name extends the feature slug with a hyphen-separated milestone slug:

    feat/{scope}/{feature-slug}-{milestone-slug}

Examples for a payment integration feature:

    feat/payments/payment-integration                          ← primary feature branch
    feat/payments/payment-integration-initialize-checkout      ← milestone 1
    feat/payments/payment-integration-provider-factory         ← milestone 2
    feat/payments/payment-integration-webhook-subscription     ← milestone 3
    feat/payments/payment-integration-webhook-invoice          ← milestone 4

The exact branch names must be documented in the Plan's Milestone Branches section before implementation begins. Milestone branch names must be kebab-case, descriptive of the slice they implement, and must not change once work on that milestone has started.

**Merge chain.** Milestone branches are merged into the primary feature branch via pull request, never directly into `main` or `qa`. The primary feature branch is merged into `main` via pull request only after the viability gate defined in the Plan is satisfied. The feature is always behind a disabled release toggle throughout this process.

**Abandoned approaches.** If the feature branch approach is found to be unviable, the branch is closed without merging. An ADR is written documenting what was attempted and why the approach was set aside. The `requirements.md` is updated with a status note. The branch is not deleted — it is left closed so that the attempt remains navigable in history.

### Branch Lifetime

Milestone branches are short-lived — days, not weeks. A milestone branch that has been open for more than a week is a signal that the milestone scope is too large, that work is blocked, or that the milestone has been abandoned. Any of these conditions warrants attention.

The primary feature branch for a Complex feature is intentionally longer-lived than a standard feature branch. Its lifetime ends when the viability gate is passed and the branch is merged to `main`. This is expected and is not a signal of a problem. The one-week heuristic applies to milestone branches and standard feature branches, not to primary feature branches.

If a feature is genuinely large and not classified as Complex, break it into smaller branches that each deliver a coherent, testable slice behind a feature flag. Do not hold a large feature on a single branch until it is entirely complete.

### Hotfixes

A production defect that cannot wait for the normal PR cycle uses a `fix/` branch from `main`, merges directly to `main` after a lightweight review, and is tagged immediately. There is no separate hotfix branch type — `fix/` is sufficient and the urgency is communicated by the process, not the branch name.

### Agent Branches

Agents follow the same branching convention as human contributors. There is no separate agent branch namespace. An agent working on invoice submission creates `feat/payments/invoice-submission` — the same branch a human would create for the same task. This keeps the branch list readable and avoids a parallel convention that reviewers must learn to interpret separately.
