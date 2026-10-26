---
work-item: AB#1463
summary: >
  Built the Sharp ERP design system (variables, styles, 35 icons, 67 main components) and all 55 core
  screen frames in the Skerp Figma file, and recorded the handover in the item spec.
---
# Design system and core screens in Figma

## What changed

- **Figma file** `Skerp` (`yzLk80i2s6D2NaP0CO0Irc`), supplied by the operator:
  - the eleven pages the designer prompt names;
  - a Primitives collection and a Color collection (mode `Light`), with scopes and WEB code syntax;
  - 14 text styles bound to the type-scale variables, and 4 effect styles;
  - 35 icons and 67 main components, each with state guidelines on its page;
  - a Foundations page and a Sales (Light) showcase;
  - 55 screen frames: Welcome, the purchase-order list (11 states), the create modal (12 states) and the
    edit modal (2 states) at 1400 and 576, plus the list at 992 and 768.
- **Repo:**
  - the item spec with the handover
    ([`design-system-and-core-screens/spec.md`](../specs/epics/solution-preparation/features/development-preparation/design-system-and-core-screens/spec.md));
  - a link to it from the Development preparation Feature plan;
  - the assumption entry `asmp-1463-tabular-figures`.

## What surprised you

- The operator sent the file link after the build had started. A draft file
  (`3T1T4aetiV6VqF4Wzu60dW`) holding only pages and variables was left in the operator's Figma drafts.
  The tools cannot delete files, so a human deletes it.
- Instances placed inside a Figma slot sometimes render at their old width, although the layer reports the
  new one. Toggling each FILL instance to FIXED and back forces a relayout; this was run over every screen
  frame.
- An empty auto-layout frame used as a spacer hugs to 100px tall, which inflated the mobile order cards
  until the spacers were fixed at 1px.
- The plugin API cannot set OpenType features, so tabular figures need a manual step (see the assumption
  entry).
- The scaffold's `.agents/scripts/`, skills, standards and hooks are not in this checkout (they are
  git-ignored). Running `verify.mjs` from a temporary copy of the Grimoire-Init scaffold passed the
  CLAUDE.md mirror check and failed four checks that need the missing scaffold: the skills mirror, the ADR
  index, the standards index, and the ledger index. The ledger check also rejects the run-log filename
  pattern (`YYYY-MM-DDTHHMMZ-…`) that all four entries in this repo use, which suggests version drift
  between this repo and the current scaffold. `sync-scaffold` is the job that reconciles this.

## What you assumed

- The variant vocabulary is strict, so status pills, popup kinds and read-only fields became separate
  masters rather than extra variant axes. The spec lists every decision the prompt did not cover.
- The table appears from lg (992px) and the header menu from md (768px); the MD and LG list frames show
  these change points.
- Nunito Sans has tabular figures (load-bearing for aligned totals) — recorded as
  `asmp-1463-tabular-figures`.
