# Files owned by humans

This document lists files that an agent must **not modify without explicit human authorization**. Treat each entry as a tripwire: if a task would touch one of these paths, stop and ask before proceeding.

The rationale is not that these files are untouchable — they all change over time — but that the *change* must be a deliberate human-approved decision rather than a side effect of the agent's normal work. Files in this list govern the agent's behavior, the project's constitutional rules, or irreversible system state; cheap heuristics ("just patch it") are the wrong default here.

## Hard no-go list

The agent must not modify these without an explicit human-issued instruction naming the file or change.

The list has two tiers, distinguished by how the boundary is enforced:

- **Hook-enforced (hard block).** A `PreToolUse` hook (`.claude/hooks/block-owned-paths.js`) blocks any agent `Edit`/`Write` to these paths and best-effort blocks shell writes to them. They cannot be edited by an agent at all — **not even with approval given in chat**. When a change is needed, the agent describes it and proposes the content in its response, and a human makes the edit.
- **Approval-required (pause and ask).** Everything else in this list is editable by an agent, but only after it pauses, names the file and the change, and receives an explicit human "yes." See *Process for changing a no-go file*.

### Hook-enforced paths (agent cannot edit)

- `.humans/**` — guidance authored by and for humans about how to work with this repo and its agents. An agent may **read** these files freely, but may not **write** to them under any circumstance within a session. Propose changes for a human to apply.

### Agent governance

- `AGENTS.md` (repo root) — the project's agent constitution and canonical entry point.
- `CLAUDE.md` (repo root) — generated mirror of `AGENTS.md`. **Never hand-edit**; regenerate with `node .agents/scripts/sync-claude-md.mjs` after changing `AGENTS.md`.
- `.agents/owned-by-humans.md` — this file.
- `.agents/standards/**/*.md` — project-wide rules, at any depth (including stack-specific subfolders). Even small wording changes can shift behavior across all future work.
- `.agents/scripts/*` — governance tooling (the mirror sync and the quality-gate runner). Load-bearing; change via PR, not casually.
- `.claude/settings.json` — Claude Code's hook configuration.
- `.claude/hooks/*` — hook scripts.
- `.codex/**` — Codex configuration.
- `.mcp.json` — MCP server manifest (agent capability dependencies).

### Architectural record

- `.agents/adrs/*.md` with Status `Accepted`. A change to an accepted decision must be made by writing a *new* ADR that supersedes it, not by editing the existing file (per `.agents/adrs/README.md`).

### Irreversible system state

- Database migration files (`**/Migrations/*.cs`, `**/Migrations/*.sql`, or equivalent) **once committed**. Migrations after commit represent run history on real databases; retroactive edits cause schema divergence between environments.
- Lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `packages.lock.json`) **except** as a side effect of adding, updating, or removing a dependency. Never regenerate a lockfile "for tidiness."

### Security and licensing

- `.env*` files and any file matching `*.secret`, `*.key`, `*.pem`.
- `.gitignore` — especially do not remove entries; removed entries can expose secrets.
- `LICENSE`, `LICENCE`, and `NOTICE`.
- `CODEOWNERS`, `.gitea/CODEOWNERS`, `.azuredevops/CODEOWNERS`.

### CI and release

- Workflow definitions: `.gitea/workflows/*`, `.github/workflows/*`, `azure-pipelines.yml`, `.azuredevops/pipelines/*`.
- Branch policies and protected-branch settings (these are usually host-side configuration, not files in the repo, but mentioned here for completeness; see `.humans/agents-and-pull-requests.md` for the host-specific story).
- `CHANGELOG.md` — written by changelog tooling. Hand edits are allowed only when the tooling is not yet wired up.

### Top-level project structure

- The repo-root `README.md`.
- The directory layout itself: do not move directories, rename top-level folders, or restructure the workspace without explicit instruction.
- `solution-identity.md`'s **current** alias and brand name (the `## Current` table). A rename is a business decision (branding, domain, legal), never an agent's to make. Appending a row to the `## Version history` table once a human has confirmed a rename is a normal, agent-editable documentation update — the no-go boundary is deciding or overwriting the current values, not recording a decided one.

## Allowed with conditions

These paths are agent-editable, but with constraints:

- **ADRs with Status `Proposed`** — agents may edit these collaboratively before they are accepted. Once `Accepted`, they fall under the hard no-go rule.
- **Feature folder files** (`.agents/specs/<feature-slug>/*`) — agents author and maintain these as part of feature work. The `.agents/specs/README.md` itself is in the no-go list, since it defines the convention all feature folders follow.
- **Plans under `.agents/plans/`** — agents author and maintain cross-cutting plans as the work proceeds. The `.agents/plans/README.md` is governance and lives in the no-go list.
- **Project-area READMEs** (e.g. `src/<area>/README.md`) — agents update these as part of documentation-as-code (per `.agents/standards/documentation.md`).
- **Source code** under `src/`, tests under `tests/`, application configuration — the agent's primary working surface.

## Process for changing a no-go file

**Hook-enforced paths are different.** For paths in the *Hook-enforced* tier (e.g. `.humans/**`) there is no in-session approval path — the hook blocks the edit regardless of what was said in chat. The agent must describe the change and provide the proposed content in its response; a human then applies it. The numbered steps below govern the *approval-required* tier only.

When a task genuinely requires touching a file in the approval-required no-go list:

1. **Stop before making the change.** State, in plain language, *which file* is being touched and *what change* is proposed. Reference the no-go entry that applies.
2. **Wait for explicit human confirmation.** Do not proceed on implicit assent ("you didn't say no") — require an explicit "yes, change `<file>`."
3. **Make the change as narrowly as possible.** Avoid bundling unrelated edits.
4. **Document the rationale.** In the commit message, and if architecturally significant, in an ADR.

## How the boundary is enforced

Three layers, weakest to strongest:

1. **Instruction (this file + the workflow).** The agent reads this list during the workflow and pauses on a listed path. Advisory — it works only if the agent complies.
2. **Hook (local, edit-time).** `.claude/hooks/block-owned-paths.js` runs as a `PreToolUse` hook and *blocks* `Edit`/`Write` (and best-effort shell writes) to the *Hook-enforced* tier. This is the only layer that makes the boundary bite during a session, regardless of agent compliance. Reused by Codex via `.codex/` (see `.codex/README.md`). The hard-block prefix list lives in that script and is mirrored by the *Hook-enforced paths* section above; keep the two in step.
3. **VCS (merge-time backstop).** The repo-root `CODEOWNERS` file (recognized by Gitea natively; also by GitHub if mirrored) requires approval from named owners on the pull request for changes to listed paths. It only takes effect when the host is configured to require code-owner review (branch protection). Azure DevOps does not honor `CODEOWNERS` natively; configure equivalent branch policies with required reviewers on specific paths. See `.humans/agents-and-pull-requests.md`.

## See also

- `AGENTS.md` (repo root) — the workflow that enforces this list.
- `.agents/adrs/README.md` — ADR lifecycle and the supersede-vs-edit rule.
- `CODEOWNERS` — repo-root file declaring required reviewers per path (Gitea / GitHub).
- `.humans/agents-and-pull-requests.md` — host-side patterns for enforcing review.
