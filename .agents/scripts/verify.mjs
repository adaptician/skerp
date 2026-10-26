#!/usr/bin/env node
// verify.mjs
// ---------------------------------------------------------------------------
// Single entry point for the project's quality gate. Agents run this before
// handing off work (the Stop hook runs it with --fast); CI runs it on every change. It is the executable form of
// the "Verify before you hand off" rule in AGENTS.md — a rule that matters is
// checked by something that runs, not left to the reviewer.
//
// Each check declares whether it APPLIES to the current repository (this is a
// scaffold that gets dropped into real projects, so .NET / Angular checks only
// run once those projects exist) and which tool it NEEDS. The gate:
//   - runs every applicable check whose tool is present;
//   - SKIPS, loudly, any check that does not apply or whose tool is missing
//     (skips never silently pass — they are printed and counted);
//   - FAILS (exit 1) if any applicable check fails.
//
// Usage:
//   node .agents/scripts/verify.mjs           # run the gate
//   node .agents/scripts/verify.mjs --list      # show checks + applicability, run nothing
//   node .agents/scripts/verify.mjs --fast      # quick gates only (skip build/test/lint)
//   node .agents/scripts/verify.mjs --help
//
// Extending: add an entry to CHECKS below. Keep checks fast and deterministic;
// heavy or flaky checks belong in CI stages, not the local gate.
// ---------------------------------------------------------------------------

import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", ".."); // .agents/scripts -> repo root

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log(
    [
      "Run the project quality gate.",
      "",
      "  (no args)  run every applicable check; exit 1 on any failure",
      "  --list     list checks and whether each applies; run nothing",
      "  --fast     skip slow checks (build/test/lint); run only quick gates",
      "  --help     show this message",
    ].join("\n"),
  );
  process.exit(0);
}
const LIST_ONLY = args.has("--list");
const FAST = args.has("--fast");

// --- helpers ---------------------------------------------------------------

const IGNORE_DIRS = new Set([
  "node_modules",
  "bin",
  "obj",
  ".git",
  "dist",
  ".angular",
]);

async function exists(rel) {
  try {
    await fs.access(path.join(REPO_ROOT, rel));
    return true;
  } catch {
    return false;
  }
}

/** True if any file matching `predicate(name)` exists anywhere below the repo root. */
async function findFile(predicate, dir = REPO_ROOT, depth = 0) {
  if (depth > 8) return false;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name) || e.name.startsWith(".") && e.name !== ".") continue;
      if (await findFile(predicate, path.join(dir, e.name), depth + 1)) return true;
    } else if (predicate(e.name)) {
      return true;
    }
  }
  return false;
}

const hasDotnetProject = () =>
  findFile((n) => n.endsWith(".sln") || n.endsWith(".csproj"));

// Directories holding a frontend's package.json, relative to the repo root. Each one gets its own
// lint, test and format checks. "." is a single frontend at the root; a solution with several lists
// each one (for example ["web", "admin"]).
const FRONTEND_DIRS = ["client"];

async function packageJsonScripts(dir) {
  try {
    const raw = await fs.readFile(path.join(REPO_ROOT, dir, "package.json"), "utf8");
    return JSON.parse(raw).scripts ?? {};
  } catch {
    return null;
  }
}
const hasNpmScript = async (dir, name) => {
  const scripts = await packageJsonScripts(dir);
  return scripts !== null && typeof scripts[name] === "string";
};

/** Is a command available on PATH? */
function commandExists(cmd) {
  const r = spawnSync(cmd, ["--version"], { shell: true, stdio: "ignore" });
  return !r.error;
}

/** Full git history available (a git work tree that is not a shallow clone)? The ADR-history check needs it. */
function hasFullGitHistory() {
  const inside = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: REPO_ROOT, encoding: "utf8" });
  if (inside.error || inside.status !== 0) return false;
  const shallow = spawnSync("git", ["rev-parse", "--is-shallow-repository"], { cwd: REPO_ROOT, encoding: "utf8" });
  return shallow.stdout.trim() !== "true";
}

const CONTEXT_HEALTH = ".agents/scripts/check-context-health.mjs";
const SCREEN_INDEX_CHECK = ".agents/scripts/check-screen-index.mjs";
const SCREEN_INDEX = ".agents/standards/solution/figma-screen-index.json";

/** Does the screen index list at least one screen? Until it does, spec citations have nothing to resolve against. */
async function screenIndexHasScreens() {
  try {
    const index = JSON.parse(await fs.readFile(path.join(REPO_ROOT, SCREEN_INDEX), "utf8"));
    return Object.values(index.files ?? {}).some((f) => Object.keys(f.screens ?? {}).length > 0);
  } catch {
    return false; // unreadable: the structure check reports it
  }
}

// --- check registry --------------------------------------------------------
// id:      stable identifier
// title:   human-readable label
// applies: () => boolean | Promise<boolean>  — is this check relevant here?
// needs:   optional tool that must be on PATH (else the check is skipped)
// skipReason: optional text printed when applies() is false (default "not applicable")
// cmd:     shell command, run from the repo root

const CHECKS = [
  {
    id: "mirror-skills",
    title: "Skills mirror in sync (.claude/skills)",
    applies: () => exists(".agents/skills/sync-to-claude.mjs"),
    cmd: "node .agents/skills/sync-to-claude.mjs --check",
  },
  {
    id: "mirror-claude-md",
    title: "CLAUDE.md mirror in sync with AGENTS.md",
    applies: () => exists(".agents/scripts/sync-claude-md.mjs"),
    cmd: "node .agents/scripts/sync-claude-md.mjs --check",
  },
  {
    id: "adr-index",
    title: "ADR index in sync and valid (evidence tiers, Provisional status)",
    applies: () => exists(".agents/scripts/generate-adr-index.mjs"),
    cmd: "node .agents/scripts/generate-adr-index.mjs --check",
  },
  {
    id: "standards-index",
    title: "Standards index in sync and valid (tier/enforced-by/disposition frontmatter)",
    applies: () => exists(".agents/scripts/generate-standards-index.mjs"),
    cmd: "node .agents/scripts/generate-standards-index.mjs --check",
  },
  {
    id: "ledgers",
    title: "Run log / assumption ledger entries valid (no committed index)",
    applies: () => exists(".agents/scripts/ledgers.mjs"),
    cmd: "node .agents/scripts/ledgers.mjs --check",
  },
  {
    id: "context-links",
    title: "Guidance links resolve (context pack, standards, active specs)",
    applies: () => exists(CONTEXT_HEALTH),
    cmd: `node ${CONTEXT_HEALTH} links`,
  },
  {
    id: "adr-history",
    title: "ADRs never deleted, numbers never reused (git history; skipped without full history)",
    applies: async () => (await exists(CONTEXT_HEALTH)) && hasFullGitHistory(),
    cmd: `node ${CONTEXT_HEALTH} adr-history`,
  },
  {
    id: "focus-budget",
    title: "current-focus.md within its 150-line budget",
    applies: async () => (await exists(CONTEXT_HEALTH)) && (await exists(".agents/context/current-focus.md")),
    cmd: `node ${CONTEXT_HEALTH} focus-budget`,
  },
  {
    id: "screen-index",
    title: "Figma screen index well-formed (keys, nodes, names, approvals)",
    applies: async () => (await exists(SCREEN_INDEX_CHECK)) && (await exists(SCREEN_INDEX)),
    cmd: `node ${SCREEN_INDEX_CHECK} structure`,
  },
  {
    id: "screen-index-citations",
    title: "Changed specs cite only indexed Figma nodes",
    skipReason: "the screen index has no screens yet — nothing to resolve citations against",
    applies: async () => (await exists(SCREEN_INDEX_CHECK)) && (await screenIndexHasScreens()),
    cmd: `node ${SCREEN_INDEX_CHECK} citations`,
  },
  {
    id: "backend-build",
    title: "Backend build (dotnet build)",
    applies: hasDotnetProject,
    needs: "dotnet",
    cmd: "dotnet build --nologo",
    slow: true,
  },
  {
    id: "backend-format",
    title: "Backend format check (dotnet format --verify-no-changes)",
    applies: hasDotnetProject,
    needs: "dotnet",
    cmd: "dotnet format --verify-no-changes",
    slow: true,
  },
  {
    id: "backend-test",
    title: "Backend tests (dotnet test)",
    applies: hasDotnetProject,
    needs: "dotnet",
    cmd: "dotnet test --nologo",
    slow: true,
  },
  ...FRONTEND_DIRS.flatMap((dir) => [
    {
      id: `frontend-lint:${dir}`,
      title: `Frontend lint (npm --prefix ${dir} run lint)`,
      skipReason: `${dir}/package.json has no "lint" script`,
      applies: () => hasNpmScript(dir, "lint"),
      needs: "npm",
      cmd: `npm --prefix ${dir} run lint`,
      slow: true,
    },
    {
      id: `frontend-test:${dir}`,
      title: `Frontend tests (npm --prefix ${dir} test)`,
      skipReason: `${dir}/package.json has no "test" script`,
      applies: () => hasNpmScript(dir, "test"),
      needs: "npm",
      cmd: `npm --prefix ${dir} test`,
      slow: true,
    },
    {
      id: `frontend-format:${dir}`,
      title: `Frontend format check (npm --prefix ${dir} run format:check)`,
      skipReason: `${dir}/package.json has no "format:check" script`,
      applies: () => hasNpmScript(dir, "format:check"),
      needs: "npm",
      cmd: `npm --prefix ${dir} run format:check`,
      slow: true,
    },
  ]),
];

// --- runner ----------------------------------------------------------------

const TAG = { pass: "[PASS]", fail: "[FAIL]", skip: "[SKIP]" };

async function main() {
  console.log(`Quality gate — ${path.basename(REPO_ROOT)}\n`);

  const results = [];

  for (const check of CHECKS) {
    if (FAST && check.slow) {
      results.push({ check, status: "skip", reason: "slow check — skipped in --fast mode" });
      continue;
    }
    const applies = await check.applies();
    if (!applies) {
      results.push({ check, status: "skip", reason: check.skipReason ?? "not applicable to this repository" });
      continue;
    }
    if (check.needs && !commandExists(check.needs)) {
      results.push({ check, status: "skip", reason: `'${check.needs}' not found on PATH` });
      continue;
    }
    if (LIST_ONLY) {
      results.push({ check, status: "applies" });
      continue;
    }

    const r = spawnSync(check.cmd, {
      cwd: REPO_ROOT,
      shell: true,
      encoding: "utf8",
    });
    const ok = r.status === 0;
    results.push({
      check,
      status: ok ? "pass" : "fail",
      output: ok ? "" : ((r.stdout || "") + (r.stderr || "")).trim(),
    });
  }

  if (LIST_ONLY) {
    for (const res of results) {
      const mark = res.status === "applies" ? "[ will run ]" : "[ skipped  ]";
      const why = res.reason ? ` — ${res.reason}` : "";
      console.log(`${mark} ${res.check.title}${why}`);
    }
    return;
  }

  for (const res of results) {
    const why = res.reason ? ` (${res.reason})` : "";
    console.log(`${TAG[res.status]} ${res.check.title}${why}`);
    if (res.status === "fail" && res.output) {
      console.log(res.output.replace(/^/gm, "    "));
      console.log("");
    }
  }

  const passed = results.filter((r) => r.status === "pass").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const failed = results.filter((r) => r.status === "fail").length;

  console.log(`\n${passed} passed, ${skipped} skipped, ${failed} failed.`);
  if (skipped) {
    console.log(
      "Note: skipped checks did not run — they are not a pass. They become active " +
        "once the relevant project or tooling is present.",
    );
  }
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
