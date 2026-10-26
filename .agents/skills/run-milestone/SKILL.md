---
name: run-milestone
description: Implement one milestone of a User Story or Spike — load only the standards the touched files trigger, write the two ledgers while working, raise a Blocker rather than deciding, and leave the tree valid and toggled at every stopping point. Use when starting or continuing implementation of a planned work item.
---

Implement **one** milestone, leave the tree valid, and write the ledgers **while** working — not after.

> **Why "while".** Retrospective notes are written after the surprise has been rationalised, which is why
> they under-report. The value of the run log is that it records what was believed *at the time*.

## 1. Open the right context, and only that

- The spec at the repo path dictated by [`.agents/specs/README.md`](../../specs/README.md) — normally
  `.agents/specs/epics/<epic-slug>/features/<feature-slug>/work/<primary-slug>/spec.md`, or
  `.agents/specs/items/<item-slug>/spec.md` for deliberately loose work. For sub-5-point work, use the
  ADO item itself, which correctly has no spec.
- The milestone's checklist in the repo. **Not** an ADO `Task`: a Task is non-development work and needs
  human approval to create (per [`azure-devops.md`](../../context/azure-devops.md)).
- **Only the Tier 1 standards whose `applies-when` trigger matches the files you are touching.** The index
  is [`.agents/standards/README.md`](../../standards/README.md). Reading every standard is equivalent to
  reading none — that is the failure this tiering exists to correct.

**Check the design before building a UI surface.** If the plan already carries a
[`design-fidelity-check`](../design-fidelity-check/SKILL.md) result, read its citations; if it carries none,
run the skill in `locate` mode now and record the result in the run-log entry. A stop from the skill (a
missing, unapproved or unreachable design) stops the milestone — raise it, do not build around it.

### Fire the tracer bullet first

On the item's first milestone, build the skeleton **before any functional code**. Follow the spec's
`## Step 1: Tracer bullet`. Below 5 points there is no spec, so derive the path from the AC. A change
confined to one file in one layer has no path to trace, so record that in the run log and move on.

- **Stub every element on the path, for real.** Final names, signatures, layer, folder and access
  modifier. Register it in DI, bind its options, and add the disabled toggle. Write it to the standards:
  this code is kept and grown, not thrown away. Only the behaviour is missing.
- **Prefer a round that travels.** A request that crosses every layer and returns a placeholder proves
  more than a skeleton that only compiles. Compiling proves the shape. Travelling proves the wiring.
- **Write skeleton tests that prove access, not behaviour.** The test project reaches each domain
  element it must exercise through the access the design intends, or the repo's existing test-access
  mechanism. Never widen a type or member to make a test compile. That widening is a miss, not a fix.
- **Check the hit.** The build is green and the architecture or layer-rule tests pass. Each element can
  reach its dependencies without a forbidden project reference or a service-locator workaround. Config
  and settings inject. The data the requirement needs has a real source.
- **Commit the skeleton on its own**, under the item's own commit type (for example
  `feat(<scope>): add tracer bullet for <slug>`). The tree is valid and the capability is unreachable, as at every other stopping point. Leave out a database
  migration until the skeleton holds, because a committed migration is irreversible.

**A miss is the cheapest finding the item will produce.** Missing data, an architecture violation, an
inaccessible dependency, or a contradiction with the spec or an ADR all count. Record it in the run log
under *What surprised you*. Adjust the aim if the fix sits within the item's scope. Otherwise raise it
(§5) and **do not start functional code until the skeleton holds.** Then fill in behaviour along the
path the tracer laid. Do not open a second path beside it.

### Then implement

- Conventional Commits, per [`commits.md`](../../standards/commits.md).
- **Leave the tree valid at every stopping point** — it compiles, tests pass, and the capability is
  unreachable behind a **disabled** toggle. The toggle is introduced in the first milestone, never
  retrofitted.
- **Re-check the consumers of every shared mechanism you change.** The plan's *Functional impact*
  section is where to start, not the full list. Before the change, search the code for the mechanism's
  consumers again. Add any the plan missed to the spec, or to the run log below 5 points. After the
  change, re-check each consumer:
  - for a UI consumer, run [`design-fidelity-check`](../design-fidelity-check/SKILL.md) `verify` on the
    affected screen;
  - for a non-UI consumer, run a functional smoke check, either a test that exercises it or the action
    performed in a running app.

  Record each consumer and its result in the run-log entry. **A possible break stops the milestone**:
  escalate it (§5). Never leave a consumer broken to finish this item. A shared mechanism the plan did
  not list is a possible break until it has been re-checked.
- Match the surrounding code's idiom, naming and comment density. **Align incrementally; do not rewrite.**

## 4. Write the ledgers as you go

**Run log** — one file per entry at `.agents/run-log/YYYY-MM-DDTHHMMZ-<work-item-id>-<slug>.md` (UTC
time, no colons, whole filename at most 90 chars), with `work-item` and `summary` frontmatter (see
[`TEMPLATE.md`](../../run-log/TEMPLATE.md) and [`README.md`](../../run-log/README.md)). There is **no
index to update** — the entry file is the record, and the gate validates it
(`node .agents/scripts/ledgers.mjs --check`). Make the slug a concise, searchable summary; rename it
freely before merge, never after.

Each entry records three things: **what changed**, **what surprised you**, **what you assumed**.

**Assumption ledger** — one file per assumption at `.agents/assumption-ledger/asmp-<id>-<slug>.md`
(see [`README.md`](../../assumption-ledger/README.md)), with `status: open | settled`, `tier`, `claim`, `settles`, and
`outcome` (once settled) frontmatter (see
[`TEMPLATE.md`](../../assumption-ledger/TEMPLATE.md)). Add an entry whenever you must assume something
**load-bearing**. No index to update; `node .agents/scripts/ledgers.mjs --open` lists open entries.

> Only load-bearing claims get a tier. Tagging prose makes it theatre, which is worse than nothing.

## 5. Raise a Blocker rather than deciding

When you meet an `assumed` claim you cannot resolve **within your own scope** — a decision needed, an
architectural surprise, a cost implication, a discovered dependency — **raise a Blocker under the User
Story or Spike. Always set `Severity`.**

**Raising a Blocker sets the parent to `Blocked`**, and affected development waits. The parent returns to
`Active` only when *every* open Blocker under it is resolved. Several granular Blockers per finding is
correct.

**Phrase a Blocker around the cause, not the symptom.** One titled after a symptom closes when the symptom
clears, taking its unresolved findings with it.

Blocker states are **`New` / `Active` / `Closed` only.** A Blocker has no `Blocked` state.

**Possible breaks and contradictions.** A consumer that could break, or a design that omits or changes
something an existing feature depends on, is escalated. It is never guessed. **Always stop and ask in the
session first.** Give what you found, what depends on it and the options. **Also raise a Blocker, with
`Severity`, when the decision needs someone who is not present, or when the session would otherwise end
blocked.** The Blocker lets the concern outlive the session. Record the decision in the plan.

## 6. Verify a surprising negative before reporting it

*"X is missing", "Y is empty", "Z isn't wired"* — if the absence would surprise whoever built the thing,
**the surprise is evidence about your instrument, not the system.** Check a second way first.

This applies to your own tooling too: a gate that reports "not applicable" may mean nobody wired it up.

## 7. Close the milestone

1. Run [`design-fidelity-check`](../design-fidelity-check/SKILL.md) in **`verify`** mode and record its
   result line in the run-log entry — `not applicable` with its reason included. Drift, or a `FAIL` or
   `UNVERIFIED` result from the verification bar, stops the close. Every consumer of a changed shared
   mechanism has a recorded re-check (§3). A missing one also stops the close.
2. Run **`conformance-review`** — before merging, not after.
3. Record in the repo, beside the checklist: **what was implemented** (observable behaviour, not internals),
   **how to test it** (exact commands and expected output), **assumptions** made where the plan was silent,
   and **what comes next**.
4. Update the Milestone's **`Remaining Work`**.
5. **Merge the milestone branch into the primary branch directly — no PR.** Git history is the checkpoint.
6. Cut the next milestone branch from the primary branch. Set the completed Milestone to **`Closed`**.

## 8. On the final milestone only

Raise the PR from the primary branch to `main`, following the repo's
[`pull-request-template.md`](../../pull-request-template.md):

- Fill in every section the template requires — what and why (linking the work item) in *Summary*, the
  end-user *Test case summary* (New / Impacted, max 300 characters), where to start reviewing in *Notes
  for the reviewer*, and how the agent tested it in *Verification*.
- **Link the work item on the PR**, not only via a commit trailer.
- Set the User Story or Spike to **`Testing`**. Child Blockers and Milestones should already be `Closed`.

**Do not approve. Do not merge.** An AI agent may never approve a PR, and humans merge to `main`.
