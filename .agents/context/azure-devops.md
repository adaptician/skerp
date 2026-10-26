---
tier: 1
applies-when: planning or updating any Azure DevOps work item
verified: 2026-08-18
---

# Azure DevOps — hierarchy and field reference

**Use the tool's vocabulary, not invented parallel terms.** Every name below is the actual ADO
work-item type or field reference name for this org's process. Inventing a parallel term (e.g. an
"Objective" level the tracker doesn't have) is how a process drifts from the system it runs on.

## The hierarchy

```
Deliverable                — functional, complete, deployable, runnable, stable, valuable
└── Epic                   — an offering within the Deliverable · Custom.epicslug
    ├── Analysis            — flexible altitude, see below · Adaptive.Analysis
    └── Feature             — THE UNIT OF DELIVERY. One capability, one toggle · Custom.FeatureSlug
        ├── Analysis        — feature-specific research · Adaptive.Analysis
        ├── Design          — UI/UX artefact, precedes Story pickup · Adaptive.Design
        ├── User Story      — a step serving the user's experience · Custom.PrimarySlug
        │   ├── Milestone   — one step-wise iteration = one milestone branch · Custom.MilestoneSlug
        │   ├── Task        — non-development work only · ASK BEFORE CREATING
        │   ├── Blocker     — needs human judgement · Microsoft.VSTS.Common.Severity
        │   └── Issue       — deferrable follow-up, see below · Custom.PrimarySlug
        └── Spike           — a step serving effectiveness, efficiency, security,
                              maintainability or extensibility · Custom.PrimarySlug
            ├── Milestone
            ├── Task
            ├── Blocker
            └── Issue

Bug                         — raised wherever found, any level · Custom.PrimarySlug
```

Analysis and Design (above) can also parent an Issue directly, same as User Story and Spike.

### A work item spawned by another gets the same parent, not just a Related link

When work on one item (a User Story, Spike, Analysis, or Design) surfaces the need for a new
sibling-level item — a Spike to resolve an unknown the Story hit, a companion Story split out of
an oversized one, a Design revisited from a Spike's finding — link the new item back to the one
that produced it with a `Related` link **and** set its `System.Parent` to the **same parent** the
originating item has (normally the same Feature), not just the `Related` link on its own.

**A `Related` link alone is not enough.** Hierarchical backlog views group and filter by parent;
a work item with no parent, or the wrong one, does not appear there even though the `Related` link
is visible on the item's own page. In practice this is how a Spike quietly disappears from the
backlog the moment nobody who already knows to look for it is looking — it exists, but only as an
orphan nothing hierarchical surfaces.

This is about *parenting*, distinct from the Issue/Bug rules below: an Issue or Bug still parents
under the nearest enclosing Analysis, Design, User Story, or Spike exactly as those rules state. If
an Issue or Bug is itself the trigger for a new sibling-level item (rather than the new item's
parent), give the new item the *Issue/Bug's* parent, and add the `Related` link back to the
Issue/Bug alongside it.

### Issue — child of Analysis, Design, User Story or Spike only; Bug has no such limit

`Issue` and `Bug` share the same branch/join field (`Custom.PrimarySlug`) and the same urgent-vs-deferrable
distinction from [`conformance-review`](../skills/conformance-review/SKILL.md) — a defect in
already-completed work becomes a **Bug** (urgent) or an **Issue** (deferrable). They differ in where
they may be parented:

- **Bug** is raised wherever the defect is found, at any level of the hierarchy — it has no parent
  restriction.
- **Issue** may only be parented under **Analysis, Design, User Story or Spike** — the Feature's
  direct children. Do not parent an Issue under a Milestone, Task, Blocker, Epic, or Deliverable; if a
  deferrable defect surfaces there, parent the Issue under the nearest enclosing Analysis, Design, User
  Story or Spike instead.

**Capture the context at the moment the Issue is found — do not create a bare Issue and move on.**
The parent work item's Acceptance Criteria could not be met because of this Issue; if the specific
problem is not written down while it is fresh, that context is gone by the time anyone plans or
resolves it. Set these fields on the Issue at creation time, using the live field reference names
(verified against this org's `Issue` work item type):

| Field | Reference name | Content |
|---|---|---|
| Description | `System.Description` | What the problem is and why it blocks the parent's Acceptance Criteria. |
| Repro Steps | `Microsoft.VSTS.TCM.ReproSteps` | The exact steps to reproduce it. |
| System Info | `Microsoft.VSTS.TCM.SystemInfo` | Where it was observed — environment (Development/QA/Production), specific user account, app/build version, browser or OS, or any other detail needed to reproduce it later. |
| Acceptance Criteria | `Microsoft.VSTS.Common.AcceptanceCriteria` | What resolving this Issue requires, **derived from the parent work item's own Acceptance Criteria** — the condition the parent could not satisfy, restated as the Issue's own done-condition. |

This is scoped to creation only — getting the Issue under the correct parent with the problem fully
captured while the context is available. It does **not** include planning the Issue as a work item
(slug, story-point estimate, etc.); that is [`plan-work-item`](../skills/plan-work-item/SKILL.md)'s job,
handed off separately once the Issue exists. The same fields apply equally when creating a Bug — Bug
carries the identical schema, verified live.

**A Spike is not throwaway work.** It ships through a PR after Development and clean local Staging
verification, then receives human QA after merge, same as a User Story.

### Deliverable — no slug field, no Acceptance Criteria field

Verified live against `Adaptive.Deliverable` in this org's process: the work item type carries only
`System.Title` and `System.Description` — no dedicated slug/join-key field, no
`Microsoft.VSTS.Common.AcceptanceCriteria`, and no estimate fields (`Custom.QuotationPoints`,
`Microsoft.VSTS.Scheduling.StoryPoints`) exist on it. Do not go looking for a `Custom.DeliverableSlug` or
equivalent — none has been added. [`plan-deliverable`](../skills/plan-deliverable/SKILL.md) is the skill
that creates and maintains Deliverables; it carries the join to the repo by naming the Deliverable's
README path (`.agents/specs/deliverables/<deliverable-slug>/README.md`) inside `System.Description`,
rather than relying on a field that does not exist.

### Analysis — flexible altitude, informational only

`Analysis` ("brainstorming, research and hashing out ideas") is not fixed to one level. It can be
created:

- under an **Epic**, to plan the epic itself (feeds `plan-epic`'s decomposition into Features);
- under a **Feature**, to plan that feature before it is broken into Stories/Spikes;
- under a **Feature**, as feature-specific research supporting an in-flight User Story or Spike.

**Analysis does not gate anything.** An open or unresolved Analysis does not block an agent from
creating further work under the same Epic or Feature — it records findings; a human decides what to
do with them. This is a deliberate choice: earlier planning-layer designs in this framework's history
tried a structural gate on named unknowns and it added ceremony without changing outcomes here. If
that changes, this section is where the rule would be written.

**An Analysis that recommends building something new should first establish whether the solution
already has it.** See `.agents/standards/agent-workflow.md` → *Reuse, Duplication, and When to
Refactor* — checking for an existing domain service, table, or component that already does this (or
is close enough to extend) is part of the research an Analysis produces, not a check deferred to
whoever eventually implements it.

**A Feature that integrates with a third party always opens with an Analysis, ordered before any Spike
or Story.** Reviewing the provider's documentation up front is what actually answers the questions a
cold-start Spike would otherwise have to guess at — how the provider identifies the entity being
integrated (e.g. the mapping to a local user), and what shape its data takes. That Analysis is also what
a mock-provider Story gets built against. Only once real work exists to compare (e.g. a built mock and a
built or partially-built live client) does a Spike proving they can be swapped by configuration make
sense — a Spike that only restates a question the provider's own documentation would have answered is
Analysis work wearing a Spike's clothing. See `plan-epic`'s own note on this.

### Design — precedes Story pickup, human closes it

`Design` items are created **before** the User Stories/Spikes under the same Feature are planned in
detail, not folded into per-Story planning. Design work is kept in its own artefact (e.g. a Figma
file) separate from the coded implementation, specifically so it can be reviewed and approved by
clients or other stakeholders independent of the code.

**Before creating or editing the Figma artefact behind a Design item, read
[`.agents/standards/design.md`](../standards/design.md),
[`.agents/standards/styling.md`](../standards/styling.md),
[`.agents/standards/technologies/figma.md`](../standards/technologies/figma.md) and
[`.agents/standards/solution/figma.md`](../standards/solution/figma.md).** Those are what say a control needs
default/hover/disabled variants, that breakpoint frames must sit at the solution's mandated
breakpoint widths, and that a type scale's min/max needs the operator's confirmation before it is
generated — none of which is visible from this file alone, and none of which the Figma MCP skills
(`figma-generate-library`, `figma-use`, and similar) know to enforce on their own.

- Once a Design is complete, link it from the relevant User Story/Spike's plan so agents know which
  design applies and exactly where to find it.
- A project typically uses a design system, which may live in the same Figma file as the
  Story-specific design, or a separate one — a human will tell you which. For this solution the answer
  is recorded once, in [`solution/figma.md`](../standards/solution/figma.md).
- **A UI surface needs a design, exported frames, or explicit human approval to proceed without
  one.** This applies to any work item with a UI surface — not only Design items, and whether or not the
  prompt mentions Figma. A Design *work item* is not required: an approved frame in the governing Figma
  file is enough. If no design exists, stop and raise it; UI intent described in prose is allowed only
  after a human explicitly approves proceeding without a design, and that approval is recorded in the
  plan. The stop rules are in [`technologies/figma.md`](../standards/technologies/figma.md) →
  *No design, no build*.
- **A Design item is closed by a human only** — an agent can create one and do the Figma/description
  work, but moving it to `Closed` signals stakeholder sign-off, which an agent cannot grant on its own
  behalf. **A Design item may not close until every frame it delivers is approved** — marked Ready for
  dev in Figma and recorded as approved (in the screen index, or confirmed and recorded in the plan for
  a frame not yet indexed). If a Design item is `Closed` while a frame it delivers is not approved, stop
  and raise it rather than choosing one. Approval rules: `technologies/figma.md` → *Approval*.

### Task — stays restrictive

No standalone Task has been needed in this framework's trial to date. Keep the rule as-is: Task is for
non-development, human-visible work only, and **an agent must ask a human before creating one.**

## Field reference-name map

**Every level has its own slug field, and writing the wrong one succeeds silently (HTTP 200) while
storing the value where nothing reads it.**

| Purpose | Display name | **Reference name** | Type | On |
|---|---|---|---|---|
| Epic join key | Epic Slug | `Custom.epicslug` | string | Epic |
| Feature join key | Feature Slug | `Custom.FeatureSlug` | string | Feature |
| Branch join key | Primary Slug | `Custom.PrimarySlug` | string | Analysis, Design, User Story, Spike, Bug, Issue |
| Milestone branch | Milestone Slug | `Custom.MilestoneSlug` | string | Milestone |
| Analysis conclusion | Outcome | `Custom.Outcome` | **html** | Analysis only |
| **Quotation estimate** | Quotation Points | `Custom.QuotationPoints` | double | Analysis, Design, User Story, Spike — **agent sets this only once, at creation**; after that, humans only |
| Working estimate | Story Points | `Microsoft.VSTS.Scheduling.StoryPoints` | double | Analysis, Design, User Story, Spike — may be revised during individual item planning |
| **Rework estimate** | Rework Points | `Custom.ReworkPoints` | double | User Story, Spike — written **only** by [`rework`](../skills/rework/SKILL.md) with `plan-work-item`; Story Points stays unchanged during rework |
| Human test guide | How To Test | `Custom.HowToTest` | **html** | User Story, Spike |
| Human-verifiable AC | Acceptance Criteria | `Microsoft.VSTS.Common.AcceptanceCriteria` | **html** | Epic and below — see note |
| Hours planned | Original Estimate | `Microsoft.VSTS.Scheduling.OriginalEstimate` | double | Milestone |
| Hours left | Remaining Work | `Microsoft.VSTS.Scheduling.RemainingWork` | double | Milestone |
| **Work began** | Start Date | `Microsoft.VSTS.Scheduling.StartDate` | dateTime | User Story, Spike — an observation, never set ahead of actual start |
| **Wanted by** | Target Date | `Microsoft.VSTS.Scheduling.TargetDate` | dateTime | User Story, Spike — **human-set only, never write this** |
| Blocker triage | Severity | `Microsoft.VSTS.Common.Severity` | string (picklist) | Blocker |
| Description | Description | `System.Description` | **html** | all |
| Reproduction steps | Repro Steps | `Microsoft.VSTS.TCM.ReproSteps` | **html** | Bug, Issue |
| Environment detail | System Info | `Microsoft.VSTS.TCM.SystemInfo` | **html** | Bug, Issue |
| Parent link | Parent | `System.Parent` | integer | children |
| Figma project name | Figma Design Project Name | `Custom.FigmaDesignProjectName` | string | Deliverable, Design |
| Figma project link | Figma Design Project Url | `Custom.FigmaDesignProjectLink` | string | Deliverable, Design |

**Where the Figma project lives.** A Deliverable carries the authoritative Figma project for
everything under it — `Custom.FigmaDesignProjectName`/`Custom.FigmaDesignProjectLink`. A Design item
inherits both fields from its ancestor Deliverable by default; only override them on the Design item
itself when a more specific reference is available (e.g. a particular node/page within the same
project), never to point at a different project. **The lookup applies to every work item with a UI
surface** — Design items, User Stories, Spikes, Bugs and Refactors alike, and regardless of whether the
item or prompt mentions Figma: check these two fields on the item itself first, then walk up to the
parent Deliverable if unset — do not assume the link only lives in free-text `Description`. A
Deliverable with more than one client app may need more than one Figma project; if so, say which
project applies to which app in the Deliverable's `Description`, since the two fields only hold one
project.

**For this solution, the walk-up ends in the repo.** Which Figma file governs which app is recorded
once in [`solution/figma.md`](../standards/solution/figma.md), and every frame an item builds from is
resolved through the screen index it defines — never from a node ID remembered or copied from prose.
If no link is supplied at all, that file is still the answer: **never use a different Figma file for an
app than the one it names**, and if the Deliverable's fields disagree with it, stop and raise it.

**Separator convention: every slug is lowercase and hyphen-separates words, with no exceptions** —
`design-alignment`, `core-gameplay-screen-alignment`, `align-header-nav`. This applies uniformly across
`Custom.epicslug`, `Custom.FeatureSlug`, `Custom.PrimarySlug` (including on Bug and Issue) and
`Custom.MilestoneSlug`. There is no longer a no-separator exception anywhere in this hierarchy — an earlier version
of this document carved one out for Epic; that was wrong, and any Epic slug written before this
correction should be fixed to hyphen-separated form the next time it is touched.

**Quotation Points is the one field an agent writes exactly once.** It exists so that a quote given to
a client survives later re-estimation: `plan-epic` sets it at creation time for every Analysis,
Design, User Story and Spike it creates; `plan-work-item` and later re-planning may adjust `Story
Points` freely but must never touch `Quotation Points` again. If a quote needs revising, that is a
human decision made directly in ADO.

**Every Story Points adjustment gets a Comment explaining why.** When `plan-work-item` or later
re-planning changes `Story Points` from its original value, add a Comment to the work item
summarizing the reason for the change — this is the record of why the working estimate moved away
from the quote. Post it as a Comment (`System.History` via the comment-write API/tool, not a direct
field write), **never** folded into `Description` or `Acceptance Criteria` — those describe the work
itself, not the history of its estimate.

**Note on Epic-level Acceptance Criteria.** The field exists on Epic (verified live) but historically went
unset — a human-authored Epic often carried a `Description` with no `Acceptance Criteria`, and nothing in
this framework wrote one. `plan-deliverable` is the first skill to set a concise Epic-level AC, when it
creates Epics from a Deliverable interview. An Epic authored directly by a human with no AC is not an
error; it simply predates that convention or was planned outside this skill.

**Notes that will bite if forgotten:**

- `Custom.HowToTest`, `Microsoft.VSTS.Common.AcceptanceCriteria`, `Custom.Outcome` and
  `System.Description` are **HTML** fields. Write HTML or set `format: "Html"` — plain newlines will
  not render as line breaks.
- **The read path is two calls.** WIQL (`wit_query` action `wiql`) returns work-item ids only, even
  when the query names columns. Fetching field values is a second call (`wit_work_item` action
  `get_batch`).
- **No delete tool exists on the MCP surface.** This is a desirable safety property: agents can create
  and update work items, but cannot destroy them. Cleanup, if ever needed, goes through the web UI or
  REST directly, by a human.
- `System.Parent` patches can silently no-op if the wrong shape is sent, and re-parenting is an
  unlink-then-link operation in two separate calls, not a single field update — verify the parent link
  by reading the item back after writing it.

## State model

Analysis, Design, User Story and Spike: `New`, `Active`, `On Hold`, `Blocked`, `Closed`. User Story and
Spike also have `Testing` (PR raised, awaiting verification after merge) and `Removed` (verified live
2026-10-07).

**Only a human moves an item out of `Closed`.** An item that was built but failed verification is
reworked under the same item with [`rework`](../skills/rework/SKILL.md), never by opening a new item
for the same requirements. `rework` refuses a `Closed` item until a human moves it back to `Testing` or
`Active`.

**Raising a Blocker sets its parent's state to `Blocked`.** The parent returns to `Active` only when
*every* open Blocker under it is resolved. Blockers are deliberately fine-grained — one finding often
warrants several — so the board always shows exactly what remains before a blocked item can resume.

## New context goes to a comment, not into Description/AC by default

Planning is rarely one-shot. A discussion with a human, a discovery in the repo, or a result from another
tool routinely surfaces something that seems to call for a change to `Description`, `Acceptance Criteria`,
`Story Points`, or another field — after that field was already set. Default to recording that new context
as a **comment** on the work item (`wit_work_item_comment_write`), not by rewriting the field.

- **`Description` and `Acceptance Criteria` stay concise and focused on development context** — what to
  build and how its correctness is observed, generated from the repo per the section below. They are not
  a running log of everything discussed. A comment is where rationale, discussion outcomes, and
  incidental new information belong.
- **Only edit the field itself when the new context is absolutely necessary to keep it accurate** — the
  work genuinely changed shape, or the acceptance criteria the field states are now wrong. That is a
  deliberate edit to the repo source, regenerated per *Repo → ADO for content* below, not a quick patch
  made directly in ADO.
- This applies to `Story Points` the same way: a revised estimate that reflects newly understood scope is
  a field edit; a passing note about *why* the estimate might need revisiting later is a comment.
- **`Custom.QuotationPoints` is never touched by this rule or any other reason** beyond its one
  set-at-creation write — see below.

## Repo → ADO for content, ADO → repo for state

Generate **Description**, **Acceptance Criteria** and **How To Test** from the repo (a spec, a plan,
or the item's own brief), never the reverse. After generation, these fields are not hand-edited in
ADO — change the repo source and regenerate. State (which stage an item is in) flows the other way:
ADO is authoritative, and the repo reads it, never asserts it independently.
