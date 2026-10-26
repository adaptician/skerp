---
title: Tooling
tier: 2
enforced-by: [review, prose-only]
applies-when: >
  Pinning or updating a tool or runtime version.
disposition: >
  mechanise — a CI check comparing declared versions (`.node-version`, `global.json`) against what
  actually ran is a reasonable addition once the toolchain is finalised.
last-reviewed: 2026-09-08
---
# Tooling

Tools and runtimes used by this project must be pinned to specific versions to make builds reproducible across contributors, CI, and agent sessions. Drift in toolchains is one of the most common causes of "works on my machine" failures, and an agent that lands on a different SDK or formatter than the developer expects can produce surprising results.

## What gets pinned

- **.NET SDK** — `global.json` at the repository root.
- **Node.js** — `.node-version`, read by `fnm` (this project's Node version manager), plus `nvm` and Volta.
- **Package manager (npm / pnpm / yarn)** — the `packageManager` field in `package.json`, enforced by [Corepack](https://nodejs.org/api/corepack.html).
- **Other CLI tools** (e.g. `dotnet-format`, `prettier`) — pinned via project-local `package.json` `devDependencies` or a .NET tool manifest, never installed globally.

## .NET SDK

`global.json` at the repo root pins the .NET SDK. Example:

```json
{
  "sdk": {
    "version": "9.0.100",
    "rollForward": "latestFeature"
  }
}
```

`rollForward` values:

| Value | Behavior |
|---|---|
| `disable` | Exact match required; the SDK must be exactly the pinned version. |
| `patch` | Allow patch updates within the pinned feature band (e.g. `9.0.103`). |
| `feature` | Allow newer feature bands within the same major (e.g. `9.0.200`). |
| `latestFeature` | Always use the latest feature band of the pinned major (e.g. `9.0.300` if available). |
| `major` | Allow newer major versions. Avoid — defeats the purpose of pinning. |

For a starter project, `latestFeature` keeps contributors on the newest 9.0.x without re-pinning weekly. For projects where reproducibility matters more than convenience (regulated or long-lived production services), drop down to `patch`.

When bumping the major .NET version, capture the decision in an ADR.

## Node.js

`.node-version` at the repo root pins Node — a plain-text file containing just the version on one line:

```
22
```

`.node-version` is the canonical format for this project because it's what [`fnm`](https://github.com/schniz/fnm) (Fast Node Manager) — the Node version manager contributors and agents use here — reads natively, with no plugin or extra config. `nvm` and Volta also read `.node-version` directly, so the same file covers those toolchains too. `asdf`/`mise`/`proto` users can additionally keep a `.tool-versions` file (`nodejs 22.11.0`) alongside it; treat `.node-version` as the source of truth and `.tool-versions` as a derived convenience for that toolchain, not the reverse. Do not confuse this with `mcp-servers.md` (no relation beyond the similar name) — that file documents expected MCP servers, not pinned tool versions; see `.agents/standards/repository-structure.md`.

The .NET SDK is pinned via `global.json` rather than `.node-version`. `global.json` is what the .NET CLI itself honors at runtime, so it is authoritative.

### Setting up fnm

Install from the [fnm README](https://github.com/schniz/fnm#installation) (per-OS instructions) and wire the one-time shell integration so `cd`-ing into a directory with a `.node-version` auto-switches:

- bash / zsh: add the `fnm env --use-on-cd` line from the README to `.bashrc` / `.zshrc`.
- PowerShell: add the equivalent line to the PowerShell profile.
- fish: add the fish variant to `config.fish`.

Without that shell-integration step, `fnm` is installed but nothing triggers the switch automatically — `cd`-ing into the repo still resolves to whatever Node the shell already had.

### Troubleshooting

- **"no compatible Node.js version installed" / fnm can't find the pinned version** — the version in `.node-version` was never installed under fnm. Run `fnm install` from the repo root (it reads `.node-version` automatically), or `fnm use --install-if-missing`.
- **Wrong/system Node resolves instead of the pinned one** — usually the shell-integration hook (above) isn't wired into the active profile, so `cd` never triggers the switch. Check with `fnm current` against the contents of `.node-version`.
- **Agent/non-interactive shells fail on a bare `node`/`npm` call** (command not found, or the wrong version runs) — non-interactive shells often don't source the profile that carries the `fnm env --use-on-cd` hook, so no version is selected at all. Set a default once so the shim resolves even without the hook: `fnm default <version>` (matching `.node-version`). If an agent hits this, it should prompt the user to run that command rather than silently falling back to whatever `node` happens to resolve to on `PATH`.

## Package manager

Pin the package manager via the `packageManager` field in `package.json`:

```json
{
  "packageManager": "npm@10.2.0"
}
```

[Corepack](https://nodejs.org/api/corepack.html) (built into Node.js 16.10+) reads this field and ensures contributors are using the pinned version. Enable it once globally on each contributor's machine:

```sh
corepack enable
```

After that, running `npm`, `pnpm`, or `yarn` in the project uses the version declared in `packageManager` regardless of what is installed globally — the strongest available guarantee against "wrong lockfile format" failures.

For Angular projects, npm is the conventional choice. Switch to pnpm only when there is a real reason (large monorepo, dependency disk-usage pressure) and capture the decision in an ADR.

## Lockfile policy

- **Always commit lockfiles.** `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (yarn). For NuGet, `packages.lock.json` when `RestorePackagesWithLockFile` is enabled.
- **Never delete a lockfile to "fix" an install error.** A failing install is usually a real conflict — investigate the conflict; do not erase the evidence of what should be installed.
- **CI restores in locked mode.** Use `npm ci` (not `npm install`) and `dotnet restore --locked-mode` so a drifted lockfile fails the build instead of being silently rewritten.
- **Lockfile bumps go through review.** When a dependency is added or updated, the lockfile change is part of the PR. Reviewers should glance at the lockfile diff for unexpected transitive changes — especially when the diff is large relative to the `package.json` change.

To enable NuGet lockfiles, set this in `Directory.Build.props` or per-project:

```xml
<PropertyGroup>
  <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
</PropertyGroup>
```

## Engines (belt and suspenders)

In addition to `.node-version`, declare `engines` in `package.json` so `npm` itself warns when run on the wrong Node:

```json
{
  "engines": {
    "node": ">=22.11.0 <23.0.0",
    "npm": ">=10.0.0"
  }
}
```

Set `engine-strict=true` in `.npmrc` if the warning should be a hard failure instead.

## Other CLI tools

Project-local CLI tools (formatters, linters, test runners) should be pinned via the project's own package manager rather than globally:

- **Node-based tools** (`prettier`, `eslint`, `commitlint`) live in `package.json` `devDependencies` and run via `npx` or the package manager.
- **.NET tools** (`dotnet-format`, `dotnet-ef`) live in a [tool manifest](https://learn.microsoft.com/en-us/dotnet/core/tools/global-tools#install-a-local-tool) at `.config/dotnet-tools.json` and run via `dotnet tool restore` then `dotnet <tool>`.

Globally-installed tools should be considered as risky as un-pinned dependencies — they vary across machines and CI runners and are a common source of inconsistent behavior. The agent hooks at `.claude/hooks/post-edit-format.js` rely on `dotnet format` and `prettier` being available *within the project's environment* — not globally.

## When to bump versions

Version bumps are intentional, not accidental. The flow:

1. Decide the bump is needed (security patch, new language feature, dependency requirement).
2. Update the pinning file (`global.json`, `.node-version`, `packageManager`, `engines`).
3. Run a full local build and test pass.
4. Commit with a `build:` or `chore:` Conventional Commits message describing the bump (see `.agents/standards/commits.md`).
5. If the bump crosses a major version, or has known compatibility implications, write an ADR.

Do not casually bump pins to "get on the latest" — every bump is an opportunity for drift between contributors who upgraded and those who haven't.
