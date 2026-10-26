---
name: plan-deliverable
description: Interview a human about a new Deliverable — the top of the work hierarchy — to understand the business vision, audience, monetisation, budget, delivery period, architecture preferences, third-party dependencies, legacy constraints and compliance requirements at a high level, then create the Deliverable and its Epics in ADO (each Epic with a concise Description and Acceptance Criteria) and write the Deliverable-level README the rest of planning reads. Use when starting a brand-new Deliverable, scoping a large initiative before any Epic exists, or when asked to run intake or a kickoff interview for a new product/initiative. Does not decompose an Epic into Features — hand off to plan-epic for that.
---

Interview a human about a **Deliverable** — "functional, complete, deployable, runnable, stable, valuable"
per [`azure-devops.md`](../../context/azure-devops.md) — before any Epic exists, and turn that interview
into: the Deliverable itself in ADO, the Epics beneath it (each with a concise Description and Acceptance
Criteria), and one README that carries the vision every lower level of planning reads before it starts
cutting the work into smaller pieces.

> **Draft status.** This skill is new and untested against a real intake. Treat every output as a
> proposal to walk through with the human being interviewed, not a finished plan, until it has run
> against several practice Deliverables and the process is confirmed smooth.

## 1. Scope — what this skill is and is not

**This is the highest altitude in the hierarchy, and it stays there.** The output is a *vision*, not a
technical plan: the Epics this skill creates get a concise Description and Acceptance Criteria each, not
a Feature breakdown, not an architecture, not an estimate.

**This skill is optional, never a gate.** The backlog is routinely built by humans and agents
collaborating, not exclusively by either — a human may create a Deliverable, or Epics directly under one,
in ADO without ever running an interview. That is a normal, first-class way for this hierarchy to get
populated, not a shortcut being taken around this skill. `plan-epic` and everything below it already
works fine against an Epic that has no Deliverable, or a Deliverable with no README — nothing this skill
produces is a prerequisite anywhere else in the Delivery Loop. Reach for this skill when a structured
intake conversation is genuinely the right tool for scoping something new and large; do not treat its
absence as a gap that must be filled before an Epic can be authorised.

- **Does not decompose an Epic into Features or Stories/Spikes.** That is
  [`plan-epic`](../plan-epic/SKILL.md), once an Epic from this skill's output reaches the front of the
  queue.
- **Does not plan Milestones, write a spec, or estimate.** Nothing this skill creates carries
  `Custom.QuotationPoints` or `Microsoft.VSTS.Scheduling.StoryPoints` — those fields do not exist on
  Deliverable or Epic in this org's process, and estimation starts at the Feature/Story/Spike level.
- **Does not invent answers.** Every topic in §3 is a question to put to the human, not a plausible
  default to fill in on their behalf. An unanswered topic is recorded as an open question, never as an
  assumed fact dressed up as a decision.

## 2. When to run this

- A brand-new Deliverable with no Epics under it yet.
- A human asks to scope a new product, major initiative, or capability large enough that "which Epics
  does this even need" is itself an open question.
- **Re-run before authorising a new Epic** under a Deliverable that already has some, the same way
  `plan-epic` re-runs before authorising a new Feature (see §7) — the vision may have moved since the last
  pass.

If the request is already Epic-sized — a human hands you a single Epic's Description and Acceptance
Criteria directly — this skill has nothing to add. Go straight to `plan-epic`.

## 3. The interview — ask, don't assume

Run this as an actual interview: work through one topic at a time, let the human's answer to one topic
reshape how you ask the next, and resolve tension between answers before moving on — the same discipline
[`grill-me`](../grill-me/SKILL.md) applies to interrogating a plan, aimed here at first *producing* the
vision rather than stress-testing an existing one. If a topic's answer is genuinely discoverable — an
existing README, a prior ADR, a market-research doc the human points you at — read that instead of asking
a question whose answer is already written down.

Cover, at minimum:

- **Problem and vision.** What is being built, for whom, and why now. What does "this Deliverable is
  done" look like, observably — not a feature list, an outcome.
- **Target audience.** Who uses this, and any segments that matter (internal vs. external, tiers, roles).
- **Market and competitive context.** Research already done, competitors, what differentiates this. Ask
  what exists; do not generate competitive analysis yourself — that is the human's domain knowledge, not
  something to be plausibly invented.
- **Monetisation model.** How this makes money, if at all — subscription, one-off purchase, usage-based,
  ads, or an internal cost-saving/efficiency case with no direct revenue.
- **Budget constraints.** A hard ceiling, a soft target, or genuinely uncapped-but-time-boxed. Ask
  explicitly which it is — "no budget mentioned" and "unlimited budget" are different facts and must not
  be conflated.
- **Delivery period.** Target timeframe, any hard external deadlines (a contractual date, a launch event)
  versus aspirational ones, and whether a phased/staged rollout is expected.
- **Architecture preferences and constraints.** Existing stack mandates, a required cloud/hosting
  provider, platforms that must be reused rather than replaced. Distinguish a genuine constraint from a
  preference — ask "must" or "would prefer."
- **Third-party dependencies.** Integrations already known to be required, and any vendor lock-in concerns
  that should shape how those integrations are isolated later (this feeds `integrations.md` once a
  Feature reaches that level).
- **Legacy systems.** What this replaces, what it must interoperate with during a transition, and how long
  that coexistence period needs to last.
- **Compliance and regulatory constraints.** Data residency, industry regulation, accessibility mandates,
  required certifications. Get specific — "must be accessible" is not the same fact as "must meet WCAG
  2.2 AA."
- **Non-negotiables versus flexible.** Ask directly, across everything above: which of these is genuinely
  fixed, and which is a preference that could give way under pressure elsewhere? A vision that does not
  distinguish the two hands every lower-altitude planning decision an unstated tripwire.

**If the human does not know yet:** record it plainly as an open question in the README (§6), not as an
invented plausible answer. Do not block the interview on it — a topic that needs dedicated research (e.g.
market sizing) becomes an Analysis under whichever Epic it bears on most, once Epics exist; this skill
does not create Deliverable-level Analysis items, because that level does not exist in this org's
hierarchy (see `azure-devops.md`) and inventing one is exactly the parallel-vocabulary mistake `plan-epic`
already warns against.

## 4. Decompose into Epics

Once the topics in §3 are covered, distil the vision into the smallest set of Epics that are each a
distinct **offering within the Deliverable** — per `azure-devops.md`'s definition of the level. This is
the same kind of seam-finding `plan-epic` does one level down when it splits an Epic into Features; here
the seam is between offerings, not between capabilities within one offering. Getting the split right
matters more than getting it fast, for the same reason it does at the Feature level: an Epic that is
really two offerings forces artificial coordination between Epics that will always ship together, and an
Epic that is too thin creates the same overhead in reverse.

Do not go further than this. Each Epic gets a concise Description and Acceptance Criteria (§5) — not a
Feature list. `plan-epic` does that decomposition, deliberately later, once that specific Epic is
authorised to be worked.

## 5. Create or update the Deliverable and its Epics in ADO

**The Deliverable itself, verified live against this org's process:** it carries `System.Title` and
`System.Description` only — no dedicated slug field, no `Acceptance Criteria` field, no estimate fields
exist on the Deliverable work item type. Do not go looking for a `Custom.DeliverableSlug` or equivalent;
none exists. The join between the Deliverable and its repo README (§6) is carried by naming the README's
path inside the Description, the same convention used elsewhere in this framework for generated content
(see `plan-work-item`'s "Description must name the planning-source path").

- **If the Deliverable does not exist yet**, create it with the human-agreed title and a Description
  summarising the vision in a few sentences plus the README path.
- **If it already exists** (a human may have created it with just a title before this interview), read
  it first, then update its Description once the interview is complete.

For each Epic this decomposition produces:

- Create it under the Deliverable (`System.Parent`).
- Set `Description` to the slice of the vision this specific Epic covers — not the whole Deliverable
  restated, and not empty.
- Set `Acceptance Criteria` (`Microsoft.VSTS.Common.AcceptanceCriteria`) — **concise**, Given/When/Then
  per [`.agents/specs/README.md`](../../specs/README.md), stated at the outcome level this altitude
  calls for. This is not the detailed, code-observable AC a Feature or Story carries; it is the
  observable shape of "this offering exists and does what it says," enough for `plan-epic` to decompose
  against without having to re-derive the intent from scratch.
- Set `Custom.epicslug` — lowercase, no separator, per `azure-devops.md`.
- **Do not set an estimate field.** Neither `Custom.QuotationPoints` nor
  `Microsoft.VSTS.Scheduling.StoryPoints` exists on Epic in this process; estimation starts at
  Analysis/Design/Story/Spike, which `plan-epic` handles.

## 6. Write the Deliverable README

**One file:** `.agents/specs/deliverables/<deliverable-slug>/README.md`, generated once and updated on
re-runs — never duplicated into ADO beyond the pointer in the Deliverable's Description. Cover:

- The vision, in a few sentences — what "done" looks like, observably.
- Each topic from §3 that has real content, under its own heading. Omit a topic only by saying
  explicitly that it does not apply or was not answered — never by silent omission; a missing heading
  reads as "not asked," not "not applicable."
- **Non-negotiables versus flexible constraints**, listed separately and explicitly — this is the section
  every lower-altitude plan should check before treating something as fixed.
- **Open questions** — anything the human could not answer yet, plainly flagged, with what would settle
  it if that is known.
- The Epics this decomposition produced: title, ADO id, and the one-sentence slice of the vision each
  covers. Link to the Epic's own overview (`plan-epic`'s output) once one exists; until then, say plainly
  that it has not been planned yet.

**This README is the target vision, not a status report.** Its job is to give `plan-epic` — and everyone
below it — a clear picture of what the Deliverable is *for*, so that Feature- and Story-level decisions
have something to move toward instead of being made in a vacuum. Do not let it accumulate a second file
alongside it; if you find yourself wanting a separate roadmap or research log, that is the retired
documentation-pipeline shape creeping back in (see `plan-epic`'s own warning about this).

## 7. Re-running against an existing Deliverable

This guidance applies to a Deliverable this skill (or an earlier interview) actually originated — a
Deliverable a human is managing directly in ADO does not need this skill's involvement at all, at any
point in its life. Where it does apply: run this again before authorising a new Epic under a Deliverable
that already has some, or when the human signals the vision itself has moved (a budget changed, a
competitor shipped something, a compliance requirement appeared). Re-interview only the topics that
plausibly changed — do not re-run the full interview from a blank slate if most of it still holds. Then:

- Add any Epics the updated vision now implies that don't exist yet.
- Update the README and the Deliverable's Description to match.
- **Do not restructure an existing Epic that already has Features or Stories under it** just because the
  vision shifted — flag the tension to the human instead. Restructuring a hierarchy with live work under
  it is expensive in a way that adding a new Epic beside it is not; let a human decide whether the
  existing Epic is re-scoped, superseded, or left as-is alongside the new direction.
- **New context that doesn't change what a field authoritatively states goes to a comment, not a
  rewrite.** Only regenerate the Deliverable's or an Epic's `Description`/`Acceptance Criteria` when they
  would otherwise be substantively wrong; log everything else (rationale, discussion outcomes, an aside
  from the human) as a comment on the work item. See
  [`azure-devops.md`](../../context/azure-devops.md) → *New context goes to a comment, not into
  Description/AC by default*.

## 8. Report

State: the vision in the same few sentences the README opens with, the Epic split chosen and why, every
ADO id created or updated, the path to the README written or updated, and every open question flagged. If
this is a re-run, say what changed since the last pass.
