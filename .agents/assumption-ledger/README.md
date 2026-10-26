# Assumption ledger

Every **load-bearing** thing that had to be assumed — a claim another decision depends on — with its
evidence tier and what would settle it. Written **during** the work.

Tiers are defined in [`../adrs/README.md`](../adrs/README.md) — *Evidence tiers*:
`measured` · `demonstrated` · `derived` · `assumed`.

Four rules give entries here their force:

1. **An `assumed` claim may not constrain a design.** It may only generate a Spike (or an
   Analysis/Spike-equivalent probe). This is why open entries are read first — see *Finding entries*.
2. **Only load-bearing claims belong here.** Logging prose is theatre, which is worse than nothing.
3. **If an `assumed` claim cannot be resolved within the current scope, raise a Blocker** rather than
   deciding around it.
4. **Verify a surprising result before reporting it** — including results from your own instruments.

**Append-only.** An entry is settled by *evidence*, not by time passing. Settling one means changing its
file's `status:` to `settled` and adding an `outcome:` — never deleting it or its history. A disproven
assumption is one of the more valuable things in this ledger; it is the record of something believed and
tested.

## One file per assumption, no index

Name each entry `asmp-<id>-<short-slug>.md`, where `<id>` is the ADO work item it arose under (or a
zero-padded sequence number for work outside one). The filename is a **stable id** — ADRs, specs and the
context pack link to it — so it is never renamed, including on settling. Status lives in frontmatter:
`status`, `tier`, `claim`, `settles`, and `outcome` once settled — see [`TEMPLATE.md`](TEMPLATE.md).

There is deliberately **no committed index** (`.agents/assumption-ledger.md` was retired): a shared,
regenerated table conflicted on every PR. The gate (`node .agents/scripts/ledgers.mjs --check`) validates
every entry's frontmatter, and fails if the old index file reappears.

## Finding entries

```bash
node .agents/scripts/ledgers.mjs --open              # open assumptions — read before designing anything
node .agents/scripts/ledgers.mjs                     # open and settled tables
node .agents/scripts/ledgers.mjs --work-item 941     # one work item
grep -l "^status: open" .agents/assumption-ledger/*.md   # open entries, without node
```
