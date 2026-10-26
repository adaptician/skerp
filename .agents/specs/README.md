# Specs — the planning depth ladder

Planning artefacts under `.agents/specs/` are produced by three skills, at three different altitudes, and
the artefact for a given piece of work is dictated by where it sits — never authored by default.

```
.agents/specs/
├── deliverables/<deliverable-slug>/
│   └── README.md                                    (Deliverable brief — plan-deliverable, optional)
├── epics/<epic-slug>/
│   ├── README.md                                    (Epic overview — plan-epic)
│   └── features/<feature-slug>/
│       ├── README.md                                (Feature-level plan — plan-epic)
│       └── work/<primary-slug>/
│           └── spec.md                              (one-page spec — plan-work-item, 5–8 points only)
└── items/<item-slug>/
    └── spec.md                                      (one-page spec for loose work not under an Epic)
```

**No file is written by default.** Below 5 points, a User Story or Spike gets no spec at all — its
Description, Acceptance Criteria and How To Test live directly in ADO. This replaces an earlier
three-phase `requirements.md → plan.md → tasks.md` pipeline that produced three documents per feature
regardless of size; that was the pipeline's shape, not a reflection of what the work needed.

## Who writes what

- **`plan-deliverable`** ([`.agents/skills/plan-deliverable/`](../skills/plan-deliverable/SKILL.md))
  writes the Deliverable brief, when a new Deliverable is scoped through a structured interview. This is
  **optional, never a gate** — the backlog is routinely built by humans and agents collaborating, and a
  Deliverable or its Epics may be created directly in ADO without this skill ever running. `plan-epic`
  and everything below it works the same either way; nothing downstream depends on a brief existing.
- **`plan-epic`** ([`.agents/skills/plan-epic/`](../skills/plan-epic/SKILL.md)) writes the Epic overview
  and one Feature-level plan per Feature, when an Epic is first scoped and again before authorising a
  new Feature under one that already has some.
- **`plan-work-item`** ([`.agents/skills/plan-work-item/`](../skills/plan-work-item/SKILL.md)) writes (or
  deliberately refuses to write) the per-item `spec.md`, one User Story or Spike at a time, once that
  item is at the front of the backlog `plan-epic` produced.

None of the three plans below its own altitude: `plan-deliverable` never decomposes an Epic into
Features; `plan-epic` never plans a Milestone or writes a spec; `plan-work-item` never re-decomposes an
Epic.

## The Deliverable brief

Optional, and only present when a Deliverable was scoped through `plan-deliverable`'s interview rather
than built directly in ADO by a human. When it exists, it is the vision every lower level of planning
reads before making a decision, not a status report. Covers: the vision in a few sentences (what "done"
looks like, observably); target audience, monetisation model, budget, delivery period, architecture
preferences, third-party dependencies, legacy constraints and compliance requirements — each only where
the interview surfaced real content, explicitly marked absent otherwise; a non-negotiables-versus-flexible
list, kept separate and explicit; open questions the human could not yet answer; and the Epics this
Deliverable decomposed into, each linking to its own overview below once `plan-epic` has run against it.

Its absence is never a gap to fill before authorising an Epic — see *Who writes what* above.

## The Epic overview

Short. States the Epic's outcome in a few sentences and lists its Features, each linking to its own
plan. ADO owns the hierarchy, state, estimates and dates; this file owns durable planning content only.
Nothing here duplicates a field ADO already tracks.

## The Feature-level plan

**A plan, not an implementation specification.** Each User Story or Spike under the Feature gets its own
planning artefact only when it reaches the front of the sequence — this file does not pre-plan them.
Cover, in this order:

1. **Outcome** — what someone can do after this Feature ships that they could not do before.
2. **Decision boundary** — in scope and out of scope, both stated explicitly. An absent out-of-scope
   list is not "everything else is in scope" — it is a gap to fill before the Feature is planned.
3. **Evidence table** — every load-bearing claim the Feature rests on, its evidence tier (per
   [`.agents/adrs/README.md`](../adrs/README.md) — *Evidence tiers*), and — for anything not
   `measured` — what would settle it. An `assumed` claim listed here does not block writing this plan;
   it blocks a *User Story built on top of it* until `plan-work-item`'s gate is satisfied.
4. **Work-item decomposition** — every User Story and Spike, its primary slug, and a sentence on what it
   adds. State the order and why: parallel only when the items genuinely have disjoint write surfaces.
5. **Observable proof** — how a human confirms the Feature works, both the positive behaviour and at
   least one thing that should be refused.
6. **Completion boundary** — what must be true, across every item under this Feature, for the Feature
   itself to be done. A Story is a step; the Feature's Definition of Done applies to the whole, not to
   each step individually.

## The per-item spec (5–8 points)

One page, produced only by `plan-work-item`, only in the 5–8 point band. Below 5, no spec; above 8, a
refusal to decompose or a Spike. Contents, drawn from the item's own scope (not the whole Feature):

- **What and why** — the user-visible behaviour and why it matters, in a few sentences.
- **Acceptance criteria** — Given/When/Then, see *Acceptance criteria format* below.
- **Step 1: Tracer bullet** — the thinnest kept, end-to-end skeleton of the elements the item needs,
  with their layer, access level and stub behaviour, and the checks it must pass before functional
  code starts. Comes before the Milestones. See `plan-work-item` §4 and `run-milestone` §3.
- **Milestones**, only if the item needs step-wise iteration — see
  [`.agents/standards/plans.md`](../standards/plans.md) for branch naming and merge criteria. A
  single-step item has no Milestones section.
- **Functional impact** — the shared mechanisms the change touches, their consumers found by code
  search, and the risk to each, or an explicit statement that there are none. See `plan-work-item` §7.
- **Deployment** — per environment, or an explicit statement that none is needed.

`run-milestone` implements against this file directly; it is not restated in ADO except as generated
Description/Acceptance Criteria/How To Test.

## Loose work outside an Epic

Work with no Epic — a standalone fix, a piece of technical debt — uses
`.agents/specs/items/<item-slug>/spec.md` under the same one-page format and the same depth-ladder rule
(no spec below 5 points).

## Acceptance criteria format

Every acceptance-criteria section, wherever it lives (a Feature plan's evidence-adjacent items, a
per-item `spec.md`, or ADO directly below 5 points), uses Given/When/Then form:

- **Given** — the precondition / starting state.
- **When** — the action or event that occurs.
- **Then** — the observable outcome.

Use additional **And** clauses to extend any of the three steps when necessary. Group related scenarios
under a short heading that names the behavior.

Example:

```markdown
## Login with valid credentials

- **Given** a user with email "user@example.com" and password "correct-horse-battery-staple" exists
- **And** the user is on the login page
- **When** the user submits the login form with those credentials
- **Then** the response status is 200
- **And** the response body contains a `session_token` cookie
- **And** the user is redirected to `/dashboard`

## Login with invalid password

- **Given** a user with email "user@example.com" exists
- **And** the user is on the login page
- **When** the user submits the login form with email "user@example.com" and password "wrong"
- **Then** the response status is 401
- **And** the response body contains the error code `INVALID_CREDENTIALS`
- **And** no session cookie is set
```

Each criterion should be observable from outside the system (status codes, response bodies, UI state,
persisted data) — not internal attributes such as "the `LoginHandler.Authenticate` method was called."
Internal-only criteria are unverifiable for someone unfamiliar with the implementation, and are usually a
sign the criterion belongs in a unit test rather than an acceptance section.

## Decisions with repo-wide impact

A decision made while writing a Feature plan or an item spec that has repo-wide impact becomes an ADR
under [`.agents/adrs/`](../adrs/) (see that directory's README for evidence tiers and the Provisional
status), referenced from the Feature plan rather than duplicated into it. A decision scoped to one item
stays in that item's spec.

## Milestones and Complex work

Some 5–8 point items, and anything a human explicitly asks to be planned as Complex, need step-wise
iteration. [`.agents/standards/plans.md`](../standards/plans.md) governs Milestone branches, the
Test-Stop record at each milestone boundary, and the criteria for merging a primary branch to `main`.
That standard's rules apply regardless of whether the work has a `spec.md` or lives directly in ADO.
