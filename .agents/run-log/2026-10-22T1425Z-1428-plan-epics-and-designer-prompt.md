---
work-item: AB#1428
summary: >
  Planned Epics AB#1428 and AB#1429 into Features and Stories/Spikes in ADO, wrote the Epic overviews and
  Feature plans, and created Design AB#1463 with the designer prompt.
---
# Plan Solution Preparation and Purchase Order Management; designer prompt

## What changed

- ADO: set `Custom.epicslug` and a pointer Description on Epics AB#1428 and AB#1429; set the slug,
  Description and AC on existing Feature AB#1431. Created Features AB#1432–AB#1437, Stories/Spikes
  AB#1438–AB#1462, and Design AB#1463 under AB#1431 (Description = the designer prompt). All parent links
  were verified from the link responses. Quotation Points and Story Points were set once, at creation.
- Repo: renamed the human brief `solution-preparation/README.md` → `brief.md` so the Epic overview can
  take `README.md`, matching the purchase-order-management folder. Added two Epic overviews, seven Feature
  plans, `docs/prompts/design-system-designer-prompt.md`, five assumption entries and
  `.agents/context/current-focus.md`.

## What surprised you

- `System.Parent` sent as a create field is silently ignored by the ADO MCP create action; parents had to
  be linked with a separate `link` call (as `azure-devops.md` warns).
- The Epics had no Description; their scope lived only in the repo briefs.
- The briefs disagree with each other or with the standards in five places (price-range filter, line-item
  limit, create status, mobile frame width, client folder) — each is an open assumption-ledger entry.

## What you assumed

- AB#1430 "Initialize repository" is already satisfied by the scaffold commits, so it was left un-planned.
- The single Figma audience theme is named "Sales" with a Light-only scheme; `solution/figma.md` is
  human-owned and still needs its file and theme tables filled once the Figma file exists.
