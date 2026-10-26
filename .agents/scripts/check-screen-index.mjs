#!/usr/bin/env node
// check-screen-index.mjs
// ---------------------------------------------------------------------------
// Offline checks of the Figma screen index — the only citable source of Figma
// node IDs (.agents/standards/solution/figma.md). No Figma access needed; the
// live half (does the node still exist, is it unchanged since approval) is the
// design-fidelity-check skill's `verify` mode. Run by verify.mjs; also runnable
// on its own.
//
//   structure   The index is well-formed: valid JSON with no duplicate object
//               keys; version 1; each file has name, fileKey and a url that
//               contains it; every screen key has four slug segments, the first
//               one of the index's declared "themes" and the last one of its declared
//               "breakpoints" (each check applies only when that list is non-empty);
//               node is <int>:<int>
//               and unique within its file; name slugs to the key; approved is
//               null or exactly {by, on, fingerprint}. Unknown fields fail.
//
//   citations   Every spec.md under .agents/specs/ added or changed against the
//               merge base (plus uncommitted and untracked ones) cites only nodes
//               the index knows: a `key` (`node`) pair must match an entry, and a
//               bare backticked `<int>:<int>` must be some entry's node. URLs with
//               node-id= are exempt (the sanctioned citation for frames not yet
//               indexed); fenced code is ignored; report.md is never scanned.
//               Skips (exit 0, says so) while the index lists no screens — verify.mjs
//               shows that as a skip, never a pass.
//
// Usage:
//   node .agents/scripts/check-screen-index.mjs <structure|citations> [--root <dir>] [--base <ref>]
//
// Exit 0 = pass (or skipped, stated on stdout); exit 1 = violations, one per line.
// ---------------------------------------------------------------------------

import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, "..", ".."); // .agents/scripts -> repo root

export const INDEX_FILE = ".agents/standards/solution/figma-screen-index.json";
const SPECS_DIR = ".agents/specs/";

const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NODE = /^\d+:\d+$/;
const FILE_KEY = /^[0-9A-Za-z]{22,128}$/;
const FINGERPRINT = /^fp1:[0-9a-f]{16}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// --- slug rule (technologies/figma.md → Naming convention) -------------------

/** Slug of one frame-name segment: lowercase; whitespace/hyphen runs → one hyphen; drop anything else; collapse; trim. */
export function slugSegment(s) {
  return s
    .toLowerCase()
    .replace(/[\s-]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Index key for a frame name: segments split on " / ", each slugged, joined by "/". */
export function slugKey(name) {
  return name.split(" / ").map(slugSegment).join("/");
}

// --- strict JSON parse (duplicate keys are an error, which JSON.parse hides) --

export function parseStrict(text) {
  let i = 0;
  const line = () => text.slice(0, i).split("\n").length;
  const fail = (msg) => {
    throw new Error(`${msg} (line ${line()})`);
  };
  const ws = () => {
    while (i < text.length && /\s/.test(text[i])) i++;
  };
  const str = () => {
    const start = i;
    i++;
    while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
    if (i >= text.length) fail("unterminated string");
    i++;
    return JSON.parse(text.slice(start, i));
  };
  const value = (where) => {
    ws();
    const c = text[i];
    if (c === "{") {
      i++;
      const obj = {};
      ws();
      if (text[i] === "}") {
        i++;
        return obj;
      }
      for (;;) {
        ws();
        if (text[i] !== '"') fail(`expected a key in ${where}`);
        const k = str();
        if (Object.prototype.hasOwnProperty.call(obj, k)) fail(`duplicate key "${k}" in ${where}`);
        ws();
        if (text[i] !== ":") fail(`expected ':' after "${k}"`);
        i++;
        obj[k] = value(`${where}.${k}`);
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "}") {
          i++;
          return obj;
        }
        fail(`expected ',' or '}' in ${where}`);
      }
    }
    if (c === "[") {
      i++;
      const arr = [];
      ws();
      if (text[i] === "]") {
        i++;
        return arr;
      }
      for (;;) {
        arr.push(value(`${where}[${arr.length}]`));
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "]") {
          i++;
          return arr;
        }
        fail(`expected ',' or ']' in ${where}`);
      }
    }
    if (c === '"') return str();
    const m = text.slice(i).match(/^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/);
    if (!m) fail(`unexpected character in ${where}`);
    i += m[0].length;
    return JSON.parse(m[0]);
  };
  const out = value("$");
  ws();
  if (i < text.length) fail("trailing content after the top-level value");
  return out;
}

async function readIndex(root) {
  const text = await fs.readFile(path.join(root, INDEX_FILE), "utf8");
  return parseStrict(text.replace(/^﻿/, ""));
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function unknownFields(obj, allowed, where, out) {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) out.push(`${where}: unknown field "${k}"`);
}
function realDate(s) {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// --- structure -------------------------------------------------------------

export async function checkStructure(root) {
  const v = [];
  let index;
  try {
    index = await readIndex(root);
  } catch (err) {
    return { violations: [`${INDEX_FILE}: ${err.code === "ENOENT" ? "missing" : err.message}`], checked: 0 };
  }
  let checked = 0;
  if (!isObj(index)) return { violations: [`${INDEX_FILE}: top level must be an object`], checked };
  unknownFields(index, ["$comment", "version", "themes", "breakpoints", "files"], INDEX_FILE, v);
  if (index.version !== 1) v.push(`${INDEX_FILE}: version must be 1`);
  const vocabulary = (name) => {
    const list = index[name] ?? [];
    if (!Array.isArray(list) || !list.every((s) => typeof s === "string" && SEGMENT.test(s))) {
      v.push(`${INDEX_FILE}: "${name}" must be an array of slug segments`);
      return new Set();
    }
    return new Set(list);
  };
  const THEMES = vocabulary("themes");
  const BREAKPOINTS = vocabulary("breakpoints");
  if (!isObj(index.files)) return { violations: [...v, `${INDEX_FILE}: "files" must be an object`], checked };

  for (const [fileId, file] of Object.entries(index.files)) {
    const fw = `${INDEX_FILE} files.${fileId}`;
    if (!isObj(file)) {
      v.push(`${fw}: must be an object`);
      continue;
    }
    unknownFields(file, ["name", "fileKey", "url", "screens"], fw, v);
    if (typeof file.name !== "string" || !file.name.trim()) v.push(`${fw}: "name" must be a non-empty string`);
    if (typeof file.fileKey !== "string" || !FILE_KEY.test(file.fileKey)) v.push(`${fw}: "fileKey" must be 22–128 letters or digits`);
    else if (typeof file.url !== "string" || !file.url.includes(file.fileKey)) v.push(`${fw}: "url" must contain the fileKey`);
    if (!isObj(file.screens)) {
      v.push(`${fw}: "screens" must be an object`);
      continue;
    }
    const nodes = new Map();
    for (const [key, entry] of Object.entries(file.screens)) {
      checked++;
      const ew = `${fw}.screens["${key}"]`;
      const segs = key.split("/");
      if (segs.length !== 4 || !segs.every((s) => SEGMENT.test(s))) {
        v.push(`${ew}: key must be four slug segments <theme>/<screen>/<state>/<breakpoint>`);
      } else {
        if (THEMES.size && !THEMES.has(segs[0])) v.push(`${ew}: first segment must be one of ${[...THEMES].join(", ")}`);
        if (BREAKPOINTS.size && !BREAKPOINTS.has(segs[3])) v.push(`${ew}: last segment must be one of ${[...BREAKPOINTS].join(", ")}`);
      }
      if (!isObj(entry)) {
        v.push(`${ew}: must be an object`);
        continue;
      }
      unknownFields(entry, ["node", "name", "approved"], ew, v);
      if (typeof entry.node !== "string" || !NODE.test(entry.node)) v.push(`${ew}: "node" must be <int>:<int>`);
      else if (nodes.has(entry.node)) v.push(`${ew}: node ${entry.node} is also the node of "${nodes.get(entry.node)}"`);
      else nodes.set(entry.node, key);
      if (typeof entry.name !== "string" || !entry.name.trim()) v.push(`${ew}: "name" must be a non-empty string`);
      else if (slugKey(entry.name) !== key) v.push(`${ew}: name "${entry.name}" slugs to "${slugKey(entry.name)}", not the key`);
      if (!("approved" in entry)) v.push(`${ew}: "approved" is required (null until a human approves)`);
      else if (entry.approved !== null) {
        const a = entry.approved;
        if (!isObj(a)) v.push(`${ew}: "approved" must be null or {by, on, fingerprint}`);
        else {
          unknownFields(a, ["by", "on", "fingerprint"], `${ew}.approved`, v);
          if (typeof a.by !== "string" || !a.by.trim()) v.push(`${ew}.approved: "by" must name the approving human`);
          if (typeof a.on !== "string" || !realDate(a.on)) v.push(`${ew}.approved: "on" must be a real ISO date (YYYY-MM-DD)`);
          if (typeof a.fingerprint !== "string" || !FINGERPRINT.test(a.fingerprint)) v.push(`${ew}.approved: "fingerprint" must be fp1:<16 hex>`);
        }
      }
    }
  }
  return { violations: v, checked };
}

// --- citations -------------------------------------------------------------

function git(root, ...args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.error || r.status !== 0 ? null : r.stdout;
}

/** The merge base against the first default-branch ref that exists, or null. */
export function mergeBase(root, base) {
  const candidates = [];
  if (base) candidates.push(base);
  else {
    const remotes = (git(root, "remote") || "").split(/\r?\n/).filter(Boolean);
    for (const r of remotes) candidates.push(`${r}/HEAD`, `${r}/master`, `${r}/main`);
    candidates.push("master", "main");
  }
  for (const ref of candidates) {
    if (git(root, "rev-parse", "--verify", "--quiet", `${ref}^{commit}`) === null) continue;
    const mb = git(root, "merge-base", "HEAD", ref);
    if (mb) return { ref, sha: mb.trim() };
  }
  return null;
}

const isSpec = (p) => p.startsWith(SPECS_DIR) && path.posix.basename(p) === "spec.md";

/** spec.md paths (repo-relative, posix) added or changed since the merge base, including uncommitted and untracked ones. */
export function changedSpecs(root, sha) {
  const lists = [
    git(root, "diff", "--name-only", "--diff-filter=AMR", sha, "--", SPECS_DIR),
    git(root, "ls-files", "--others", "--exclude-standard", "--", SPECS_DIR),
  ];
  const out = new Set();
  for (const l of lists) for (const p of (l || "").split(/\r?\n/)) if (p && isSpec(p)) out.add(p);
  return [...out].sort();
}

/** Citations outside fenced code: [{line, key?, node}]. URLs (node-id=) are not matched by construction. */
export function extractCitations(text) {
  const out = [];
  let fence = null;
  text.split(/\r?\n/).forEach((raw, n) => {
    const m = raw.match(/^\s*(```+|~~~+)/);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      return;
    }
    if (m) {
      fence = m[1];
      return;
    }
    let line = raw;
    for (const p of line.matchAll(/`([a-z0-9-]+(?:\/[a-z0-9-]+)+)`\s*\(`(\d+:\d+)`\)/g)) {
      out.push({ line: n + 1, key: p[1], node: p[2] });
    }
    line = line.replace(/`[a-z0-9-]+(?:\/[a-z0-9-]+)+`\s*\(`\d+:\d+`\)/g, "");
    for (const b of line.matchAll(/`(\d+:\d+)`/g)) out.push({ line: n + 1, node: b[1] });
  });
  return out;
}

async function indexScreens(root) {
  const index = await readIndex(root);
  const byKey = new Map();
  const nodes = new Set();
  for (const file of Object.values(index.files || {})) {
    for (const [key, entry] of Object.entries(file.screens || {})) {
      byKey.set(key, entry.node);
      nodes.add(entry.node);
    }
  }
  return { byKey, nodes };
}

export async function countScreens(root) {
  try {
    return (await indexScreens(root)).byKey.size;
  } catch {
    return 0;
  }
}

export async function checkCitations(root, base) {
  let screens;
  try {
    screens = await indexScreens(root);
  } catch (err) {
    return { violations: [`${INDEX_FILE}: unreadable (${err.message}) — run the structure check`], checked: 0 };
  }
  if (screens.byKey.size === 0) return { skipped: "the screen index has no screens yet" };
  const mb = mergeBase(root, base);
  if (!mb) return { violations: ["no merge base found (no git, or none of <remote>/HEAD, <remote>/master, <remote>/main, master, main) — cannot tell which specs changed"], checked: 0 };

  const v = [];
  const specs = changedSpecs(root, mb.sha);
  for (const rel of specs) {
    let text;
    try {
      text = await fs.readFile(path.join(root, rel), "utf8");
    } catch {
      continue; // deleted in the working tree
    }
    for (const c of extractCitations(text)) {
      if (c.key) {
        const node = screens.byKey.get(c.key);
        if (node === undefined) v.push(`${rel}:${c.line}: key \`${c.key}\` is not in the screen index`);
        else if (node !== c.node) v.push(`${rel}:${c.line}: \`${c.key}\` cites node ${c.node}, but the index has ${node}`);
      } else if (!screens.nodes.has(c.node)) {
        v.push(`${rel}:${c.line}: node ${c.node} is not in the screen index — cite it by index key, or by URL with node-id if not yet indexed`);
      }
    }
  }
  return { violations: v, checked: specs.length };
}

// --- cli -------------------------------------------------------------------

const MODES = { structure: (root) => checkStructure(root), citations: (root, base) => checkCitations(root, base) };

async function main() {
  const argv = process.argv.slice(2);
  const mode = argv[0];
  const opt = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const root = opt("--root") ? path.resolve(opt("--root")) : DEFAULT_ROOT;
  if (!MODES[mode]) {
    console.error(`Usage: node check-screen-index.mjs <${Object.keys(MODES).join("|")}> [--root <dir>] [--base <ref>]`);
    process.exit(2);
  }
  const result = await MODES[mode](root, opt("--base"));
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
