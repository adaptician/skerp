#!/usr/bin/env node
// Generates .agents/standards/README.md from standards frontmatter, and validates it.
//
// The index is organised by WHEN TO READ, not by category. A large standards tree is not a problem
// if only the files matching the work are loaded; the problem is nothing telling an agent which ones
// those are.
//
//   node .agents/scripts/generate-standards-index.mjs            write the index
//   node .agents/scripts/generate-standards-index.mjs --check    fail if invalid OR stale
//
// Dependency-free by design: a tiny YAML reader covers the fixed frontmatter shape, so governance
// tooling needs no npm install.
//
// Schema: title, tier, enforced-by, applies-when, disposition, [note], last-reviewed.
//
// `disposition` is the ratchet. Every standard must declare what is to become of the rules in it that
// nothing checks, opening with one of: mechanise / reference / delete / keep. Without it the
// prose-only register is a list of complaints; with it, it is a work queue.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'standards');
const INDEX = join(ROOT, 'README.md');
const CHECK = process.argv.includes('--check');

const ENFORCEMENT = ['analyzer', 'test', 'verify.mjs', 'hook', 'review', 'prose-only'];

/**
 * How the unenforced rules in a standard are to be resolved. The prefix is checked, not the whole
 * string, so each entry carries its own reasoning — a bare verdict with no reason is what lets a
 * prose-only register rot.
 */
const DISPOSITIONS = {
  mechanise: 'Becomes a check. The mechanism is named in the disposition.',
  reference: 'Stays as consult-on-demand reference; not rules an agent must follow while working.',
  delete: 'To be removed. An unenforced rule creates the impression of a standard where none exists.',
  keep: 'Judgement that cannot be mechanised, with the reason it is load-bearing anyway.',
};
const errors = [];
const fail = (f, m) => errors.push(`${f}: ${m}`);

function parseFrontmatter(text, file) {
  text = text.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) { fail(file, 'missing frontmatter (must open with `---`)'); return null; }
  const end = text.indexOf('\n---', 4);
  if (end === -1) { fail(file, 'unterminated frontmatter'); return null; }
  const out = {};
  const lines = text.slice(4, end).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([a-zA-Z-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let raw = m[2].trim();
    if (raw === '>' || raw === '|' || raw === '>-' || raw === '|-') {
      const buf = [];
      while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !/^\s{2,}-\s/.test(lines[i + 1])) {
        buf.push(lines[++i].trim());
      }
      out[key] = buf.join(' ');
    } else if (raw.startsWith('[')) {
      const inner = raw.slice(1, raw.lastIndexOf(']')).trim();
      out[key] = inner ? inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')) : [];
    } else if (raw === '') {
      const items = [];
      while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
        items.push(lines[++i].replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''));
      }
      out[key] = items.length ? items : '';
    } else {
      out[key] = raw.replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

// Collect every standard except the generated index itself.
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (name.name.endsWith('.md') && p !== INDEX) files.push(p);
  }
};
walk(ROOT);

const standards = [];
for (const path of files) {
  const rel = relative(ROOT, path).replace(/\\/g, '/');
  const text = readFileSync(path, 'utf8');
  const fm = parseFrontmatter(text, rel);
  if (!fm) continue;

  for (const k of ['title', 'tier', 'enforced-by', 'applies-when', 'disposition']) {
    if (fm[k] === undefined || fm[k] === '') fail(rel, `frontmatter missing required field \`${k}\``);
  }

  const verdict = String(fm.disposition ?? '').trim().split(/[\s—:-]/, 1)[0].toLowerCase();
  if (fm.disposition && !Object.hasOwn(DISPOSITIONS, verdict)) {
    fail(rel, `disposition must open with one of: ${Object.keys(DISPOSITIONS).join(', ')} (got \`${verdict}\`)`);
  }
  const tier = Number(fm.tier);
  if (![1, 2].includes(tier)) fail(rel, `invalid tier \`${fm.tier}\` (expected 1 or 2; tier 0 is AGENTS.md + context)`);

  const enf = Array.isArray(fm['enforced-by']) ? fm['enforced-by'] : [];
  if (enf.length === 0) fail(rel, '`enforced-by` must list at least one value');
  for (const e of enf) if (!ENFORCEMENT.includes(e)) fail(rel, `invalid enforced-by \`${e}\` (expected: ${ENFORCEMENT.join(', ')})`);

  // Spread `fm` FIRST: it carries `tier` as a string, and would otherwise clobber the coerced
  // number below — silently producing an index where every tier bucket is empty but the total is
  // right, which `--check` happily accepts.
  standards.push({ ...fm, rel, path, tier, enf, verdict, lines: text.split('\n').length });
}

if (errors.length) {
  console.error(`\nStandards index validation FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    '\nSchema: title, tier, enforced-by, applies-when, disposition, [note], last-reviewed.' +
    `\n  enforced-by:  ${ENFORCEMENT.join(' | ')}` +
    `\n  disposition:  must open with ${Object.keys(DISPOSITIONS).join(' | ')}, then the reasoning.\n`,
  );
  process.exit(1);
}

const t1 = standards.filter((s) => s.tier === 1);
const t2 = standards.filter((s) => s.tier === 2);

// Invariant: every standard lands in exactly one tier bucket. Without this, a type slip upstream
// produces a well-formed index with empty tables that `--check` accepts as valid.
if (t1.length + t2.length !== standards.length) {
  console.error(
    `\nINTERNAL: ${standards.length} standards but only ${t1.length + t2.length} fell into a tier bucket.\n` +
    '  Tier values are not comparing as numbers — check the parse/coercion path.\n'
  );
  process.exit(1);
}
const proseOnly = standards.filter((s) => s.enf.includes('prose-only'));
const sum = (a) => a.reduce((n, s) => n + s.lines, 0);
const link = (s) => `[\`${s.rel}\`](${s.rel})`;

const L = [];
L.push('<!-- GENERATED by .agents/scripts/generate-standards-index.mjs — DO NOT EDIT BY HAND. -->');
L.push('<!-- Regenerate: node .agents/scripts/generate-standards-index.mjs -->');
L.push('');
L.push('# Standards — Index');
L.push('');
L.push('Organised by **when to read**, not by category. Reading everything is equivalent to reading nothing.');
L.push('');
L.push(`**Tier 0** — always loaded — is \`AGENTS.md\` plus \`tier: 0\` files in \`.agents/context/\`. Nothing in`);
L.push('this directory is Tier 0.');
L.push('');
L.push(`| Tier | Files | Lines | Loaded |`);
L.push('|---|---|---|---|');
L.push(`| 1 | ${t1.length} | ${sum(t1)} | When the work touches the area |`);
L.push(`| 2 | ${t2.length} | ${sum(t2)} | On explicit demand |`);
L.push(`| **Total** | **${standards.length}** | **${sum(standards)}** | |`);
L.push('');

L.push('## Tier 1 — read when working in this area');
L.push('');
L.push('| Read this | When you are… | Enforced by | Lines |');
L.push('|---|---|---|---|');
for (const s of t1.sort((a, b) => a.rel.localeCompare(b.rel))) {
  L.push(`| ${link(s)} | ${s['applies-when']} | ${s.enf.join(', ')} | ${s.lines} |`);
}
L.push('');

L.push('## Tier 2 — consult on demand');
L.push('');
L.push('| Read this | When you are… | Enforced by | Lines |');
L.push('|---|---|---|---|');
for (const s of t2.sort((a, b) => b.lines - a.lines)) {
  L.push(`| ${link(s)} | ${s['applies-when']} | ${s.enf.join(', ')} | ${s.lines} |`);
}
L.push('');

L.push('## Enforcement summary');
L.push('');
L.push('| Mechanism | Standards | Meaning |');
L.push('|---|---|---|');
const MEAN = {
  analyzer: 'A compiler warning, analyzer, or editorconfig rule',
  test: 'A test fails when violated',
  'verify.mjs': 'A quality-gate check',
  hook: 'A PreToolUse/PostToolUse hook blocks or fixes it',
  review: 'Only a reviewer catches it',
  'prose-only': '**Nothing catches it. It is advice.**',
};
for (const e of ENFORCEMENT) {
  L.push(`| \`${e}\` | ${standards.filter((s) => s.enf.includes(e)).length} | ${MEAN[e]} |`);
}
L.push('');

L.push('## ⚠ The `prose-only` register');
L.push('');
L.push(`**${proseOnly.length} of ${standards.length} standards contain rules nothing checks.** That is the gap between what this`);
L.push('repository says it enforces and what it does.');
L.push('');
L.push('**The ratchet:** a `prose-only` rule that survives two consecutive checkpoint reviews without being');
L.push('mechanised gets **deleted** — not weakened, deleted. An unenforced rule everyone has agreed to keep is');
L.push('worse than no rule, because it creates the impression of a standard where none exists.');
L.push('');
L.push('Every standard declares a `disposition` saying what becomes of its unenforced rules:');
L.push('');
L.push('| Verdict | Standards | Meaning |');
L.push('|---|---|---|');
for (const [name, meaning] of Object.entries(DISPOSITIONS)) {
  L.push(`| \`${name}\` | ${standards.filter((s) => s.verdict === name).length} | ${meaning} |`);
}
L.push('');
L.push('| Standard | Lines | Other enforcement | Disposition |');
L.push('|---|---|---|---|');
for (const s of proseOnly.sort((a, b) => b.lines - a.lines)) {
  const other = s.enf.filter((e) => e !== 'prose-only');
  L.push(`| ${link(s)} | ${s.lines} | ${other.length ? other.join(', ') : '**none**'} | ${s.disposition} |`);
}
L.push('');

const stale = standards.filter((s) => s.note);
if (stale.length) {
  L.push('## Recorded caveats');
  L.push('');
  L.push('Standards carrying a `note` — superseded content, known defects, or enforcement that reads stronger');
  L.push('than it is. Read the note before trusting the file.');
  L.push('');
  for (const s of stale.sort((a, b) => a.rel.localeCompare(b.rel))) L.push(`- ${link(s)} — ${s.note}`);
  L.push('');
}

const content = L.join('\n') + '\n';

if (CHECK) {
  const existing = existsSync(INDEX) ? readFileSync(INDEX, 'utf8') : null;
  if (existing !== content) {
    console.error('\nStandards index is STALE or missing.\n\n  Run: node .agents/scripts/generate-standards-index.mjs\n');
    process.exit(1);
  }
  console.log(`Standards index in sync and valid (${standards.length} standards, ${proseOnly.length} prose-only).`);
} else {
  writeFileSync(INDEX, content, 'utf8');
  console.log(`Wrote ${INDEX} — ${standards.length} standards, tier 1: ${t1.length}, tier 2: ${t2.length}, prose-only: ${proseOnly.length}.`);
}
