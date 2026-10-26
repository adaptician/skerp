# Agent skills

Project-scoped agent skills are stored in this directory. A skill is a folder containing a `SKILL.md` file (with YAML frontmatter declaring `name` and `description`) and optional supporting files.

## Format portability vs. discovery-path portability

Two separate things are easy to conflate here:

- **The format is portable.** The `SKILL.md` structure follows the [Agent Skills open standard](https://agentskills.io) and is recognized by Claude Code, Codex, Cursor, Gemini CLI, Kiro, and other agents. The same file works everywhere.
- **The discovery path is *not* portable.** Tools scan different directories to find skills, so a file's *location* determines which tools auto-discover it:

  | Tool | Auto-discovers project skills in | Sees skills in this `.agents/skills/`? |
  |---|---|---|
  | **Codex** | `.agents/skills/` (CWD up to repo root) | Yes — native |
  | **Claude Code** | `.claude/skills/` (CWD, parents, nested) | **No** — does not read `.agents/skills/` |

`.agents/skills/` is therefore the **canonical** location (Codex-native, and the cross-tool convention). For Claude Code to pick a skill up, it must also exist under `.claude/skills/<name>/SKILL.md`.

### Keeping Claude Code in sync

We **mirror** every skill into `.claude/skills/`. The canonical copy stays here under `.agents/skills/`; the `.claude/skills/` copy is generated and carries a `MIRROR — do not edit here` banner pointing back to the canonical file. Never edit the mirror by hand — edit the canonical file and re-run the sync tool.

> Avoid symlinking the two locations: Codex follows symlinks but Claude Code's behavior is unreliable, and symlinks are awkward on Windows and in Git. A plain generated copy is the robust choice on this repo.

## Sync tool

`sync-to-claude.mjs` regenerates `.claude/skills/` from `.agents/skills/`. It copies each skill folder (the `SKILL.md` plus any `scripts/`, `references/`, or `assets/`), strips any BOM, and injects the MIRROR banner into each mirrored `SKILL.md`. Supporting files are copied verbatim.

```bash
node .agents/skills/sync-to-claude.mjs           # regenerate the mirror
node .agents/skills/sync-to-claude.mjs --check    # verify only; exit 1 if stale (CI / pre-commit)
node .agents/skills/sync-to-claude.mjs --prune    # also delete mirrors whose canonical source was removed
```

It is idempotent — the mirror is always derived from the canonical files, so re-running it is safe. It has no `node_modules` dependency (Node standard library only).

**When to run it.** There is no automatic trigger wired into tool configuration (hook config under `.claude/` and `.codex/` is human-owned). Run it manually whenever you add, edit, rename, or delete a skill under `.agents/skills/`. Two low-friction ways to make that habitual:

- **Pre-commit / CI gate (recommended):** run `node .agents/skills/sync-to-claude.mjs --check` and fail the commit or build if it exits non-zero. This catches a stale mirror before it lands.
- **Local convenience:** run the plain command after editing a skill, before committing.

If you bypass the tool and hand-edit a skill, only the tool-touched side changes; the other side drifts. `--check` exists precisely to detect that drift.

## Inventory — the Delivery Loop

These skills encode **the Delivery Loop**: an ADO-work-item-driven planning and build process, where every stage hands off to a named neighbour and the two review skills deliberately do not overlap. Together they run *Plan (Deliverable → Epic → Feature → Story/Spike) → Build → Prove → two reviews → PR → iteration → checkpoint*.

**Plan**

- `plan-deliverable/` — **draft, untested against a real intake yet.** Interviews a human about a new
  Deliverable — the top of the hierarchy — to surface the vision, audience, monetisation, budget,
  delivery period, architecture preferences, third-party dependencies, legacy constraints and compliance
  requirements, then creates the Deliverable and its Epics (each with a concise Description and
  Acceptance Criteria) and writes `.agents/specs/deliverables/<slug>/README.md`. Stops at the Epics; does
  not decompose one into Features.
- `plan-epic/` — **draft, untested against real Epics yet.** Decomposes an Epic's description into Features, and each Feature into User Stories and Spikes, creating the ADO backlog and one `.agents/epics/<epic-slug>/README.md`. Stops at the backlog; does not plan Milestones.
- `plan-work-item/` — plans one User Story or Spike at a time, once it is at the front of the backlog `plan-epic` produced. Estimates first, hunts for `assumed` load-bearing claims, then produces **exactly** the artefact the depth ladder requires; every spec opens with a **tracer bullet** step. **Two of its four outcomes are a refusal to plan** — that is the valuable part.
- `rework/` — **draft.** Re-plans a User Story or Spike whose first implementation
  was built but failed verification, under the **same** work item. Snapshots the item into a comment,
  diagnoses why the original failed, gets a human-approved rework type (🔴 retire and restart, 🟠
  retire part, 🟡 modify), and runs `plan-work-item` with stated overrides: an additive `rework-<n>.md`
  beside the original spec, new milestones only, the estimate in `Rework Points`, and a 20-point stop.
  Cleanup of what the first attempt left behind is in scope. Refuses a `Closed` item, and never runs
  without `plan-work-item`.

**Build**

- `run-milestone/` — implements one milestone, loading only the standards the touched files trigger. Fires a **tracer bullet** first — a kept, end-to-end skeleton that proves placement, dependencies, config and test access before any functional code. Writes the run log and assumption ledger **while** working, re-checks every consumer of a shared mechanism it changes, and raises a **Blocker** rather than deciding.

**Review — two altitudes, and neither may assume the other did the work**

- `conformance-review/` — code against its AC, the standards and the DoD. **In-session.** Architecture and design are deliberately **out of scope**.
- `coherence-review/` — whether the built system serves the **objective**. **Separate session, no build memory**, and never spawned as a subagent of the builder. Asks verbatim: *which stated constraint is actually a choice?* Prompt it with the work item or PR id to review (it falls back to the current branch only when given neither); when the branch has an active PR, it posts each actionable finding as its own severity-headed thread plus a summary thread.

**Iterate and adjudicate**

- `address-pr-feedback/` — works the review threads on the *same* branch, replies to every one, and applies the **scope guardrail**: a comment may change what was delivered, not silently add scope. A defect it cannot reproduce is never closed on its own conclusion: it replies with what it tried and leaves the thread open until the reviewer signs it off.
- `checkpoint/` — assembles the periodic human review: proof scripts first, then ledger deltas, coherence findings, Blockers by severity, estimate roll-up, and the documentation-to-code ratio.

**Design**

- `grill-me/` — interrogates a plan or design until it holds up. Sits outside the loop by design — invoked whenever a plan or decision needs interrogation before it is trusted, at any altitude.
- `design-fidelity-check/` — decides whether an item has a UI surface (recording "not applicable" with a
  reason when it does not), loads the design standards, and then either **locates** the item's approved
  Figma frames through the screen index and cites them in the plan, or **verifies** them live after
  implementation (exists, name, page, approval, fingerprint unchanged since approval) and runs the
  four-level verification bar from `design.md` (tokens, inventory both ways, judged visual, mechanism). Stops
  on a missing, unapproved, unreachable or drifted design. Called by `plan-work-item`, `run-milestone`,
  `conformance-review` and `coherence-review`; read-only against Figma. Its offline counterpart is the
  screen-index check in `verify.mjs`.

**Onboarding**

- `sync-scaffold/` — brings a solution's repo into alignment with the Grimoire scaffold: a fresh
  solution getting the scaffold for the first time, an existing one pulling in upstream scaffold
  changes, or a legacy codebase being adopted. Confirms the Azure DevOps org/project name is not
  still the scaffold's own default, assesses structural and planning conformance, proposes a
  non-destructive migration plan for the gap, and verifies the local environment (tool versions,
  MCP servers, connectors) actually works. Safe to re-run until conformance and environment setup
  are both green.

Add project skills alongside these under `.agents/skills/<name>/`, then run the sync tool.

### Retired 2026-08-17

`create-requirements`, `create-plan`, `create-tasks`, `self-review` — archived to
[`.agents/_archived/skills/`](../_archived/skills/README.md), not deleted. See that folder's README for
why.

## Adding a skill

When adopting a third-party skill, vendor it into this directory rather than relying on an external dependency — the skill should travel with the repo and be reviewable in version control. The guide at `.humans/recommended-skills.md` covers:

- Where to find open-source agent skills (official Anthropic repo, awesome-lists, marketplaces).
- A curated short-list of categories worth considering (ADR drafting, code review, security review, test scaffolding, commit authoring).
- The six-step adoption process (vet content, check license, copy don't link, adapt to this repo, document provenance, re-vet periodically).
- The deliberately cautious recommendation about *not* installing skills proactively.

## See also

- `.humans/recommended-skills.md` — recommendations and adoption process.
- `.humans/skills/writing-skills.md` — how skills are discovered and invoked.
