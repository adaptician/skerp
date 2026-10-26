#!/usr/bin/env node
// Generates .agents/adrs/adr-index.md from ADR frontmatter, and validates it.
//
// Realises the evidence-tier and Provisional-status convention in .agents/adrs/README.md: the index
// makes decision state queryable, and the gate fails on the contradiction `status: Accepted` +
// `evidence: assumed`.
//
//   node .agents/scripts/generate-adr-index.mjs            write the index
//   node .agents/scripts/generate-adr-index.mjs --check    fail if invalid OR stale (CI / verify.mjs)
//
// Deliberately dependency-free: a tiny YAML reader covers the fixed frontmatter shape, so the
// governance tooling needs no npm install. See .agents/adrs/README.md for the schema.
//
// No ADRs yet is not an error: a fresh project has none, and this script writes an index that says so.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADR_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'adrs');
const INDEX = join(ADR_DIR, 'adr-index.md');
const CHECK = process.argv.includes('--check');

const STATUSES = ['Proposed', 'Provisional', 'Accepted', 'Superseded', 'Deprecated'];
const EVIDENCE = ['measured', 'demonstrated', 'derived', 'assumed'];

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

/** Minimal YAML reader for the fixed ADR frontmatter shape: scalars, `>` blocks, inline arrays. */
function parseFrontmatter(text, file) {
  text = text.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) { fail(file, 'missing YAML frontmatter (must open with `---`)'); return null; }
  const end = text.indexOf('\n---', 4);
  if (end === -1) { fail(file, 'unterminated YAML frontmatter'); return null; }

  const out = {};
  const lines = text.slice(4, end).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const m = line.match(/^([a-zA-Z-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let raw = m[2].replace(/\s+#.*$/, '').trim();

    if (raw === '>' || raw === '|' || raw === '>-' || raw === '|-') {   // block scalar
      const buf = [];
      while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !/^\s{2,}-\s/.test(lines[i + 1])) {
        buf.push(lines[++i].trim());
      }
      out[key] = buf.join(' ');
      continue;
    }
    if (raw.startsWith('[')) {                  // inline array: [a, b]
      const inner = raw.slice(1, raw.lastIndexOf(']')).trim();
      out[key] = inner ? inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')) : [];
      continue;
    }
    if (raw === '') {
      // Block sequence (some editors, e.g. Obsidian's property view, rewrite inline arrays this way):
      //   key:
      //     - item
      const items = [];
      while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
        items.push(lines[++i].replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''));
      }
      if (items.length) { out[key] = items; continue; }
      out[key] = '';
      continue;
    }
    out[key] = raw.replace(/^["']|["']$/g, '');
  }
  return out;
}

if (!existsSync(ADR_DIR)) { console.error(`ADR directory not found: ${ADR_DIR}`); process.exit(1); }
const files = readdirSync(ADR_DIR).filter((f) => /^\d{4}-.*\.md$/.test(f)).sort();

const adrs = [];
for (const file of files) {
  const fm = parseFrontmatter(readFileSync(join(ADR_DIR, file), 'utf8'), file);
  if (!fm) continue;

  for (const k of ['id', 'title', 'status', 'evidence', 'decided']) {
    if (!fm[k]) fail(file, `frontmatter is missing required field \`${k}\``);
  }
  if (fm.status && !STATUSES.includes(fm.status)) fail(file, `invalid status \`${fm.status}\` (expected: ${STATUSES.join(', ')})`);
  if (fm.evidence && !EVIDENCE.includes(fm.evidence)) fail(file, `invalid evidence \`${fm.evidence}\` (expected: ${EVIDENCE.join(', ')})`);

  // The contradiction this gate exists to catch.
  if (fm.status === 'Accepted' && fm.evidence === 'assumed') {
    fail(file, 'status `Accepted` with evidence `assumed` is invalid. Use `Provisional`, or evidence the claim.');
  }
  if (fm.evidence !== 'measured' && !fm['evidence-note']) {
    fail(file, `evidence \`${fm.evidence}\` requires an \`evidence-note\` naming what is unevidenced`);
  }
  if (fm.implemented && !/^(null|undated|\d{4}-\d{2}-\d{2})$/.test(fm.implemented)) {
    fail(file, `invalid implemented \`${fm.implemented}\` (expected an ISO date, \`null\`, or \`undated\`)`);
  }
  // Obsidian (if used to browse this folder) resolves [[ADR-0001]] to a note named exactly
  // `ADR-0001`, not to `ADR-0001-<slug>.md`. Without an alias the link is unresolved, and clicking
  // it creates an empty stub file in the vault.
  const aliases = Array.isArray(fm.aliases) ? fm.aliases : fm.aliases ? [fm.aliases] : [];
  if (fm.id && !aliases.includes(fm.id)) {
    fail(file, `\`aliases\` must include \`${fm.id}\` so wikilinks [[${fm.id}]] resolve`);
  }
  adrs.push({ file, ...fm });
}

const byId = new Map(adrs.map((a) => [a.id, a]));
const refs = (list) => (list || []).map((s) => (s.match(/\[\[(ADR-\d{4})\]\]/) || [])[1]).filter(Boolean);

// Dangling link check + reverse dependency map.
const dependents = new Map();
for (const a of adrs) {
  for (const target of [...refs(a['depends-on']), ...refs(a.supersedes), ...refs(a['superseded-by'])]) {
    if (!byId.has(target)) fail(a.file, `references ${target}, which does not exist`);
  }
  for (const target of refs(a['depends-on'])) {
    if (!dependents.has(target)) dependents.set(target, []);
    dependents.get(target).push(a.id);
  }
}

if (errors.length) {
  console.error(`\nADR index validation FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error('\nSee .agents/adrs/README.md (Evidence tiers, Frontmatter) and TEMPLATE.md.\n');
  process.exit(1);
}

const impl = (a) => (!a.implemented || a.implemented === 'null' ? '—' : a.implemented === 'undated' ? 'yes (undated)' : a.implemented);
const link = (a) => `[${a.id}](${a.file})`;
const dep = (id) => (dependents.get(id) || []);

const provisional = adrs.filter((a) => a.status === 'Provisional');
const acceptedUnbuilt = adrs.filter((a) => a.status === 'Accepted' && (!a.implemented || a.implemented === 'null'));

const L = [];
L.push('<!-- GENERATED by .agents/scripts/generate-adr-index.mjs — DO NOT EDIT BY HAND. -->');
L.push('<!-- Regenerate: node .agents/scripts/generate-adr-index.mjs -->');
L.push('');
L.push('# Architecture Decision Record — Index');
L.push('');
if (adrs.length === 0) {
  L.push('_No ADRs recorded yet._ See `.agents/adrs/README.md` for when to write one and `TEMPLATE.md` to start.');
  L.push('');
} else {
  L.push(`${adrs.length} records. Evidence tiers and the \`Provisional\` status are defined in`);
  L.push('[`README.md`](README.md) — *Evidence tiers*.');
  L.push('');

  L.push('## ⚠ Provisional decisions — in force, not yet evidenced');
  L.push('');
  if (provisional.length === 0) {
    L.push('_None._');
  } else {
    L.push('These are being relied upon while their load-bearing claims are untested. An `assumed` claim may');
    L.push('not constrain a design — it generates a Spike. **Read the `Relied on by` column:** that is the');
    L.push('blast radius if the claim turns out to be false.');
    L.push('');
    L.push('| ADR | Title | Evidence | What is unevidenced | Relied on by |');
    L.push('|---|---|---|---|---|');
    for (const a of provisional) {
      L.push(`| ${link(a)} | ${a.title} | \`${a.evidence}\` | ${a['evidence-note'] || ''} | ${dep(a.id).join(', ') || '—'} |`);
    }
  }
  L.push('');

  L.push('## ⚠ Accepted but unimplemented');
  L.push('');
  L.push(acceptedUnbuilt.length === 0
    ? '_None._ Every accepted decision is running.'
    : '| ADR | Title | Decided | Relied on by |\n|---|---|---|---|');
  for (const a of acceptedUnbuilt) L.push(`| ${link(a)} | ${a.title} | ${a.decided} | ${dep(a.id).join(', ') || '—'} |`);
  L.push('');

  L.push('## All decisions');
  L.push('');
  L.push('| ADR | Title | Status | Evidence | Decided | Implemented |');
  L.push('|---|---|---|---|---|---|');
  for (const a of adrs) {
    const s = a.status === 'Provisional' ? `**${a.status}**` : a.status;
    const e = a.evidence === 'assumed' ? `**${a.evidence}**` : `\`${a.evidence}\``;
    L.push(`| ${link(a)} | ${a.title} | ${s} | ${e} | ${a.decided} | ${impl(a)} |`);
  }
  L.push('');

  L.push('## Supersession');
  L.push('');
  const sup = adrs.filter((a) => (a.supersedes || []).length || (a['superseded-by'] || []).length);
  if (sup.length === 0) L.push('_No supersessions recorded._');
  else {
    L.push('| ADR | Supersedes | Superseded by |');
    L.push('|---|---|---|');
    for (const a of sup) {
      L.push(`| ${link(a)} | ${(a.supersedes || []).join('<br>') || '—'} | ${(a['superseded-by'] || []).join('<br>') || '—'} |`);
    }
  }
  L.push('');

  L.push('## Reverse dependencies');
  L.push('');
  L.push('What cites each decision. A record with many dependents is expensive to overturn — which is exactly');
  L.push('why the Provisional table above matters.');
  L.push('');
  L.push('| ADR | Relied on by |');
  L.push('|---|---|');
  for (const a of adrs) L.push(`| ${link(a)} | ${dep(a.id).join(', ') || '—'} |`);
  L.push('');

  L.push('## Evidence summary');
  L.push('');
  L.push('| Tier | Count | | Status | Count |');
  L.push('|---|---|---|---|---|');
  const cnt = (arr, k, v) => arr.filter((a) => a[k] === v).length;
  const rows = Math.max(EVIDENCE.length, STATUSES.length);
  for (let i = 0; i < rows; i++) {
    const ev = EVIDENCE[i] ? `\`${EVIDENCE[i]}\` | ${cnt(adrs, 'evidence', EVIDENCE[i])}` : ' | ';
    const st = STATUSES[i] ? `${STATUSES[i]} | ${cnt(adrs, 'status', STATUSES[i])}` : ' | ';
    L.push(`| ${ev} | | ${st} |`);
  }
  L.push('');
}

const content = L.join('\n') + '\n';

if (CHECK) {
  let existing = null;
  try { existing = readFileSync(INDEX, 'utf8'); } catch { /* missing */ }
  // Compare with CRLF normalized to LF: a checkout with core.autocrlf=true rewrites the working-tree
  // copy to CRLF while this script always writes LF, which would otherwise report "stale" on every
  // fresh Windows checkout even when the content is byte-identical modulo line endings.
  if (existing?.replace(/\r\n/g, '\n') !== content) {
    console.error('\nADR index is STALE or missing.\n\n  Run: node .agents/scripts/generate-adr-index.mjs\n');
    process.exit(1);
  }
  console.log(`ADR index is in sync and valid (${adrs.length} records, ${provisional.length} provisional).`);
} else {
  writeFileSync(INDEX, content, 'utf8');
  console.log(`Wrote ${INDEX} — ${adrs.length} records, ${provisional.length} provisional, ${acceptedUnbuilt.length} accepted-but-unimplemented.`);
}
