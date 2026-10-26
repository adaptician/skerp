// Tests for check-screen-index.mjs, and for the design-fidelity-check skill's fingerprint.js.
// Run: node --test .agents/scripts/check-screen-index.test.mjs
// Every failure mode is constructed against a throwaway fixture tree (a throwaway git repo for citations)
// rather than assumed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkStructure, checkCitations, slugKey, extractCitations, INDEX_FILE } from "./check-screen-index.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "check-screen-index.mjs");
const FINGERPRINT_JS = path.join(HERE, "..", "skills", "design-fidelity-check", "fingerprint.js");

const FILE_KEY = "AbCdEfGhIjKlMnOpQrStUv";
function index(screens = {}, vocabulary = { themes: ["staff", "client", "auth"], breakpoints: ["desktop", "mobile"] }) {
  return {
    version: 1,
    ...vocabulary,
    files: {
      "example-app": { name: "Example App", fileKey: FILE_KEY, url: `https://www.figma.com/design/${FILE_KEY}/x`, screens },
    },
  };
}
const ENTRY = { node: "73:724", name: "Client / Profile / View / Desktop", approved: null };
const APPROVED = { by: "A Human", on: "2026-10-02", fingerprint: "fp1:0123456789abcdef" };

function fixture(files = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "screen-index-"));
  for (const [rel, content] of Object.entries(files)) write(root, rel, content);
  return root;
}
function write(root, rel, content) {
  const full = path.join(root, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}
const gitEnv = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
function git(root, ...args) {
  return execFileSync("git", ["-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], { cwd: root, env: gitEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
function commitAll(root, msg) {
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", msg);
}
/** A repo whose `master` holds `base`; HEAD is a branch off it. */
function branchRepo(base) {
  const root = fixture(base);
  git(root, "init", "-q", "-b", "master");
  commitAll(root, "base");
  git(root, "switch", "-q", "-c", "work");
  return root;
}
const structureOf = async (idx) => checkStructure(fixture({ [INDEX_FILE]: idx }));

// --- slug rule -------------------------------------------------------------

test("slug rule: segments split on ' / ', punctuation and emoji dropped, hyphen runs collapsed", () => {
  assert.equal(slugKey("Client / Profile / View / Desktop"), "client/profile/view/desktop");
  assert.equal(slugKey("Auth / Forgot Password / Default / Mobile"), "auth/forgot-password/default/mobile");
  assert.equal(slugKey("Staff / Clients (List) — Edit / Open / Desktop"), "staff/clients-list-edit/open/desktop");
  assert.equal(slugKey("Client / 🔐 Two  --  Factor / Error / Mobile"), "client/two-factor/error/mobile");
  // A bare slash is punctuation inside a segment, and the retired " · " separator no longer splits,
  // so a frame still named the old way slugs to one segment and shows up as drift.
  assert.equal(slugKey("Staff / Forgot/Reset / Default / Desktop"), "staff/forgotreset/default/desktop");
  assert.equal(slugKey("Client · Profile · View · Desktop"), "client-profile-view-desktop");
});

// --- structure -------------------------------------------------------------

test("structure: the empty index and a well-formed entry pass", async () => {
  assert.deepEqual((await structureOf(index())).violations, []);
  const ok = await structureOf(index({ "client/profile/view/desktop": ENTRY, "auth/login/default/mobile": { node: "73:623", name: "Auth / Login / Default / Mobile", approved: APPROVED } }));
  assert.deepEqual(ok.violations, []);
  assert.equal(ok.checked, 2);
});

test("structure: the repository's own index passes", async () => {
  const r = await checkStructure(path.resolve(HERE, "..", ".."));
  assert.deepEqual(r.violations, []);
});

test("structure: malformed keys and wrong vocabulary fail, naming the entry", async () => {
  const r = await structureOf(
    index({
      "client/profile/desktop": { ...ENTRY, name: "Client / Profile / Desktop" },
      "host/profile/view/desktop": { ...ENTRY, node: "1:2", name: "Host / Profile / View / Desktop" },
      "client/profile/view/tablet": { ...ENTRY, node: "1:3", name: "Client / Profile / View / Tablet" },
      "Client/Profile/View/Desktop": { ...ENTRY, node: "1:4" },
    }),
  );
  const text = r.violations.join("\n");
  assert.match(text, /"client\/profile\/desktop"\]: key must be four slug segments/);
  assert.match(text, /"host\/profile\/view\/desktop"\]: first segment must be one of staff, client, auth/);
  assert.match(text, /"client\/profile\/view\/tablet"\]: last segment must be one of desktop, mobile/);
  assert.match(text, /"Client\/Profile\/View\/Desktop"\]: key must be four slug segments/);
});

test("structure: with no themes or breakpoints declared, any slug segment is accepted; a bad vocabulary fails", async () => {
  const open = await structureOf(index({ "host/profile/view/tablet": { ...ENTRY, name: "Host / Profile / View / Tablet" } }, {}));
  assert.deepEqual(open.violations, []);
  const bad = await structureOf(index({}, { themes: ["Staff"], breakpoints: "desktop" }));
  const text = bad.violations.join("\n");
  assert.match(text, /"themes" must be an array of slug segments/);
  assert.match(text, /"breakpoints" must be an array of slug segments/);
});

test("structure: a duplicate key fails even though JSON.parse would drop it", async () => {
  const raw = JSON.stringify(index({ "client/profile/view/desktop": ENTRY }), null, 2).replace(
    /("client\/profile\/view\/desktop": \{[^}]*\})/,
    `$1,\n"client/profile/view/desktop": ${JSON.stringify({ ...ENTRY, node: "9:9" })}`,
  );
  const r = await checkStructure(fixture({ [INDEX_FILE]: raw }));
  assert.match(r.violations.join("\n"), /duplicate key "client\/profile\/view\/desktop"/);
});

test("structure: a duplicate node, a bad node and a name that does not slug to its key fail", async () => {
  const r = await structureOf(
    index({
      "client/profile/view/desktop": ENTRY,
      "client/profile/view/mobile": { ...ENTRY, name: "Client / Profile / View / Mobile" },
      "client/profile/edit/desktop": { node: "73-724", name: "Client / Profile / Edit / Desktop", approved: null },
      "client/dashboard/view/desktop": { node: "73:837", name: "Client / Dashboard — Desktop (1440)", approved: null },
    }),
  );
  const text = r.violations.join("\n");
  assert.match(text, /"client\/profile\/view\/mobile"\]: node 73:724 is also the node of "client\/profile\/view\/desktop"/);
  assert.match(text, /"client\/profile\/edit\/desktop"\]: "node" must be <int>:<int>/);
  assert.match(text, /"client\/dashboard\/view\/desktop"\]: name .* slugs to "client\/dashboard-desktop-1440", not the key/);
});

test("structure: malformed approvals and unknown fields fail", async () => {
  const r = await structureOf(
    index({
      "client/a/view/desktop": { node: "1:1", name: "Client / A / View / Desktop", approved: { by: "", on: "2026-02-30", fingerprint: "abc" } },
      "client/b/view/desktop": { node: "1:2", name: "Client / B / View / Desktop", approved: { by: "H", on: "2026-10-02" } },
      "client/c/view/desktop": { node: "1:3", name: "Client / C / View / Desktop", approved: { ...APPROVED, note: "x" }, status: "ready" },
      "client/d/view/desktop": { node: "1:4", name: "Client / D / View / Desktop" },
    }),
  );
  const text = r.violations.join("\n");
  assert.match(text, /"client\/a\/view\/desktop"\]\.approved: "by" must name the approving human/);
  assert.match(text, /"client\/a\/view\/desktop"\]\.approved: "on" must be a real ISO date/);
  assert.match(text, /"client\/a\/view\/desktop"\]\.approved: "fingerprint" must be fp1:<16 hex>/);
  assert.match(text, /"client\/b\/view\/desktop"\]\.approved: "fingerprint" must be/);
  assert.match(text, /"client\/c\/view\/desktop"\]\.approved: unknown field "note"/);
  assert.match(text, /"client\/c\/view\/desktop"\]: unknown field "status"/);
  assert.match(text, /"client\/d\/view\/desktop"\]: "approved" is required/);
});

test("structure: a bad file header fails", async () => {
  const idx = index();
  idx.version = 2;
  idx.files["example-app"].url = "https://www.figma.com/design/other";
  const text = (await structureOf(idx)).violations.join("\n");
  assert.match(text, /version must be 1/);
  assert.match(text, /"url" must contain the fileKey/);
});

// --- citations -------------------------------------------------------------

test("citations: extraction matches key pairs and bare nodes, ignores URLs and fenced code", () => {
  const c = extractCitations(
    [
      "Profile: `client/profile/view/desktop` (`73:724`) and bare `73:752`.",
      "Unindexed: https://www.figma.com/design/K/x?node-id=73-1332 and [link](https://figma.com/design/K/x?node-id=1-2)",
      "```",
      "`9:9`",
      "```",
      "Time 10:30 without backticks.",
    ].join("\n"),
  );
  assert.deepEqual(c, [
    { line: 1, key: "client/profile/view/desktop", node: "73:724" },
    { line: 1, node: "73:752" },
  ]);
});

test("citations: skipped while the index has no screens", async () => {
  const r = await checkCitations(branchRepo({ [INDEX_FILE]: index() }));
  assert.ok(r.skipped);
});

const SPEC = ".agents/specs/epics/e/features/f/work/w/spec.md";
const OLD_SPEC = ".agents/specs/epics/e/features/f/work/old/spec.md";
const REPORT = ".agents/specs/epics/e/features/f/work/r/report.md";

test("citations: a changed spec citing an unknown node fails, naming file, line and node", async () => {
  const root = branchRepo({ [INDEX_FILE]: index({ "client/profile/view/desktop": ENTRY }) });
  write(root, SPEC, "# W\n\nUses `client/profile/view/desktop` (`73:724`).\nAnd `9:9`.\n");
  commitAll(root, "spec");
  const r = await checkCitations(root);
  assert.deepEqual(r.violations, [`${SPEC}:4: node 9:9 is not in the screen index — cite it by index key, or by URL with node-id if not yet indexed`]);
});

test("citations: a key pair whose node differs from the index, or an unknown key, fails", async () => {
  const root = branchRepo({ [INDEX_FILE]: index({ "client/profile/view/desktop": ENTRY }) });
  write(root, SPEC, "`client/profile/view/desktop` (`1:1`)\n`client/nope/view/desktop` (`73:724`)\n");
  const text = (await checkCitations(root)).violations.join("\n"); // uncommitted counts too
  assert.match(text, /spec\.md:1: `client\/profile\/view\/desktop` cites node 1:1, but the index has 73:724/);
  assert.match(text, /spec\.md:2: key `client\/nope\/view\/desktop` is not in the screen index/);
});

test("citations: an unchanged existing spec citing a raw node does not fail; report.md and URLs are exempt", async () => {
  const root = branchRepo({
    [INDEX_FILE]: index({ "client/profile/view/desktop": ENTRY }),
    [OLD_SPEC]: "Old plan cites `73:1332` directly.\n",
  });
  write(root, REPORT, "Report cites `5:5`.\n");
  write(root, SPEC, "New plan cites https://www.figma.com/design/K/x?node-id=73-1332 for an unindexed frame.\n");
  commitAll(root, "report and spec");
  const r = await checkCitations(root);
  assert.deepEqual(r.violations, []);
  assert.equal(r.checked, 1);
});

test("citations: an untracked new spec is checked", async () => {
  const root = branchRepo({ [INDEX_FILE]: index({ "client/profile/view/desktop": ENTRY }) });
  write(root, SPEC, "`8:8`\n");
  assert.equal((await checkCitations(root)).violations.length, 1);
});

test("citations: no merge base fails rather than passing", async () => {
  const root = fixture({ [INDEX_FILE]: index({ "client/profile/view/desktop": ENTRY }) }); // not a git repo
  const r = await checkCitations(root);
  assert.match(r.violations.join("\n"), /no merge base found/);
});

test("cli: exit 1 with one violation per line; SKIP printed for an empty index", () => {
  const bad = fixture({ [INDEX_FILE]: index({ "client/x/desktop": ENTRY }) });
  const r = spawnSync(process.execPath, [SCRIPT, "structure", "--root", bad], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /key must be four slug segments/);
  const empty = branchRepo({ [INDEX_FILE]: index() });
  const s = spawnSync(process.execPath, [SCRIPT, "citations", "--root", empty], { encoding: "utf8" });
  assert.equal(s.status, 0);
  assert.match(s.stdout, /^SKIP citations:/);
});

// --- fingerprint.js (the skill's script, run verbatim against a mock figma) --

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
async function fingerprint(tree) {
  const code = readFileSync(FINGERPRINT_JS, "utf8").replace(/const NODE_IDS = \[[^\]]*\];/, 'const NODE_IDS = ["1:1"];');
  const mixed = Symbol("mixed");
  const page = { type: "PAGE", name: "👤 Screens / Client" };
  const link = (n, parent) => {
    n.parent = parent;
    for (const c of n.children || []) link(c, n);
    return n;
  };
  const root = link(structuredClone(tree), page);
  const figma = { mixed, getNodeByIdAsync: async (id) => (id === "1:1" ? root : null) };
  const [out] = await new AsyncFunction("figma", code)(figma);
  return out.fingerprint;
}
const TREE = {
  type: "FRAME", name: "Client / Profile / View / Desktop", visible: true, width: 1440, height: 900, x: 0, y: 0,
  layoutMode: "VERTICAL", itemSpacing: 16, paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24,
  primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN", cornerRadius: 0, opacity: 1,
  fills: [{ type: "SOLID", visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 } }], strokes: [], strokeWeight: 0, effects: [],
  children: [
    { type: "TEXT", name: "Title", visible: true, width: 200, height: 32, x: 24, y: 24, opacity: 1,
      fills: [{ type: "SOLID", visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { id: "VariableID:1:2" } } }],
      strokes: [], strokeWeight: 0, effects: [], characters: "Profile", fontName: { family: "Inter", style: "Bold" }, fontSize: 24, textAlignHorizontal: "LEFT" },
  ],
};
const variant = (fn) => {
  const t = structuredClone(TREE);
  fn(t);
  return t;
};

test("fingerprint: stable for the same tree, and in the fp1:<16 hex> format", async () => {
  const a = await fingerprint(TREE);
  assert.match(a, /^fp1:[0-9a-f]{16}$/);
  assert.equal(await fingerprint(structuredClone(TREE)), a);
});

test("fingerprint: changes when a covered property changes", async () => {
  const base = await fingerprint(TREE);
  const edits = {
    text: (t) => (t.children[0].characters = "Your profile"),
    colour: (t) => (t.fills[0].color.g = 0.9),
    variable: (t) => (t.children[0].fills[0].boundVariables.color.id = "VariableID:1:3"),
    moved: (t) => (t.children[0].x = 32),
    resized: (t) => (t.width = 1280),
    spacing: (t) => (t.itemSpacing = 12),
    hidden: (t) => (t.children[0].visible = false),
    added: (t) => t.children.push({ type: "RECTANGLE", name: "Divider", visible: true, width: 100, height: 1, x: 0, y: 60 }),
  };
  for (const [name, fn] of Object.entries(edits)) {
    assert.notEqual(await fingerprint(variant(fn)), base, `${name} should change the fingerprint`);
  }
});

test("fingerprint: moving the frame on the canvas does not change it", async () => {
  assert.equal(await fingerprint(variant((t) => { t.x = 5000; t.y = -200; })), await fingerprint(TREE));
});
