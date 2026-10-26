# Agent pull request

<!--
The agent-oriented PR template. It assumes the agent workflow
(`.agents/standards/agent-workflow.md`): specs, plans, the Definition of Done, and the
milestone test-stop flow. This is the canonical, host-agnostic copy — wire it to your
host's PR-template path (`.github/`, `.gitea/`, `.azuredevops/`) during repository
setup. A team that also wants a plain human template can add one alongside.

The first three sections (Summary, Test case summary, Notes for the reviewer) are what a
reviewer reads first. Keep them at the top; everything below is supporting detail.
-->

## Summary

<!--
One-paragraph description of what this PR does and why. Avoid restating the
diff — focus on user-visible behavior change and motivation.
For Milestone PRs: describe the scope of this slice specifically, not the full feature.
-->

## Test case summary

<!--
End-user test cases testable on delivery. MAX 300 CHARACTERS for the whole section.
Cover only the most important or impactful cases. Bullets, terse — sacrifice grammar for
brevity without losing clarity.

Each item: short use-case description + expected happy-path result.
- New — use cases the change created.
- Impacted — existing use cases the change affected.

No step-by-step instructions: a system built to quality guides its own users. Only get the
reviewer to the right area, and state prerequisites (feature toggle, login, permission,
tenant setup). May point to a config file or the relevant code file.

Good examples:
- With the Draft feature enabled on a tenant and the logged in user granted Draft Read and
  Write permissions, navigating to the Draft screen from the header menu should allow the
  user to see a list view of drafts and capture a new draft that is persisted to storage.
- With the maximum rate threshold configured to 10 requests and the fixed window configured
  to 5 seconds, 10 requests made to the NotificationWebhook API endpoint should be accepted
  if received in a 5 second period, while an 11th is rejected with HTTP status 429 until
  the window elapses.

Delete this comment and write "None" under a sub-section that has no items.
-->

### New

- <!-- use case + expected happy path -->

### Impacted

- <!-- use case + expected happy path -->

## Notes for the reviewer

<!--
Anything that needs reviewer attention: unusual choices, follow-up work, known
limitations, performance trade-offs, or specific files to focus on.
-->

## PR Type

<!--
Select one and delete the others. The type determines which sections below are required.
- Standard feature — a complete feature or fix merging to main.
- Milestone — one vertical slice of a complex feature, merging to the primary feature branch.
- Feature branch — the primary feature branch of a complex feature, merging to main after the viability gate is passed.
-->

**Type**: Standard feature | Milestone | Feature branch

**Authored by**: Agent (tool / model) | Human | Agent + human
<!--
How was this change produced? Be specific (e.g. "Agent — Claude Code"). If an agent
authored it, the self-review and Definition of Done below are agent-asserted and
warrant independent verification by the reviewer.
-->

## Linked context

- **Spec**: `.agents/specs/<feature-slug>/` <!-- or "no spec required" with a brief reason -->
- **Plan**: `.agents/specs/<feature-slug>/plan.md` <!-- or `.agents/plans/<slug>.md` for cross-cutting work -->
- **ADRs cited**: ADR-NNNN <!-- list any ADRs whose decisions constrain this change -->
- **Issues closed**: <!-- host-specific syntax, e.g. "Closes #NNN" (GitHub/Gitea) or "Closes AB#NNN" (Azure DevOps) -->
- **Milestone**: N of N — <milestone name> <!-- Milestone and Feature branch PRs only -->
- **Target branch**: <!-- for Milestone PRs: the primary feature branch this merges into -->

## Milestone Test-Stop Summary

<!--
MILESTONE PRs ONLY. Delete this section for Standard feature and Feature branch PRs.
Copied or summarized from plan.md's Test-Stop Summary section. Must be complete before
the PR is raised — this is what the reviewer uses to confirm scope. How to exercise the
change lives in **Test case summary** above, not here.
-->

**What was implemented**: <!-- observable behavior added in this milestone; not internal details -->

**Assumptions**: <!-- decisions made where the Plan was silent, or deviations from the original design -->

**What comes next**: <!-- next milestone name, branch, and one-sentence starting point; or "final milestone" -->

## Viability Confirmation

<!--
FEATURE BRANCH PRs ONLY. Delete this section for Standard feature and Milestone PRs.
Confirm that the viability gate defined in plan.md has been passed before merging to main.
-->

- [ ] All milestone branches have been merged to this feature branch.
- [ ] Feature branch builds and all tests pass on CI.
- [ ] All acceptance criteria from `acceptance-criteria.md` have been verified end-to-end, not merely assumed.
- [ ] The release toggle is present, disabled by default, and documented where the project keeps configuration.
- [ ] At least one human reviewer has confirmed the approach is sound and production-safe.
- [ ] `plan.md`, `decisions.md`, and `acceptance-criteria.md` reflect the as-built state of the full feature.

**Approach verification summary**: <!-- Brief statement of how the approach was validated and by whom -->

## Definition of Done

Tick each item or briefly explain why it does not apply. This mirrors the authoritative
lists — "What 'Done' Looks Like at the Code Level" in
`.agents/standards/agent-workflow.md` and the completion checklist in `AGENTS.md`.
Standards named below are indexed in `.agents/standards/README.md`.

**Quality gate**
- [ ] `node .agents/scripts/verify.mjs` was run and is green (the build, test, format, mirror, and analyzer checks that apply to this repo). Summarise the result under *Verification*.

**Build and tests**
- [ ] Builds locally and in CI with **no new warnings** (warnings-as-errors per your stack's standard — see `.agents/standards/README.md`).
- [ ] Tests added or updated for the behaviour introduced or changed (unit, integration, concurrency where applicable — `.agents/standards/testing.md`).
- [ ] No tests were commented out or skipped to make the suite pass.

**Code cleanliness**
- [ ] No `TODO(agent)` markers from this task remain.
- [ ] No debug artifacts (stray prints/logging, hardcoded test data in production paths, commented-out code without explanation).
- [ ] No dead code introduced (unreachable branches, unused members/parameters, needless imports).
- [ ] Formatting applied (post-edit formatter / project formatter).

**Security**
- [ ] New endpoints carry authentication, feature-gate, and permission checks in the correct order.
- [ ] No client-provided state is persisted without server-side reconstruction; system-owned fields (`createdAt`, `createdBy`, generated IDs) are not writable inputs.
- [ ] No secrets, keys, connection strings, or credentials appear in the diff.
- [ ] Each layer enforces what it owns and does not rely on another layer's defences (`.agents/standards/backend.md`).

**Data integrity**
- [ ] Migrations generated by tooling (never hand-written), verified against a local database, and not edited after commit; `up`/`down` paths tested and any backfill documented (`.agents/standards/persistence.md`).
- [ ] Update paths write only the fields the operation owns.

**Feature readiness**
- [ ] If not ready for release, the feature is behind a disabled flag, documented where the project keeps configuration.

**Documentation, specs, and decisions**
- [ ] Conventional Commits used; any breaking change marked with `!` in the subject and a `BREAKING CHANGE:` footer (`.agents/standards/commits.md`).
- [ ] Feature-folder files current: `requirements.md`, `plan.md`, `decisions.md`, `acceptance-criteria.md` reflect the as-built state.
- [ ] ADRs created, updated, or superseded for any architectural decision (`.agents/adrs/`); Mermaid diagrams in nearby READMEs/ADRs still reflect reality.
- [ ] Nearby README(s) updated when subsystems were introduced or restructured.
- [ ] The `.agents/context/` pack updated if the change invalidated it — new build/run/test command, focus shift, new domain term, or structural change (`.agents/standards/documentation.md`).
- [ ] Cross-cutting concerns considered: logging, concurrency, error handling (`.agents/standards/cross-cutting.md`).
- [ ] Acceptance criteria from `acceptance-criteria.md` are demonstrably met; verification evidence included below.
  - For Milestone PRs: only the criteria assigned to this milestone need to be met.

## Verification

<!--
Evidence the PR works, for the reviewer who wants to check the agent's claims: commands
run, test names that should pass, expected outputs, and the quality-gate result. Quote
relevant Given/When/Then criteria from acceptance-criteria.md. End-user test cases belong
in **Test case summary** above, not here.
For Milestone PRs: quote only the criteria assigned to this milestone.
For Feature branch PRs: this can reference the Viability Confirmation above.
-->
