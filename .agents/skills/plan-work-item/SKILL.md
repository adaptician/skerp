---
name: plan-work-item
description: Plan a User Story or Spike — estimate first, check for untested assumptions, then produce exactly the artefact the planning depth ladder requires and nothing more. Use when asked to plan, spec, or scope any work item. Its most valuable behaviour is refusing to plan work that has not been de-risked. If asked to plan at Feature or Epic level, use plan-epic instead.
---

Produce **exactly** the planning artefact the depth ladder requires — no more. Replaces the retired
three-phase `requirements → plan → tasks` pipeline, which always produced three documents because that
was the pipeline, not because the work needed them.

> **The refusals are the point.** Two of the four ladder outcomes are a refusal to plan. If this skill
> never declines, it is not working.

## 1. Establish what you are planning

Read the work item from ADO and its parent Feature and Epic. Hierarchy and field reference names:
[`.agents/context/azure-devops.md`](../../context/azure-devops.md).

**Development may only begin on a work item whose State is `New`.** If it is anything else, **stop and
ask for a status update** — someone or something else may hold it.

**The one exception is rework.** When this skill runs together with [`rework`](../rework/SKILL.md), on
an item already built that failed verification, `rework` §0 decides which states may proceed, and its §4
lists every rule in this skill that changes. Never treat an `Active` or `Testing` item as rework unless
the prompt invokes `rework`.

**If asked to plan at Feature or Epic level, do not plan a capability here.** Use
[`plan-epic`](../plan-epic/SKILL.md) instead — it decomposes an Epic into Features and Stories/Spikes.
This skill plans one User Story or Spike at a time, once it is at the front of that backlog.

## 2. Estimate before choosing an artefact

State the estimate **out loud, first**. Choosing the artefact before estimating is how a 3-point change
acquires a spec.

`1`<1h · `2`<3h · `3`<6h · `5`<12h · `8`<48h · `13`<96h · `20`<192h — effort **until the PR is raised**,
including human review, deployment and verification. **Estimate high.**

## 3. 🚧 Hunt for untested assumptions — this is a GATE, and it comes before investigation

**Do this before reading any code, manifest or config.** If you investigate first, you will arrive at the
gate holding a half-built plan, and a half-built plan is an argument for proceeding.

- Read [`.agents/adrs/adr-index.md`](../../adrs/adr-index.md) — does this item depend on a
  **`Provisional`** decision, or one whose evidence tier is `assumed`?
- Run `node .agents/scripts/ledgers.mjs --open` (entries live in
  [`.agents/assumption-ledger/`](../../assumption-ledger/README.md)). Any **open** entry this work rests on?
- Ask directly: *which load-bearing claim here is `assumed`?* The default tier for anything new is
  `assumed` (see `.agents/adrs/README.md` — *Evidence tiers*).

**An `assumed` claim may not constrain a design. It may only generate a Spike.**

### What discharges the gate — read this carefully

> **A claim is discharged when the measurement exists. Not when a work item to measure it exists.**

A Spike, Feature, or backlog entry covering the unknown means the unknown is **tracked**. It does not
mean it is **resolved**. `Provisional` becomes `Accepted` when the number comes back — until then the
claim still may not constrain a design, and **planning work that depends on it is exactly what the gate
forbids.**

| Situation | Gate |
|---|---|
| No Spike exists for the unknown | **Refuse.** Create it, link it as blocking, stop. |
| A Spike exists but has **not returned a result** | **Refuse.** Say the Spike is the prerequisite and stop. |
| The Spike has returned a `measured` result | **Proceed**, citing the number. |

### The tell that you have already failed this gate

**If every option you are about to put to the human is a flavour of proceeding — "how much should I
build?", "shall I scope A or B?" — you have failed.** The gate's output is a refusal, not a menu with
smaller portions.

Recognising a `Provisional` ADR and then folding it into a downstream scoping question is not passing the
gate; it is routing around it. A weak skill fails by being agreeable — it plans the un-planned, and it
looks like success.

## 4. Branch on the ladder

| Estimate | Unknowns | Do this |
|---|---|---|
| **1–3 pts** | none | **No spec.** Write AC + How To Test into ADO, create the branch, stop. |
| **5–8 pts** | none | **One-page spec** at the repo path dictated by `.agents/specs/README.md`: normally `.agents/specs/epics/<epic-slug>/features/<feature-slug>/work/<primary-slug>/spec.md`, or `.agents/specs/items/<item-slug>/spec.md` for deliberately loose work. **One file.** |
| **any** | ≥1 `assumed` load-bearing claim | **Refuse to spec.** Create a Spike under this item's own parent Feature, link it as blocking this item, stop. |
| **13–20 pts** | — | **Refuse to plan.** Propose a decomposition into smaller Stories/Spikes under the same Feature — or a Spike if the size is driven by uncertainty rather than volume. |

**Writing a spec for a 3-point item means the process is regrowing. Don't.**

### Step 1 of every spec is a tracer bullet

A spec's implementation plan opens with a `## Step 1: Tracer bullet` section, ahead of the Milestones. A
tracer bullet (*The Pragmatic Programmer*, "Tracer Bullets") is the thinnest path through **every** layer
the requirement touches, built for real and kept. Every class, method, endpoint, config key and test the
requirement needs exists with its final name, location and access level, but holds no logic yet. It
proves the frame before anyone builds on it. It is not a prototype, which is thrown away.

Aim it at the **riskiest** path: the layer you doubt most, the integration you have not done before, the
data you are not sure exists. Write the section as a short table, then the checks the round must pass.

```markdown
## Step 1: Tracer bullet

| Element | New / changed | Layer / project / folder | Access | Stub behaviour |
|---|---|---|---|---|

The round hits when: <the path to fire end to end> · <each dependency resolves within the layer rules>
· <config/toggle binds and injects> · <skeleton tests reach the domain elements without widening access>
· <the data the requirement needs has a known source>.
```

**Draft the table before writing the rest of the plan.** Drafting it often finds the first miss: data that
does not exist, a dependency that would cross a layer boundary, or an element with no legitimate home.
Treat a miss like an untested assumption (§3). Raise it now; do not plan around it. With milestones, the
tracer bullet is the first step of Milestone 1, or its own milestone when the path is long. A Spike whose
output is disposable needs none, so record `not applicable` with the reason. Below 5 points there is no
spec, and [`run-milestone`](../run-milestone/SKILL.md) §3 fires the tracer bullet unplanned.

**Before creating the branch, check the remote.** A branch named after this item's `Custom.PrimarySlug`
may already exist — another agent or operator may have started it. Fetch and check before creating one;
if it already exists, inspect whether its state matches the work you are about to plan. If it does not
align, do not create a conflicting branch or push changes — raise it with a human instead. See
[`commits.md`](../../standards/commits.md) → *Check the Remote Before Starting Work on a Slugged
Branch*. **Every slug is lowercase, hyphen-separated, no exceptions** — see `azure-devops.md`.

When you refuse, say plainly *what* you are refusing, *why*, and *what you created instead*. A refusal
with no next step is an obstruction.

## 5. Set the fields

Per [`azure-devops.md`](../../context/azure-devops.md) — **the slug field differs by type, and writing the
wrong one succeeds silently:**

- User Story / Spike → `Custom.PrimarySlug` = the primary branch name.
- `Microsoft.VSTS.Scheduling.StoryPoints` on the User Story or Spike. **Never touch
  `Custom.QuotationPoints`** here — that field is set once, at creation, by `plan-epic` (or a human).
  If this re-plans an **existing** item and changes `Story Points` from its original value, add a
  Comment summarizing why — never in `Description` or `Acceptance Criteria` — per `azure-devops.md`.
  **Under [`rework`](../rework/SKILL.md), the estimate goes to `Custom.ReworkPoints` only**, and
  `Story Points` does not change.
- Milestones (only if the work needs step-wise iteration): `Custom.MilestoneSlug`, `Original Estimate` and
  `Remaining Work` in hours. **A Milestone carries no ADO description** — its detail lives in the repo.

**Never write `Target Date`.** That is a human commitment. `Start Date` is an observation, recorded when
development actually begins — not now.

## 6. Generate ADO content from the repo, never the reverse

Generate **Description**, **Acceptance Criteria** and **How To Test** *from* the spec (or from the item's
own brief below 5 points). After that they are **never hand-edited in ADO** — change the repo and
regenerate. Editing in ADO creates a second home for one fact and the repo copy silently goes wrong.

**If new context surfaces later** — from a further discussion, or something found in the repo or another
tool — that is not automatically a reason to regenerate these fields. Default to logging it as a
**comment** on the work item; only touch the repo source (and regenerate) when the field would otherwise
be substantively wrong. See [`azure-devops.md`](../../context/azure-devops.md) → *New context goes to a
comment, not into Description/AC by default*.

The Description must name the planning-source path. Use the hierarchy path when the work is under an
Epic/Feature; use `.agents/specs/items/` only for loose work.

Acceptance criteria must be **observable from outside the system** and in Given/When/Then form. Not
`"the handler was called"` — that is unverifiable to anyone who did not write it. Format:
[`.agents/specs/README.md`](../../specs/README.md).

## 7. Before you finish

- **Run [`design-fidelity-check`](../design-fidelity-check/SKILL.md) in `locate` mode on every item,
  whatever its type and whether or not it mentions Figma.** It records `applies` or `not applicable` with
  a reason in the plan. When it applies, the plan carries its citation table — an index key and node ID
  (or URL and node ID for a frame not yet indexed) and the approval for **every** screen, state and
  breakpoint the item touches. **It stops the plan** when the design is missing, unapproved or unreachable
  (*No design, no build*, [`technologies/figma.md`](../../standards/technologies/figma.md)); do not plan
  past a stop.
- **Prose UI intent is allowed only after a human has explicitly approved proceeding without a design**,
  and that approval is recorded in the plan (who, when, which surfaces). Then describe the surfaces,
  states, interactions, feedback, error/reconnect behaviour and accessibility expectations in the repo. A
  description never substitutes for a design that exists, and ADO text is never a design. **A Spike
  never requires a design artefact** unless evaluating that artefact is itself the Spike's purpose — the
  skill records it as not applicable.
- State the **functional impact**, or say explicitly that there is none. List each **shared mechanism**
  the change touches. A shared mechanism is anything another screen, feature or process also relies on,
  for example:
  - a global stylesheet, selector or token;
  - a replaced stock component or its selector;
  - a shared layout template or its stylesheet;
  - route or menu configuration;
  - a shared extension point or schema extension;
  - a shared service;
  - a skill or standard other work follows.

  For each mechanism, list its consumers **found by code search, not memory**, and record the search.
  Give the risk to each consumer. Surface level is enough here. `run-milestone` goes deeper. A consumer
  that could break is raised before the plan is done
  ([`run-milestone`](../run-milestone/SKILL.md) §5 → *Possible breaks and contradictions*). Below 5
  points, the section goes in the ADO Description.

  ```markdown
  ## Functional impact

  | Shared mechanism | Consumers (search) | Risk |
  |---|---|---|

  or: **None** — <why the change touches no shared mechanism>
  ```

Report: the estimate, the ladder branch taken, the artefact produced (or the refusal and what you created
instead), the functional impact (or "none"), and the fields you set.
