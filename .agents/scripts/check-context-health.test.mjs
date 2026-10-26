// Tests for check-context-health.mjs. Run: node --test .agents/scripts/check-context-health.test.mjs
// Each check is exercised against a throwaway fixture tree (and, for adr-history, a throwaway git repo)
// so every failure mode is constructed rather than assumed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkLinks, checkAdrHistory, checkFocusBudget, FOCUS_FILE } from "./check-context-health.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "check-context-health.mjs");

function fixture(files = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "ctx-health-"));
  for (const [rel, content] of Object.entries(files)) write(root, rel, content);
  return root;
}
function write(root, rel, content) {
  const full = path.join(root, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}
const gitEnv = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
function git(root, ...args) {
  return execFileSync("git", ["-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], { cwd: root, env: gitEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
function commitAll(root, msg) {
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", msg);
}
function gitRepo(files) {
  const root = fixture(files);
  git(root, "init", "-q");
  commitAll(root, "init");
  return root;
}

// --- links -----------------------------------------------------------------

test("links: resolving relative links, anchors, URLs, code and reference links all pass", async () => {
  const root = fixture({
    ".agents/context/a.md": [
      "[b](b.md) [b anchor](b.md#section) [dir](../standards/) [web](https://example.com/x.md)",
      "[top](#top) `[in code](nope.md)`",
      "```",
      "[fenced](also-nope.md)",
      "```",
      "[ref]: b.md",
    ].join("\n"),
    ".agents/context/b.md": "# b",
    ".agents/standards/s.md": "[a](../context/a.md)",
  });
  const r = await checkLinks(root);
  assert.deepEqual(r.violations, []);
  rmSync(root, { recursive: true });
});

test("links: a broken link in context, standards and an active spec each fail, naming file, line and link", async () => {
  const root = fixture({
    ".agents/context/a.md": "ok\n[gone](missing-context.md)",
    ".agents/standards/s.md": "[gone](../adrs/0005-deleted.md)",
    ".agents/specs/epics/e/features/f/work/w/spec.md": "text\n\n[gone](../../../../../../../adrs/0003-x.md)",
  });
  const r = await checkLinks(root);
  assert.equal(r.violations.length, 3);
  assert.match(r.violations.join("\n"), /context\/a\.md:2: broken link "missing-context\.md"/);
  assert.match(r.violations.join("\n"), /standards\/s\.md:1: broken link "\.\.\/adrs\/0005-deleted\.md"/);
  assert.match(r.violations.join("\n"), /spec\.md:3: broken link/);
  rmSync(root, { recursive: true });
});

test("links: run-log and report.md are exempt", async () => {
  const root = fixture({
    ".agents/run-log/old.md": "[gone](missing.md)",
    ".agents/specs/epics/e/features/f/work/w/report.md": "[gone](missing.md)",
  });
  assert.deepEqual((await checkLinks(root)).violations, []);
  rmSync(root, { recursive: true });
});

// --- focus-budget ----------------------------------------------------------

test("focus-budget: 150 lines pass, 151 fail, absent file skips", async () => {
  const at = (n) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n") + "\n";
  const ok = fixture({ [FOCUS_FILE]: at(150) });
  assert.deepEqual((await checkFocusBudget(ok)).violations, []);
  const over = fixture({ [FOCUS_FILE]: at(151) });
  const r = await checkFocusBudget(over);
  assert.equal(r.violations.length, 1);
  assert.match(r.violations[0], /151 lines exceeds the 150-line budget/);
  const none = fixture();
  assert.ok((await checkFocusBudget(none)).skipped);
  for (const d of [ok, over, none]) rmSync(d, { recursive: true });
});

// --- adr-history -----------------------------------------------------------

const README_RETIRED = (names) =>
  ["# ADRs", "", "| Filename | Status |", "|---|---|", ...names.map((n) => `| \`${n}\` | Superseded |`)].join("\n");

test("adr-history: intact history passes", async () => {
  const root = gitRepo({ ".agents/adrs/0001-a.md": "a", ".agents/adrs/0002-b.md": "b", ".agents/adrs/README.md": README_RETIRED([]) });
  const r = await checkAdrHistory(root);
  assert.deepEqual(r.violations, []);
  rmSync(root, { recursive: true, force: true });
});

test("adr-history: a deleted ADR fails, naming the file and its number", async () => {
  const root = gitRepo({ ".agents/adrs/0001-a.md": "a", ".agents/adrs/0002-b.md": "b", ".agents/adrs/README.md": README_RETIRED([]) });
  rmSync(path.join(root, ".agents/adrs/0002-b.md"));
  commitAll(root, "delete");
  const r = await checkAdrHistory(root);
  assert.equal(r.violations.length, 1);
  assert.match(r.violations[0], /0002-b\.md: ADR 0002 was added in git history but is missing/);
  rmSync(root, { recursive: true, force: true });
});

test("adr-history: a reused number fails, and a Retired ADRs row grandfathers a pre-rule deletion", async () => {
  const root = gitRepo({ ".agents/adrs/0001-a.md": "a", ".agents/adrs/0002-b.md": "b", ".agents/adrs/README.md": README_RETIRED([]) });
  rmSync(path.join(root, ".agents/adrs/0002-b.md"));
  write(root, ".agents/adrs/0002-c.md", "c");
  commitAll(root, "delete b, reuse 0002 for c");
  const fail = await checkAdrHistory(root);
  const text = fail.violations.join("\n");
  assert.match(text, /0002-b\.md: ADR 0002 was added in git history but is missing/);
  assert.match(text, /ADR number 0002 has been held by more than one filename \(0002-b\.md, 0002-c\.md\)/);

  write(root, ".agents/adrs/README.md", README_RETIRED(["0002-b.md"]));
  commitAll(root, "record retirement");
  assert.deepEqual((await checkAdrHistory(root)).violations, []);
  rmSync(root, { recursive: true, force: true });
});

test("adr-history: a renamed ADR fails (the filename is what citations link)", async () => {
  const root = gitRepo({ ".agents/adrs/0001-a.md": "a", ".agents/adrs/README.md": README_RETIRED([]) });
  git(root, "mv", ".agents/adrs/0001-a.md", ".agents/adrs/0001-renamed.md");
  commitAll(root, "rename");
  assert.ok((await checkAdrHistory(root)).violations.length >= 1);
  rmSync(root, { recursive: true, force: true });
});

test("adr-history: a shallow clone skips instead of passing silently", async () => {
  const src = gitRepo({ ".agents/adrs/0001-a.md": "a" });
  write(src, ".agents/adrs/0002-b.md", "b");
  commitAll(src, "second commit so a depth-1 clone is genuinely shallow");
  const clone = path.join(fixture(), "clone");
  git(path.dirname(clone), "clone", "-q", "--depth", "1", `file://${src.replace(/\\/g, "/")}`, clone);
  const r = await checkAdrHistory(clone);
  assert.match(r.skipped ?? "", /shallow/);
  rmSync(src, { recursive: true, force: true });
  rmSync(path.dirname(clone), { recursive: true, force: true });
});

test("cli: exits 1 with the violation on stdout, 0 with OK, and 2 on an unknown mode", () => {
  const bad = fixture({ ".agents/context/a.md": "[gone](missing.md)" });
  const fail = spawnSync("node", [SCRIPT, "links", "--root", bad], { encoding: "utf8" });
  assert.equal(fail.status, 1);
  assert.match(fail.stdout, /broken link "missing\.md"/);
  const good = fixture({ ".agents/context/a.md": "fine" });
  const pass = spawnSync("node", [SCRIPT, "links", "--root", good], { encoding: "utf8" });
  assert.equal(pass.status, 0);
  assert.match(pass.stdout, /^OK links/);
  assert.equal(spawnSync("node", [SCRIPT, "nope"], { encoding: "utf8" }).status, 2);
  for (const d of [bad, good]) rmSync(d, { recursive: true });
});
