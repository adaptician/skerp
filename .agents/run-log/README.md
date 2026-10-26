# Run log

One entry per milestone, or per single-unit work item where there are no milestones. Written **during**
the work, not after — a retrospective note is written once the surprise has been rationalised, which is
why retrospectives under-report.

Each entry records three things: **what changed**, **what surprised you**, and **what you assumed**.
Load-bearing assumptions also get a graded entry in [`../assumption-ledger/`](../assumption-ledger/README.md)
— the run log says what happened, the ledger says what is still being taken on faith.

**Append-only.** Correct an entry by appending to it, not by rewriting history. The value of this log is
that it records what was believed *at the time*.

## One file per entry, no index

Name each entry `YYYY-MM-DDTHHMMZ-<work-item-id>-<short-slug>.md`, e.g.
`2026-10-05T1430Z-941-login-lookup-endpoint.md`:

- **Time is UTC, with no colons** — colons are illegal in Windows filenames. Zero-padded ISO order means
  the directory listing *is* the chronological view.
- **`<work-item-id>`** is the ADO id without `AB#`, or `adhoc`.
- **The slug is a concise, searchable summary.** Rename it freely before merge; never after.
- **The whole filename is at most 90 characters** — worktree paths are already deep, and Windows' path
  limit is real.

Frontmatter carries `work-item` and `summary` — see [`TEMPLATE.md`](TEMPLATE.md). Entries written before
the time component was added (`YYYY-MM-DD-<id>-<slug>.md`) stay as they are; they sort before any
timestamped entry from the same day.

There is deliberately **no committed index** (`.agents/run-log.md` was retired): a shared, regenerated
table conflicted on every PR, while the entry files themselves never collide. The gate
(`node .agents/scripts/ledgers.mjs --check`) validates every entry's name and frontmatter, and fails if
the old index file reappears.

## Finding entries

```bash
node .agents/scripts/ledgers.mjs                     # full table: when, work item, entry, summary
node .agents/scripts/ledgers.mjs --work-item 941     # one work item
grep -lE "^work-item: (AB#)?941$" .agents/run-log/*.md   # same, without node (both id forms are in use)
grep -ril "nullreference" .agents/run-log/            # full-text search across entries
git log --diff-filter=A --name-only -- .agents/run-log/   # entries in the order they merged
```
