# Agent hooks

This directory holds the hook scripts referenced from `.claude/settings.json`. Hooks run automatically at specific points in Claude Code's tool-use lifecycle and can inspect, allow, or block tool invocations.

The same scripts are reused by Codex via `.codex/` — see `.codex/README.md` for the Codex-side wiring.

## Hook events

Claude Code supports several hook events. The ones in use for this project:

- **PreToolUse** — runs *before* a tool is invoked. Receives the tool input as JSON on stdin. Exit non-zero (with a message on stderr) to block the tool. Used to guard against destructive operations.
- **PostToolUse** — runs *after* a tool completes. Receives the tool input and result on stdin. Cannot block, only react. Used for side effects such as running a formatter.
- **Stop** — runs when the main agent is about to finish its turn; exit 2 blocks completion (the agent keeps working and sees stderr), exit 0 allows it. Used to run the fast quality gate before hand-off.

Other events available but not currently used: `Stop`, `SubagentStop`, `Notification`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`, `PreCompact`. See Claude Code's hook documentation for current details.

## Active hooks

| Event | Matcher | Script | Purpose |
|---|---|---|---|
| PreToolUse | `Bash` | `block-destructive-git.js` | Blocks `git push --force`, `git reset --hard`, `git clean -fdx`, `rm -rf .git`, `rm -rf /`. |
| PostToolUse | `Edit\|Write` | `post-edit-format.js` | Runs `dotnet format` on `.cs` files and `prettier --write` on `.ts`, `.html`, `.scss`, `.css`, `.json` files. Advisory only — formatter failures do not block the workflow. |
| PreToolUse | `Edit\|Write\|MultiEdit\|NotebookEdit`, `Bash` | `block-owned-paths.js` | Hard-blocks edits/writes to hook-enforced human-owned paths (`.humans/**`). Reads are allowed. |
| Stop | (none) | `verify-on-stop.js` | Runs `verify.mjs --fast` when the agent tries to finish; blocks completion (exit 2) if a quick gate fails. Honours `stop_hook_active` to avoid loops. |

## Hook input format

Hooks receive a JSON payload on stdin. Relevant fields used by these scripts:

- `tool_name` — the tool being invoked (e.g. `Bash`, `Edit`, `Write`).
- `tool_input` — the tool's input arguments. For `Bash` this includes `command`; for `Edit`/`Write` it includes `file_path` and content fields.
- `tool_response` — present on `PostToolUse`; the tool's output if available.

The full schema is documented in Claude Code's hook reference; consult the current docs when extending these hooks.

## Cross-platform notes

The scripts are written in Node (using only the standard library) so they run identically on Windows, macOS, and Linux without separate `.sh` / `.cmd` versions. Node is assumed to be on `PATH` because the project's frontend toolchain (Angular) already requires it.

## Adding a hook

1. Write the script under `.claude/hooks/` as a Node file. Read JSON from stdin; exit 0 to allow, 2 to block (PreToolUse only).
2. Reference it from `.claude/settings.json` under the appropriate event and matcher.
3. Test it by invoking the matched tool and verifying the hook ran.
4. Update the *Active hooks* table above.
5. If the hook should also run under Codex, no script change is needed — Codex references the same `.claude/hooks/` scripts. Update the Codex config (`.codex/`) to invoke it.

## Conventions

- Prefer **conservative** hooks. When in doubt about whether to block, allow and log. False positives that block legitimate work are worse than missed cases.
- Hooks must complete quickly. A budget of one second of overhead per tool use is reasonable; longer-running side effects belong in CI, not hooks.
- Hooks must not modify a file while a tool is mid-write. `PostToolUse` formatters are safe; pre-write modifications are not.
- Never put secrets in hook scripts. Read them from environment variables.
- Treat hook scripts as load-bearing — change them via PR, not casually.

## Hook-enforced human-owned paths

`block-owned-paths.js` blocks any `Edit`/`Write` to paths in the *Hook-enforced*
tier of `.agents/owned-by-humans.md` (currently `.humans/**`), and best-effort
blocks shell writes to them. Reads are always allowed. There is no in-session
override by design: when a change is needed, the agent proposes the content and a
human applies it. The blocked-prefix list lives in the script (`BLOCKED_PREFIXES`)
and must stay in step with `.agents/owned-by-humans.md`.
