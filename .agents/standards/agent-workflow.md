---
title: Agent Workflow
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Managing partial work, defining "done", naming agent-generated artefacts, or conducting a code
  review — applies to every task.
disposition: >
  keep — judgement-heavy review guidance; the checklist items it points to (build, tests, the quality
  gate) are separately mechanised by verify.mjs.
last-reviewed: 2026-10-06
---
# Agent Workflow Standards

These standards govern how agents manage work in progress, define completion, name the artifacts they produce, and conduct code reviews. They complement the workflow steps in `AGENTS.md` and the completion checklist there — this document goes deeper on code-level expectations and agent-specific conventions.

---

## Partial Work and Stopping Points

An agent that cannot complete a task in one session must leave the codebase in a known, safe, and resumable state. "Known" means the next agent or human can understand exactly where things stand. "Safe" means the codebase compiles, existing tests still pass, and no partially written code is reachable at runtime. "Resumable" means the stopping point, the remaining work, and the next steps are unambiguous.

### Leave the Codebase in a Valid State

Never stop mid-task with code that does not compile, tests that fail, or a partially implemented feature that is reachable in the running application. If the current unit of work cannot be completed cleanly, choose one of the following:

- **Complete the current logical unit** — finish the class, method, or handler you are in, even if the broader task is not done. A complete unit is better than a broken fragment.
- **Revert uncommitted changes** — if clean partial completion is not achievable, revert the in-progress changes and document what was attempted and why it was abandoned.
- **Gate the incomplete work** — if partial work can be committed safely, ensure it is behind a disabled feature flag so it is not reachable at runtime. This is the preferred option when partial work has value to preserve.

### Marking a Stopping Point

When stopping mid-task, the item's spec (`spec.md` under [`.agents/specs/`](../specs/README.md), or the
ADO item itself below 5 points) is the canonical record of state. Update it immediately before stopping:

- Mark completed steps explicitly.
- Describe the exact stopping point — not "in progress" but "completed the command handler; the controller action and integration test remain."
- List the next steps in sufficient detail that a fresh agent can resume without re-reading the full task.
- Note any discoveries, blockers, or decisions that emerged during the work.

If the partial work includes code that cannot be completed but should not be reverted (for example, a schema migration that is correct but whose handler is incomplete), add a `TODO` marker in the canonical format:

```csharp
// TODO(agent): [feature-slug] Brief description of remaining work.
// Context: .agents/specs/feature-slug/plan.md
```

`TODO(agent)` markers are distinct from general `TODO` comments. They are tracked, they reference a feature slug, and they must be resolved before the task is marked done. A `TODO(agent)` that is not resolved is not a stopping point — it is unfinished work.

### Test-Stops at Milestone Boundaries

When a work item needs step-wise iteration (see [`plans.md`](plans.md)), milestone boundaries are
structured stopping points — not incidental pauses. At the completion of each milestone, the agent must
do the following before stopping:

1. Record, beside the milestone's checklist in the repo, the four things `plans.md` requires: what was
   implemented in observable terms, exact steps to test it, any assumptions made (load-bearing ones also
   go to [`.agents/assumption-ledger/`](../assumption-ledger/README.md)), and what the next milestone begins
   with. This must be complete before the milestone merges — it is not optional and it is not done
   afterward.

2. Ensure the milestone branch is in a clean state: the solution builds, all tests pass, no `TODO(agent)`
   markers from this milestone remain, and the feature is behind a disabled release toggle.

3. Write the run-log entry for this milestone (see `run-milestone` and
   [`.agents/run-log/`](../run-log/README.md)) — what changed, what surprised you, what you assumed.

4. Garden the `.agents/context/` pack for drift so it reflects the project as it now stands. Per-task
   triggers (see `documentation.md`) keep `tech-quickref.md`, `glossary.md`, and `operational-map.md`
   current as code changes; the milestone boundary is where `current-focus.md` is reconciled, since
   priority shifts are not tied to any single commit and so are not caught by those triggers. Update what
   has drifted, or confirm the pack is still accurate.

5. Run `conformance-review` before merging.

6. Merge the milestone branch directly into the primary branch — **no PR**. Git history is the
   checkpoint (see [`plans.md`](plans.md)). Only on the **final** milestone does a PR get raised, from the
   primary branch to `main`.

Do not begin the next milestone branch until the current one is merged and its checklist entry is
complete.

### What to Commit at a Stopping Point

A stopping-point commit should represent a coherent, stable state — even if the feature is incomplete. Do not commit a mix of complete and broken work in a single commit. Stage what is complete, commit it with an accurate message, and leave the incomplete pieces either not staged or clearly gated.

The commit message should reflect what was actually completed, not the full task:

```
feat(payments): add SubmitInvoiceCommand handler

Controller and integration tests remain; see plan.md.
Spec: invoice-submission
```

---

## Reuse, Duplication, and When to Refactor

This mindset applies to **every work item, in every area of the system** — a User Story, a Spike, an
Analysis, or a Design; backend or frontend. Before building something new, check whether the
solution already has something that does this, or is close enough to extend. Client-side component
and style reuse is one instance of this (see `.agents/standards/client.md` → *Reuse, Duplication,
and When to Refactor*), but the same discipline applies just as much to a domain service, a
repository, a value object, a shared abstraction, a database table or column, a query, or a
validation rule. Rebuilding a near-duplicate backend service or table when an existing one could be
reused or lightly generalised is the same mistake as rebuilding a button three different ways — it
is simply slower to notice, because backend duplication does not visually clash the way UI
inconsistency does.

**During Analysis and Design, this means actively looking, not waiting for implementation to
surface it.** An Analysis or Design that recommends a new capability without first checking whether
the solution already has something that serves the same purpose has skipped a step. Reviewing what
exists is part of the research itself.

**Weigh the decision against the Deliverable's actual objectives — not just local code
cleanliness.** Something being technically reusable does not automatically mean it is worth
generalising. Ask whether doing so serves what the larger Deliverable is actually trying to achieve.
Reusing a small backend service to save a day's work is not obviously worth it if the two call sites
are already drifting toward different requirements; a domain concept two features will clearly need
in the same shape is worth the small extra effort to generalise now.

**This is not the agent's call to make alone.** Do not guess, and do not assume. When a genuine
reuse-or-duplicate question arises — could this domain service, this table, this component serve a
second purpose? — surface it and ask a human, the same way an `assumed` load-bearing claim is
raised rather than resolved unilaterally (see `.agents/assumption-ledger/TEMPLATE.md`). For a UI
element, `.agents/standards/design.md` → *When to Promote: Second Use, Same Source* settles whether
two occurrences are the same thing. A same-source, solution-owned promotion inside the Story's write
surface is the clearly low-risk case below, not a question to raise.

Once a human has weighed in (or the call is clearly low-risk and low-impact), weigh the refactor's
benefit against its risk:

| Benefit | Risk | What to do |
|---|---|---|
| Small | High | Do not refactor. Build the new instance separately, and annotate the duplication with a comment stating why it was not consolidated. |
| Large | High | Ask a human before proceeding — this call is not the agent's to make alone. |
| Any | Low | Fold the refactor into the current work. This is not scope creep; it is ordinary hygiene. |

**This is not a separate work item.** The moment something becomes noticed or relevant is usually
the best place to act on it — opening a new work item for a small, well-understood, low-risk
cleanup just fragments the change and delays a fix while attention is already on it. Record what
happened in the *current* work item instead: add a comment to the ADO work item where the
discussion or decision needs a record, and add an additional Milestone if the refactor is
substantial enough to warrant its own step.

**The underlying premise.** Every change should help the system converge on its desired shape. Not
all worthwhile work fits neatly inside its own pre-defined boundary, and treating "this wasn't in
scope" as a reason to leave known duplication in place is how duplication accumulates — on the
backend as much as the frontend. What decides whether to act now, ask, or defer is impact and risk
to work already done, weighed against the Deliverable's objectives — not whether the improvement
was anticipated when the work item was written.

**When genuinely unsure, ask.** Confirming costs little. Guessing wrong on a refactor that touches
shared, already-tested code — or a shared table other features already depend on — costs much more.

---

## What "Done" Looks Like at the Code Level

The completion checklist in `AGENTS.md` covers documentation, ADRs, and acceptance criteria. This section covers the code-level bar that must be met before any of those steps are assessed.

A task is not done until every item below is true:

**Build and tests**
- The solution builds without errors.
- The solution builds without warnings, unless the warning is pre-existing and documented.
- All existing tests pass.
- New tests have been written for the behaviour introduced or changed.
- No tests have been commented out or skipped to make the suite pass.

**Code cleanliness**
- No `TODO(agent)` markers remain from this task.
- No debug artifacts: no `Console.WriteLine`, no `Debug.WriteLine`, no hardcoded test data in production paths, no commented-out blocks of code without an explanation.
- No dead code introduced: no unreachable branches, no unused methods or parameters, no imports that serve nothing.
- Formatting has been applied (`dotnet format` for C#, `prettier` for web assets).

**Security**
- No secrets, API keys, connection strings, or credentials appear anywhere in the committed code.
- Endpoints introduced have authentication, feature gate, and permission attributes applied in the correct order.
- No client-provided data is persisted without explicit server-side reconstruction.
- System-owned fields (`createdAt`, `createdBy`, generated IDs) are not exposed as writable inputs.

**Data integrity**
- Migrations are always generated using the project's migration tooling (e.g. `dotnet ef migrations add <Name>`). An agent must never write a migration file by hand. Manual migration files are inconsistent, error-prone, and bypass the tooling's safety checks. If a tooling access or compatibility problem is encountered, it must be raised and resolved before migration work proceeds — do not work around it by authoring the file manually.
- Any migration introduced has been verified to run cleanly against a local database.
- Migrations have not been edited after being committed.
- Only the fields that the operation is designed to change are written in update paths.
- A new required (non-nullable) column added to a table that already holds rows either declares a default value or is introduced via an add-nullable → backfill → tighten sequence — never a bare `NOT NULL` addition against populated data. See `persistence.md` → *Adding a Required Column to an Existing Table*.

**Feature readiness**
- If the feature is not ready for release, it is behind a disabled feature flag.
- If the feature is behind a flag, the flag is documented in `appsettings.json` and the integration README if applicable.

**Design fidelity** (when the item has a UI surface)
- `design-fidelity-check verify` passed all four levels of `design.md` → *Verifying an Implementation Against Its Design* for every cited frame, breakpoint and theme, and on a device set to light.
- Or, with no working screenshot tool, level 3 is recorded as unverified, a human visual sign-off step is in How To Test, and the item is not reported as verified until that sign-off is given.

**Functional impact**
- The plan states the functional impact. That is each shared mechanism the change touches, its consumers found by code search, and the risk to each. Or the plan states that there is none.
- Every consumer of a shared mechanism the change touched was re-checked after the change, and the result was recorded. No consumer is left broken.
- Any possible break, and any contradiction between a design and an existing feature, was raised with a human and the decision was recorded.

**No reliance on another layer's defences**
- Each layer enforces what it owns and does not skip its own responsibilities by assuming another layer already handled them.
- The **controller** enforces input shape and coarse-grained role checks via attributes (`[Authorize]`, `[FeatureGate]`, `[Authorize(Policy)]`). It does not perform business logic or resource-level authorization.
- The **handler** enforces fine-grained authorization (can this specific user perform this action on this specific resource?) and application-level preconditions (does the resource exist? is it in a state that permits this operation?). It does not trust that the controller validated the command object — it checks what it needs regardless. It does not perform domain-level invariant enforcement.
- The **domain** enforces its own invariants — the rules that keep an aggregate in a consistent, valid state. It enforces these rules regardless of what the handler did or did not check before calling into it. Permissions are not a domain concern; the domain does not check them. What the domain does not assume is that the handler has already guaranteed the entity is in a valid state for the operation — it enforces that itself.

---

## Naming Conventions for Agent-Generated Artifacts

Agents produce both code and documentation. Both must follow the conventions established in the relevant standards files. This section is a reference summary — the authoritative definitions are in the standard files they cite.

### Code

Follow the naming conventions defined in the relevant technology standard under `.agents/standards/technologies/` (for example `c-sharp.md` for C#, `angular.md` for Angular) without exception. Agents are not exempt from naming conventions. Auto-generated names from tooling (scaffolding, ORM migration names) may be adjusted to conform.

### Documentation Artifacts

| Artifact | Location | Naming |
|---|---|---|
| Epic overview | `.agents/specs/epics/<epic-slug>/README.md` | Fixed filename, written by `plan-epic` |
| Feature-level plan | `.agents/specs/epics/<epic-slug>/features/<feature-slug>/README.md` | Fixed filename, written by `plan-epic` |
| Per-item spec (5–8 points) | `.agents/specs/epics/<epic-slug>/features/<feature-slug>/work/<primary-slug>/spec.md`, or `.agents/specs/items/<item-slug>/spec.md` for loose work | Fixed filename, written by `plan-work-item`. No file below 5 points. |
| Architecture Decision Record | `.agents/adrs/ADR-NNNN-short-title.md` | Zero-padded four-digit number; short title in kebab-case; frontmatter per `.agents/adrs/README.md` |
| Run-log entry | `.agents/run-log/YYYY-MM-DDTHHMMZ-<work-item-id>-<slug>.md` | UTC, no colons, at most 90 chars; no index to update — the gate validates it (`ledgers.mjs --check`). Older entries without the time stay as they are. |
| Assumption-ledger entry | `.agents/assumption-ledger/asmp-<id>-<slug>.md` | Stable id, never renamed; no index to update — the gate validates it (`ledgers.mjs --check`) |
| Integration README | `src/Infrastructure/{Domain}/{Provider}/README.md` | Fixed filename |
| Feature area README | `src/app/features/{feature}/README.md` | Fixed filename |

ADR numbers are assigned sequentially. Read the existing ADRs to determine the next number before creating a new one.

Epic, Feature, and primary slugs are kebab-case, domain-first, and describe the work in a phrase:
`invoice-submission`, `payment-processing`, `user-registration`. A primary slug matches the branch name
scope segment (`.agents/standards/commits.md`) and the relevant ADO slug field
(`.agents/context/azure-devops.md`).

### Migrations

EF Core migration names follow the convention `{PascalCaseDescription}` — a brief description of what the migration does, not when it was created. `AddInvoiceStatusColumn` is correct. `20250514120000_Migration` is not. The timestamp is generated by the tooling; the name is what agents and humans read.

---

## Code Review

Review happens at **two altitudes that never assume the other did the work.** A review that checks code
against acceptance criteria is not checking whether the system serves its objective, and a review of the
objective is not a substitute for checking the diff against the standards. Conflating them is how an
architectural problem goes unreviewed indefinitely while every individual diff passes its checks.

### Conformance — code against its AC, the standards, and the DoD

Before marking any task done, and before every milestone merge, the implementing agent reviews its own
output against the code-level done criteria above and the standards relevant to the change.
**Architecture and design are explicitly out of scope here** — that is Coherence, below.

Reading the diff as a reviewer, not as the implementer, is the discipline here. The question is not "does
this match what I intended to write?" but "does this behave correctly, and can I demonstrate that it
does?"

Run the `conformance-review` skill (`.agents/skills/conformance-review/`) to carry out this step: it runs
the full quality gate, walks the review categories below, and has you classify and resolve findings — or
surface them — before hand-off. It is the mandated action before every milestone merge and before a PR is
raised.

### Coherence — does the built system serve the objective

For work above the smallest scale, and always before a PR to `main`, a **separate review** asks whether
the running system still serves what it was built for — not whether this diff satisfies its own stated
acceptance criteria. Run the `coherence-review` skill (`.agents/skills/coherence-review/`) for this.

**This review must run in a session with no build memory, and must never be spawned as a subagent of the
implementing agent.** A subagent inherits the builder's framing, which is the exact bias that lets a
*choice* get recorded as a *constraint*: an agent that built something interprets its own ambiguous
decisions charitably; a fresh session that did not will flag what it cannot verify. `coherence-review`'s
own charter asks, verbatim, *"which stated constraint is actually a choice?"* as its first question.

Findings from a coherence review go to a human to adjudicate — merge, revert, spike, or re-scope — never
back to the builder to silently fix.

### What a Conformance Review Checks

A structured review works through the following categories in order. Each category may produce findings, which are classified as either **blocking** (must be resolved before merging) or **advisory** (should be addressed but does not prevent merging).

**1. Security** — blocking by default
- Are all new endpoints secured with `[Authorize]`, `[FeatureGate]`, and `[Authorize(Policy)]` in the correct order?
- Is any endpoint anonymous (`[AllowAnonymous]`, or simply missing `[Authorize]`) without an explicit, deliberate reason recorded for why it is public? The absence of `[Authorize]` is never an acceptable way to leave an endpoint open — see `api.md` → *Authentication*.
- Does every new permission follow the naming convention (`Permission.{Domain}.{Resource}.{Action}`), define an explicit `View` permission rather than reusing a parent node as a stand-in for it, and avoid requiring more than one permission on a single endpoint (composite authorization is a design smell)? See `api.md` → *Authorization — Permissions*.
- Is any client-provided state being persisted without server-side reconstruction?
- Are system-owned fields excluded from write paths?
- Are any secrets, credentials, or sensitive values present in the code?
- Are webhook endpoints verifying provider signatures before processing?

**2. Correctness**
- Does the implementation match the acceptance criteria? Walk through each criterion and identify the code that satisfies it.
- Are failure paths handled, or does the implementation only cover the happy path?
- Is domain/business logic implemented in the Domain or Application layer, not in a controller, a repository, or other infrastructure code? A controller that computes a result instead of delegating to a handler is domain logic in the wrong place even when it produces a correct answer.
- Are domain invariants enforced at the domain layer, not in the handler or controller?
- Are concurrent operations handled safely?

**3. Standards compliance**
- Do all new types, files, and methods follow the naming conventions in the relevant standards?
- Are architectural layer boundaries respected? Does any inner layer import from an outer layer?
- Does each new Infrastructure capability sit behind an Application-defined abstraction (an interface under `Abstractions/`), rather than Application or Domain referencing Infrastructure directly? See `architecture.md` → *Ports and the Abstractions concept*.
- Is new code placed in the domain-first folder/project structure `architecture.md` defines, rather than grouped by technical pattern (`Controllers/`, `Services/`, `Repositories/`)?
- Is the Result pattern used for expected failures, and are exceptions reserved for unexpected ones?
- Are constants named and placed correctly, with no magic values in logic?

**4. Test coverage**
- Do tests exist for the behaviour introduced? Assess by behaviour, not by coverage metric.
- Do the tests cover both success and relevant failure paths?
- Are integration tests present for any new endpoints, including security enforcement tests (401, 403, 404/503)?
- Are there `TODO(agent)` markers referencing tests that have not yet been written?

**5. Documentation and completeness**
- Has the item's `spec.md` (or the Feature-level plan it falls under, or the cross-cutting Plan under `.agents/plans/`) been kept current, per `.agents/specs/README.md`?
- If an architectural decision was made, is there an ADR?
- If the change introduces or restructures a subsystem, has the nearby README been updated?
- Was the `.agents/context/` pack updated if the change invalidated it — a new build/run/test command, a focus shift, a new domain term, or a structural change (per `documentation.md`)?
- Are there `TODO(agent)` markers that should have been resolved?
- Is there any debug code, commented-out logic, or dead code?

### How to Communicate Findings

Findings are expressed as specific, actionable observations — not general impressions. "The controller is missing a `[FeatureGate]` attribute" is actionable. "The security could be better" is not.

Blocking findings must identify the file, the line or method, and the reason the finding is blocking. Advisory findings should explain the concern and, where possible, suggest the improvement.

If a finding requires a decision that goes beyond the agent's authority — a change to a governed file, an architectural departure from a current ADR, a scope change to the feature — flag it explicitly and pause for human input rather than proceeding on assumed assent.

### What Reviews Do Not Do

A review does not fix what it finds — it reports it. An agent that silently corrects a security issue during a review has hidden the finding from the person who needs to know it existed. Report findings, let them be addressed by the appropriate party, and verify the resolution in a follow-up pass.

A review does not pass or fail the change globally. It produces a list of findings with severities. The decision to merge, revise, or escalate is made by a human.
