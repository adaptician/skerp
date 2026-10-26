---
title: Milestone Planning
tier: 2
enforced-by: [review, prose-only]
applies-when: >
  Breaking a User Story or Spike into Milestones, deciding when a primary branch may merge to main,
  or writing a cross-cutting Plan under .agents/plans/.
note: >
  Cut down 2026-08-17. The three-phase requirements → plan → tasks pipeline was superseded by the
  planning depth ladder (.agents/specs/README.md, plan-work-item); the milestone-branch mechanics and
  merge criteria below remain in force. 2026-09-08: restored the cross-cutting Plan template (a
  different, still-active artifact from the retired per-feature plan.md), which other files
  (plans/README.md, documentation.md, adrs/README.md) already assumed existed here.
disposition: >
  keep — what is left is the merge-criteria checklist, the milestone-branch topology, and the Plan
  template, all load-bearing on every multi-step work item. The merge criteria are a strong
  mechanisation candidate as a PR-pipeline check once one exists.
last-reviewed: 2026-09-08
---
# Milestone Planning

> ## What this file no longer says
>
> It previously specified a **three-phase `requirements.md` → `plan.md` → `tasks.md` pipeline** with a
> `Simple`/`Complex` classification, authored for every feature. That is **superseded by the planning
> depth ladder** — see [`.agents/specs/README.md`](../specs/README.md) and
> [`plan-work-item`](../skills/plan-work-item/SKILL.md) — which produces no spec below 5 points and a
> single one-page spec at 5–8.
>
> Writing three documents for a three-point change is the process regrowing.
>
> **What survives is below: how milestone branches are structured, and when a primary branch may merge,
> plus the template for the cross-cutting Plan documents under `.agents/plans/` — a different, still-active
> artifact from the retired per-feature `plan.md` above.**

---

## The Plan document template

This is the template for a **cross-cutting Plan** under `.agents/plans/<slug>.md` — see
[`.agents/plans/README.md`](../plans/README.md) for when a Plan belongs there instead of inside a
feature's own spec folder. It does not apply to a per-item `spec.md` (see
[`.agents/specs/README.md`](../specs/README.md) for that format) or revive the retired
`requirements.md` / `plan.md` / `tasks.md` pipeline referenced above.

A Plan is **self-contained and novice-targeted**: someone with no prior context should be able to
read it and know what to do next without reconstructing context from elsewhere. Use these sections,
in this order, each present even if briefly populated at first:

1. **Purpose / Big Picture** — what exists after this work that does not exist now, in a sentence or
   two. This is the test for whether the Plan is done, not a restatement of the task.
2. **Context and Orientation** — the existing code, files, and constraints a contributor needs before
   touching anything. Cite any ADR whose decision constrains this Plan's design.
3. **Interfaces and Dependencies** — the concrete interfaces, files, or systems this Plan creates or
   changes, and anything it depends on that is not yet in place. Cite an ADR here instead of in
   *Context and Orientation* when the citation is specifically about an interface boundary.
4. **Plan of Work** — the milestones or stages, in order, each described well enough to start without
   asking a question. Once milestones exist, the branch-naming and merge-criteria rules below apply.
5. **Progress** — a checklist, one item per milestone or stage, ticked off as work completes. Updated
   continuously as work proceeds, not written up at the end.
6. **Surprises & Discoveries** — anything that did not go the way the Plan expected, updated
   continuously. This is the Plan-level counterpart to a per-change entry in `.agents/run-log/`.
7. **Decision Log** — decisions made while executing the Plan that the Plan itself did not anticipate.
   Cross-reference an ADR when the decision is architectural (see *Documenting Decisions* in
   `.agents/standards/documentation.md`).
8. **Validation and Acceptance** — the exact commands and expected results that demonstrate the Plan
   achieved its Purpose.
9. **Outcomes & Retrospective** — written once, at completion: what shipped, what was learned, and
   what would be done differently. Never rewritten afterward — see *Lifecycle* in
   `.agents/plans/README.md`.

---

## Where planning detail lives

**In the repo, travelling with the work.** A Milestone carries **no description in Azure DevOps** — its
checklists and technical steps live in the repo so they change in the same commit as the code they
describe.

Those checklists are **not** ADO Tasks. An ADO `Task` is non-development work needing human visibility,
and creating one requires approval (see
[`.agents/context/azure-devops.md`](../context/azure-devops.md)).

| Fact | Home |
|---|---|
| Milestone hours (`Original Estimate`, `Remaining Work`) | **ADO** |
| Milestone state, `Milestone Slug` | **ADO** |
| The checklist, the technical steps, the verification steps | **The repo** |
| Acceptance Criteria + How To Test | **ADO**, *generated from* the repo spec |

---

## Milestones

Milestones are narrative, not bureaucracy. Introduce each with a brief paragraph describing the scope,
what will exist at the end that did not exist before, the commands to run, and the acceptance you expect
to observe. Keep it readable as a story: **goal, work, result, proof.**

**Each milestone must be independently verifiable** and must incrementally implement the goal of its User
Story or Spike. Never abbreviate a milestone for brevity, and do not omit detail that a future
implementation would need.

A User Story or Spike is broken into Milestones **only when the work calls for step-wise iteration.** A
single-step item needs no milestones at all.

## Milestone branches

One Milestone = one branch. The primary branch is cut from current `main`:

```
feat/{scope}/{primary-slug}                       ← the primary branch (Custom.PrimarySlug)
feat/{scope}/{primary-slug}-{milestone-slug}      ← one per Milestone (Custom.MilestoneSlug)
```

Naming follows [`.agents/standards/commits.md`](commits.md). Each milestone entry states its **branch
name** and **what must be demonstrably true** for it to be complete. Example:

    Primary branch: feat/billing/invoice-retry
    Milestone 1 — Record retry attempts
      Branch: feat/billing/invoice-retry-record
      Complete when: a failed invoice charge records a retry attempt with a backoff timestamp; unit tests pass.
    Milestone 2 — Execute scheduled retries
      Branch: feat/billing/invoice-retry-execute
      Complete when: a background job retries due invoices and the regression test fails when reverted.

**Merge chain.** A milestone branch merges into the **primary branch** — never directly into `main` or
any environment branch. The agent merges it directly; Git history is the checkpoint. The next milestone
branch is then cut from the primary branch, and the ADO Milestone moves to `Closed`.

When the work is ready for staged verification, deploy the exact primary-branch revision into the
project's local staging environment per [`.agents/standards/deployment.md`](deployment.md). Record the
revision, local image tag, overlay/configuration and material resets. A product fix found there belongs
on the primary branch; rebuild and redeploy that new revision before claiming the proof.

**The toggle is introduced in the first milestone** and is present for all subsequent ones. It is not
added retroactively. Every milestone merged to the primary branch must compile, pass all tests, and leave
the capability unreachable behind a disabled toggle.

Numbered prefixes (`01-record`) are optional, recommended past four milestones or with concurrent
contributors. Ordering must be unambiguous either way.

## At the end of each milestone

Before merging, record four things in the repo alongside the milestone's checklist:

1. **What was implemented** — in terms of observable behaviour. What can be done now that could not be
   done before? Not internal detail; what a tester would see.
2. **How to test it** — exact steps, commands, URLs and expected output. A reviewer must be able to
   reproduce it without asking a question.
3. **Assumptions** — anything decided that the plan was silent on, and anywhere the implementation
   diverged from it. This is the agent declaring what it chose. Load-bearing assumptions also go to
   [`.agents/assumption-ledger/`](../assumption-ledger/README.md) with an evidence tier.
4. **What comes next** — the next milestone's name and branch, and its starting point.

Update `Remaining Work` on the ADO Milestone at the same time.

## When the primary branch may merge to `main`

**All of these, or it does not merge:**

- Every milestone branch is merged into the primary branch.
- The branch builds with no errors *and no new warnings*, and all tests pass.
- **Every acceptance criterion has been verified, not assumed** — exercised in a running environment with
  no manual intervention behind the scenes.
- Verification passed per the environment sequence in
  [`.agents/standards/deployment.md`](deployment.md).
- The exact primary-branch revision, local image tag and staging deployment configuration exercised are
  recorded.
- At least one **human** reviewer has reviewed the full scope and confirmed it is production-safe behind
  the toggle. **An AI agent may never approve a PR.**
- The release toggle exists, is documented in configuration, and is **disabled by default**.
- The **deployment guides are updated in the same PR**, so staged verification exercises the committed
  deployment procedure and promotion to later environments needs no further authoring.
- Nearby documentation, ADRs and diagrams are current, or the PR states why none was needed.

After the human merges the PR, humans promote to the next environment and perform verification there. The
User Story or Spike remains `Testing` until that verification passes; it is not a precondition for raising
the PR.

## If the approach proves unviable

Close the branch without merging. **Do not delete it** — a closed branch keeps the attempt navigable.
Write an ADR recording what was tried, what was learned, and why it was set aside; that ADR is the
starting context for any future attempt. Mark the work item accordingly in ADO.

## Prototyping milestones

An explicit prototyping milestone that de-risks a larger change is encouraged. Keep prototypes additive
and testable, label the scope as prototyping, describe how to run and observe the result, and **state the
criteria for promoting or discarding it** before starting.

Prefer additive changes followed by subtractions that keep tests passing. Parallel implementations — an
adapter alongside an older path during a migration — are fine when they reduce risk. Describe how to
validate both paths and how to retire one safely.

When adopting an unfamiliar library, evaluate it in a Spike *in isolation* first, proving it does what is
needed before anything is designed against it.

## Recording decisions as you go

- Record load-bearing decisions and the thinking behind them **while making them**, not afterwards.
  Repo-wide decisions become ADRs; narrower ones stay with the milestone.
- Capture surprises with short evidence snippets — test output is ideal. These belong in
  [`.agents/run-log/`](../run-log/README.md), written **during** the work. Retrospective notes are written
  after the surprise has been rationalised, which is why they under-report.
- If you change course mid-implementation, record why. The record is a guide for the next contributor as
  much as a checklist for you.
