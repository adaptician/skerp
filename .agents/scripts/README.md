# Repo-level agent scripts

Small, dependency-free Node scripts (standard library only) that keep
cross-tool agent configuration consistent. Run them with the project's pinned
Node (see `.node-version`).

## `sync-claude-md.mjs`

Mirrors the canonical root `AGENTS.md` into a root `CLAUDE.md`.

Codex and most agents read `AGENTS.md`; Claude Code reads `CLAUDE.md`. Rather
than maintain two documents, `AGENTS.md` is canonical and `CLAUDE.md` is a
generated copy carrying a `MIRROR — do not edit here` banner — the same pattern
[`.agents/skills/sync-to-claude.mjs`](../skills/sync-to-claude.mjs) uses for
skills.

```bash
node .agents/scripts/sync-claude-md.mjs           # write/refresh CLAUDE.md
node .agents/scripts/sync-claude-md.mjs --check    # verify only; exit 1 if stale/missing
```

**When to run it.** After editing the root `AGENTS.md`. Never hand-edit
`CLAUDE.md` — edit `AGENTS.md` and re-run. The `--check` mode is intended for the
pre-commit / CI quality gate so a stale mirror fails the build before it lands.

> An alternative to a full mirror is a one-line `CLAUDE.md` that imports the
> canonical file (`@AGENTS.md`, which Claude Code supports). A generated full
> copy was chosen here for consistency with the skills mirror and to stay robust
> if a tool does not support the import syntax.

## `verify.mjs`

The project's single quality-gate entry point — the executable form of the
"Verify before you hand off" rule in [`AGENTS.md`](../../AGENTS.md).

```bash
node .agents/scripts/verify.mjs           # run the gate; exit 1 on any failure
node .agents/scripts/verify.mjs --list     # show checks + applicability; run nothing
```

Each check declares whether it **applies** to the current repository (this is a
scaffold dropped into real projects, so the .NET / Angular checks only activate
once those projects exist) and which **tool** it needs. The gate runs every
applicable check whose tool is present, **skips loudly** anything that does not
apply or whose tool is missing — a skip is printed and counted, never a silent
pass — and **fails** if any applicable check fails.

Add a check by appending to the `CHECKS` array in `verify.mjs`. Keep checks fast
and deterministic; heavy or flaky checks belong in CI stages, not the local gate.

## `check-screen-index.mjs`

Offline checks of the Figma screen index
([`figma-screen-index.json`](../standards/solution/figma-screen-index.json), format in
[`solution/figma.md`](../standards/solution/figma.md)). Both run from `verify.mjs`; neither needs Figma
access — the live half is the [`design-fidelity-check`](../skills/design-fidelity-check/SKILL.md) skill.

```bash
node .agents/scripts/check-screen-index.mjs structure             # index well-formed
node .agents/scripts/check-screen-index.mjs citations [--base <ref>]  # changed specs cite only indexed nodes
node --test .agents/scripts/check-screen-index.test.mjs          # fixtures, plus fingerprint.js sensitivity
```

- **`structure`** — valid JSON with no duplicate keys; four-segment keys (the first segment one of the index's
  declared `themes`, the last one of its `breakpoints`, each checked only when declared); unique `<int>:<int>` nodes; each name slugs to its key; `approved` is `null` or
  `{by, on, fingerprint}`; unknown fields fail.
- **`citations`** — only `spec.md` files added or changed against the merge base (plus uncommitted and
  untracked ones) are scanned, so existing specs are never retro-failed. Backticked `` `key` (`node`) `` pairs
  and bare backticked nodes must resolve; URLs with `node-id=` are exempt; `report.md` is never scanned. The
  merge base is taken against the first of `<remote>/HEAD`, `<remote>/master`, `<remote>/main`, `master`,
  `main`; with none it fails rather than passing. `verify.mjs` skips it, loudly, while the index has no
  screens.

## See also

- [`.agents/skills/README.md`](../skills/README.md) — the skills mirror and the rationale for generated copies over symlinks.
- [`AGENTS.md`](../../AGENTS.md) — the canonical agent entry point these scripts support.
