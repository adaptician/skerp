#!/usr/bin/env node
// Validates the run-log and assumption-ledger entry files, and prints their tables on demand.
//
//   node .agents/scripts/ledgers.mjs --check               fail if any entry is invalid, or a retired index is back
//   node .agents/scripts/ledgers.mjs                       print the run-log table and the Open/Settled assumption tables
//   node .agents/scripts/ledgers.mjs --open                print only the open assumptions
//   node .agents/scripts/ledgers.mjs --work-item <id>      filter both to one work item (e.g. 941 or AB#941)
//
// Why there is no committed index: .agents/run-log.md and .agents/assumption-ledger.md used to be
// tables generated from these entry files and committed beside them. Every branch that added an entry
// regenerated the same table, so every PR conflicted on it — even though the entry files themselves
// never collide. Regenerating resolved the conflict mechanically, but it still stalled every review.
// The indexes were retired: the entry files are the record, their filenames carry the date and work
// item, their frontmatter carries the summary/status, and this script prints the tables when someone
// wants the view. Output goes to stdout only, so nothing generated is ever committed. `--check` fails if
// either retired index file reappears (e.g. from a branch that predates the change), so it cannot drift
// back in. Static conventions live in .agents/run-log/README.md and .agents/assumption-ledger/README.md.
//
// Dependency-free by design, matching generate-adr-index.mjs: a tiny YAML reader covers the fixed
// frontmatter shape, so governance tooling needs no npm install.
//
// No entries yet is not an error: a fresh project has none.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUN_LOG_DIR = join(ROOT, 'run-log');
const ASSUMPTION_DIR = join(ROOT, 'assumption-ledger');
const RETIRED_INDEXES = ['run-log.md', 'assumption-ledger.md'];
const MAX_FILENAME = 90;

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const OPEN_ONLY = args.includes('--open');
const wiIdx = args.indexOf('--work-item');
const wiArg = args[wiIdx + 1] ?? '';
const WORK_ITEM = wiIdx !== -1 && !wiArg.startsWith('--') ? normaliseWorkItem(wiArg) : null;
if (wiIdx !== -1 && !WORK_ITEM) {
  console.error('--work-item needs an id, e.g. --work-item 941');
  process.exit(2);
}

const TIERS = ['measured', 'demonstrated', 'derived', 'assumed'];
const RUN_LOG_NAME = /^\d{4}-\d{2}-\d{2}T\d{4}Z-.+\.md$/;
const LEGACY_RUN_LOG_NAME = /^\d{4}-\d{2}-\d{2}-.+\.md$/; // pre-timestamp entries; never renamed
const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

function normaliseWorkItem(s) {
  return String(s).trim().replace(/^AB#/i, '').toLowerCase();
}

/** Minimal YAML reader for the fixed ledger-entry frontmatter shape: scalars and `>` blocks. */
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

    if (raw === '>' || raw === '|' || raw === '>-' || raw === '|-') {
      const buf = [];
      while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1])) {
        buf.push(lines[++i].trim());
      }
      out[key] = buf.join(' ');
      continue;
    }
    out[key] = raw.replace(/^["']|["']$/g, '');
  }
  return out;
}

function entryFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md' && f !== 'README.md')
    .sort();
}

// --- Retired indexes -----------------------------------------------------------------------------

for (const name of RETIRED_INDEXES) {
  if (existsSync(join(ROOT, name))) {
    fail(
      `.agents/${name}`,
      `this index was retired and must not be committed — run \`git rm .agents/${name}\` ` +
      '(it usually comes back from a branch that predates the change; keep that branch\'s entry files)',
    );
  }
}

// --- Run log -----------------------------------------------------------------------------------

const runLogEntries = [];
for (const file of entryFiles(RUN_LOG_DIR)) {
  const rel = `run-log/${file}`;
  const timestamped = RUN_LOG_NAME.test(file);
  if (!timestamped && !LEGACY_RUN_LOG_NAME.test(file)) {
    fail(rel, 'filename must be YYYY-MM-DDTHHMMZ-<work-item-id>-<short-slug>.md (UTC, no colons)');
    continue;
  }
  if (file.length > MAX_FILENAME) {
    fail(rel, `filename is ${file.length} chars; shorten the slug to keep it at most ${MAX_FILENAME}`);
  }
  const fm = parseFrontmatter(readFileSync(join(RUN_LOG_DIR, file), 'utf8'), rel);
  if (!fm) continue;
  for (const k of ['work-item', 'summary']) {
    if (!fm[k]) fail(rel, `frontmatter is missing required field \`${k}\``);
  }
  const when = timestamped
    ? `${file.slice(0, 10)} ${file.slice(11, 13)}:${file.slice(13, 15)}Z`
    : file.slice(0, 10);
  runLogEntries.push({ file, rel, when, ...fm });
}

// --- Assumption ledger ---------------------------------------------------------------------------

const assumptionEntries = [];
for (const file of entryFiles(ASSUMPTION_DIR)) {
  const rel = `assumption-ledger/${file}`;
  if (file.length > MAX_FILENAME) {
    fail(rel, `filename is ${file.length} chars; shorten the slug to keep it at most ${MAX_FILENAME}`);
  }
  const fm = parseFrontmatter(readFileSync(join(ASSUMPTION_DIR, file), 'utf8'), rel);
  if (!fm) continue;
  for (const k of ['status', 'tier', 'claim', 'settles']) {
    if (!fm[k]) fail(rel, `frontmatter is missing required field \`${k}\``);
  }
  if (fm.status && !['open', 'settled'].includes(fm.status)) {
    fail(rel, `invalid status \`${fm.status}\` (expected open or settled)`);
  }
  if (fm.tier && !TIERS.includes(fm.tier)) {
    fail(rel, `invalid tier \`${fm.tier}\` (expected: ${TIERS.join(', ')})`);
  }
  if (fm.status === 'settled' && !fm.outcome) {
    fail(rel, 'status `settled` requires an `outcome` field recording what was found');
  }
  assumptionEntries.push({ file, rel, id: file.replace(/\.md$/, ''), ...fm });
}

if (errors.length) {
  console.error(`\nLedger entry validation FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    '\nRun-log frontmatter: work-item, summary.' +
    '\nAssumption-ledger frontmatter: status (open|settled), tier (measured|demonstrated|derived|assumed),' +
    '\n  claim, settles, and outcome (required once status is settled).' +
    '\nSee .agents/run-log/README.md and .agents/assumption-ledger/README.md.\n',
  );
  process.exit(1);
}

const open = assumptionEntries.filter((e) => e.status === 'open');
const settled = assumptionEntries.filter((e) => e.status === 'settled');

if (CHECK) {
  console.log(
    `Ledger entries valid (run-log: ${runLogEntries.length}, ` +
    `assumption-ledger: ${assumptionEntries.length} [${open.length} open, ${settled.length} settled]).`,
  );
  process.exit(0);
}

// --- Print ---------------------------------------------------------------------------------------

// Assumption ids carry the work item as their second segment (asmp-<id>-<slug>).
const matchesRunLog = (e) => !WORK_ITEM || normaliseWorkItem(e['work-item']) === WORK_ITEM;
const matchesAssumption = (e) => !WORK_ITEM || e.id.split('-')[1]?.toLowerCase() === WORK_ITEM;

const table = (header, rows) => [
  `| ${header.join(' | ')} |`,
  `|${header.map(() => '---').join('|')}|`,
  ...rows.map((r) => `| ${r.join(' | ')} |`),
  ...(rows.length === 0 ? ['', '_None._'] : []),
].join('\n');

const out = [];
if (!OPEN_ONLY) {
  out.push('## Run log', '', table(
    ['When', 'Work item', 'Entry', 'What changed, in one line'],
    runLogEntries.filter(matchesRunLog).map((e) => [e.when, e['work-item'], e.rel, e.summary]),
  ), '');
}
out.push('## Open assumptions — believed, not established', '', table(
  ['Assumption', 'Tier', 'Claim', 'What would settle it'],
  open.filter(matchesAssumption).map((e) => [e.rel, `\`${e.tier}\``, e.claim, e.settles]),
), '');
if (!OPEN_ONLY) {
  out.push('## Settled assumptions', '', table(
    ['Assumption', 'Tier', 'Claim', 'Outcome'],
    settled.filter(matchesAssumption).map((e) => [e.rel, `\`${e.tier}\``, e.claim, e.outcome]),
  ), '');
}
console.log(out.join('\n'));
