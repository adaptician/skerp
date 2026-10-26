#!/usr/bin/env node
// check-context-health.mjs
// ---------------------------------------------------------------------------
// Three fast, deterministic checks that keep the guidance every session reads
// from rotting. Run by verify.mjs; also runnable on its own.
//
//   links         Every relative Markdown link in .agents/context/**,
//                 .agents/standards/** and the active planning docs under
//                 .agents/specs/** (everything except report.md) resolves to an
//                 existing file or directory. Anchors are stripped, not checked.
//                 Fenced code, inline code, URLs and #-only links are ignored.
//                 .agents/run-log/** is exempt: it records the state at the time.
//
//   adr-history   ADRs are never deleted and their numbers never reused. Reads
//                 git history reachable from HEAD: fails when an ADR filename
//                 that was ever added is now missing, or when one number has been
//                 held by more than one filename. The only allowance is the
//                 "Retired ADRs" table in .agents/adrs/README.md, which records
//                 deletions that predate the rule. Skips (exit 0, says so) in a
//                 shallow clone or outside git, where history is unavailable.
//
//   focus-budget  .agents/context/current-focus.md is at most 150 lines.
//
// Usage:
//   node .agents/scripts/check-context-health.mjs <links|adr-history|focus-budget> [--root <dir>]
//
// Exit 0 = pass (or skipped, stated on stdout); exit 1 = violations, one per line.
// ---------------------------------------------------------------------------

import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, "..", ".."); // .agents/scripts -> repo root

export const FOCUS_FILE = ".agents/context/current-focus.md";
export const FOCUS_BUDGET = 150;
const ADR_DIR = ".agents/adrs";
const ADR_README = `${ADR_DIR}/README.md`;
const ADR_NAME = /^(\d{4})-.+\.md$/;

const posix = (p) => p.split(path.sep).join("/");

// --- links -----------------------------------------------------------------

async function walkMarkdown(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      await walkMarkdown(full, out);
    } else if (e.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/** Blank out fenced code (keeping line count) and inline code spans, so their contents are never treated as links. */
function stripCode(text) {
  const lines = text.split(/\r?\n/);
  let fence = null;
  return lines.map((line) => {
    const m = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      return "";
    }
    if (m) {
      fence = m[1];
      return "";
    }
    return line.replace(/`[^`]*`/g, "");
  });
}

const INLINE_LINK = /\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+"[^"]*")?\s*\)/g;
const REF_LINK = /^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/;

function linkTargets(line) {
  const found = [];
  for (const m of line.matchAll(INLINE_LINK)) found.push(m[1] ?? m[2]);
  const r = line.match(REF_LINK);
  if (r) found.push(r[1] ?? r[2]);
  return found;
}

/** Returns the resolved path to test, or null if this target is not a checkable relative link. */
function resolveTarget(target, fromFile, root) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//") || target.startsWith("#")) return null;
  let t = target.split("#")[0].split("?")[0];
  if (!t) return null;
  try {
    t = decodeURIComponent(t);
  } catch {
    /* leave undecoded */
  }
  return t.startsWith("/") ? path.join(root, t) : path.resolve(path.dirname(fromFile), t);
}

export async function checkLinks(root = DEFAULT_ROOT) {
  const files = [
    ...(await walkMarkdown(path.join(root, ".agents/context"))),
    ...(await walkMarkdown(path.join(root, ".agents/standards"))),
    ...(await walkMarkdown(path.join(root, ".agents/specs"))).filter((f) => path.basename(f) !== "report.md"),
  ];
  const violations = [];
  for (const file of files) {
    const lines = stripCode(await fs.readFile(file, "utf8"));
    lines.forEach((line, i) => {
      for (const target of linkTargets(line)) {
        const resolved = resolveTarget(target, file, root);
        if (resolved && !existsSync(resolved)) {
          violations.push(`${posix(path.relative(root, file))}:${i + 1}: broken link "${target}" (no such file: ${posix(path.relative(root, resolved))})`);
        }
      }
    });
  }
  return { violations, checked: files.length };
}

// --- adr-history -----------------------------------------------------------

function git(root, args) {
  return spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/** Why history cannot be trusted here, or null when it can. */
export function historyUnavailable(root = DEFAULT_ROOT) {
  const inside = git(root, ["rev-parse", "--is-inside-work-tree"]);
  if (inside.error || inside.status !== 0) return "not a git work tree, or git is not on PATH";
  const shallow = git(root, ["rev-parse", "--is-shallow-repository"]);
  if (shallow.stdout.trim() === "true") return "shallow clone — full history is needed (fetch with depth 0)";
  return null;
}

/** Filenames listed in the first column of the README's Retired ADRs table. */
async function retiredAdrs(root) {
  let text;
  try {
    text = await fs.readFile(path.join(root, ADR_README), "utf8");
  } catch {
    return new Set();
  }
  const names = new Set();
  for (const m of text.matchAll(/^\|\s*`(\d{4}-[^`|]+\.md)`\s*\|/gm)) names.add(m[1]);
  return names;
}

export async function checkAdrHistory(root = DEFAULT_ROOT) {
  const skipped = historyUnavailable(root);
  if (skipped) return { skipped, violations: [] };

  const log = git(root, ["log", "HEAD", "--no-renames", "--diff-filter=A", "--name-only", "--format=", "--", ADR_DIR]);
  if (log.status !== 0) return { skipped: `git log failed: ${log.stderr.trim()}`, violations: [] };

  const everAdded = new Set();
  for (const line of log.stdout.split(/\r?\n/)) {
    const m = line.trim().match(/^\.agents\/adrs\/([^/]+\.md)$/);
    if (m && ADR_NAME.test(m[1])) everAdded.add(m[1]);
  }
  let present = [];
  try {
    present = (await fs.readdir(path.join(root, ADR_DIR))).filter((n) => ADR_NAME.test(n));
  } catch {
    /* no ADR directory: every historical ADR is then missing */
  }
  const retired = await retiredAdrs(root);
  const violations = [];

  for (const name of [...everAdded].sort()) {
    if (!present.includes(name) && !retired.has(name)) {
      violations.push(`${ADR_DIR}/${name}: ADR ${name.slice(0, 4)} was added in git history but is missing — ADRs are never deleted; restore it and mark it Superseded or Deprecated`);
    }
  }
  const holders = new Map();
  for (const name of new Set([...everAdded, ...present])) {
    if (retired.has(name)) continue;
    const n = name.slice(0, 4);
    holders.set(n, [...(holders.get(n) ?? []), name]);
  }
  for (const [n, names] of [...holders].sort()) {
    if (names.length > 1) {
      violations.push(`${ADR_DIR}: ADR number ${n} has been held by more than one filename (${names.sort().join(", ")}) — numbers are never reused`);
    }
  }
  return { violations, checked: everAdded.size };
}

// --- focus-budget ----------------------------------------------------------

export async function checkFocusBudget(root = DEFAULT_ROOT) {
  let text;
  try {
    text = await fs.readFile(path.join(root, FOCUS_FILE), "utf8");
  } catch {
    return { skipped: `${FOCUS_FILE} does not exist`, violations: [] };
  }
  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  const violations =
    lines.length > FOCUS_BUDGET
      ? [`${FOCUS_FILE}: ${lines.length} lines exceeds the ${FOCUS_BUDGET}-line budget — move finished work to its run-log entry or spec and link it`]
      : [];
  return { violations, checked: lines.length };
}

// --- cli -------------------------------------------------------------------

const MODES = { links: checkLinks, "adr-history": checkAdrHistory, "focus-budget": checkFocusBudget };

async function main() {
  const argv = process.argv.slice(2);
  const mode = argv[0];
  const rootIdx = argv.indexOf("--root");
  const root = rootIdx >= 0 ? path.resolve(argv[rootIdx + 1]) : DEFAULT_ROOT;
  if (!MODES[mode]) {
    console.error(`Usage: node check-context-health.mjs <${Object.keys(MODES).join("|")}> [--root <dir>]`);
    process.exit(2);
  }
  const result = await MODES[mode](root);
  if (result.skipped) {
    console.log(`SKIP ${mode}: ${result.skipped}`);
    return;
  }
  if (result.violations.length) {
    for (const v of result.violations) console.log(v);
    process.exit(1);
  }
  console.log(`OK ${mode} (${result.checked} checked)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
