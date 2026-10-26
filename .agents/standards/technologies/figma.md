---
title: Figma
tier: 2
enforced-by: [prose-only]
applies-when: >
  The project uses Figma for design — reading designs during feature work, or creating/updating designs.
disposition: >
  reference — this is consult-on-demand guidance for a design tool, not a rule a static check can
  enforce; the source-of-truth discipline it describes is a review-time judgment call. The screen
  index it defines is the part that becomes mechanical (`check-screen-index.mjs`, run by `verify.mjs`).
last-reviewed: 2026-10-07
---
# Figma

Conventions for working with Figma designs. This file specialises `styling.md`
(design tokens and theming), `client.md` (screens and components), and the planning
workflow defined in `.agents/specs/README.md` and `.agents/standards/plans.md`. It
applies whenever the project uses Figma — for reading designs during feature work or
for creating and updating designs. Its presence is not a decision to use Figma.

**Solution bindings live in [`solution/figma.md`](../solution/figma.md)**: which Figma
file governs which app, and the screen index this file refers to. Read both.

## Sources of truth

Figma is the source of truth for **look and feel**; the repository is the source of
truth for **behavior**. The two must not drift: when implementation insight changes a
design (a control is removed, copy changes, a token is corrected), the Figma file is
updated in the same piece of work, and when a design changes, the affected code is
scheduled for alignment. Stale on either side is a defect, not a curiosity.

## When the design lookup applies

**Any work item with a UI surface** — a screen, component, email, or any change a user
can see — looks up its design, whatever its type (Design, User Story, Spike, Bug,
Refactor) and **whether or not the item or prompt mentions Figma**. Applicability is
decided by the work, never by the wording. Where to look is in
[`solution/figma.md`](../solution/figma.md) and
[`.agents/context/azure-devops.md`](../../context/azure-devops.md) → *Where the Figma
project lives*; never use a different Figma file for an app than the one named there.

## No design, no build

- **Exported frames supplied by a human** are an acceptable hand-off. Record in the plan
  which frames were supplied and by whom.
- **No design access and no exported frames** (the Figma connector is missing, disconnected
  or unauthenticated): **stop** and ask for the connection to be restored or for exported
  frames. Never proceed from a text description of the design — ADO text included — unless a
  human explicitly approves proceeding without designs; record that approval in the plan. If
  approval is not given, stop and ask for designs.
- **Design access, but the design is missing** (a cited node does not exist live, or the
  governing file has no design for the feature): **stop and raise the gap**. Do not
  substitute a similar screen, a different file, or prose. A frame's absence from the screen
  index is not by itself a missing design — see *Screen index*.
- **Stock framework screens.** A screen a framework or template ships pre-built, which the solution has
  explicitly accepted as stock (recorded in [`solution/figma.md`](../solution/figma.md)), is not a
  missing design. Where no such decision is recorded, a human confirms per screen that it is accepted
  as stock, and the confirmation is recorded in the plan.

Prose UI intent (surfaces, states, interactions described in the plan) is allowed only
after a human has approved proceeding without a design.

## Approval — Ready for dev

**A frame is approved for implementation only when a human has marked it Ready for dev**
in Figma's Dev Mode. That per-frame mark is the approval signal; marking is a human
decision.

**Agents cannot read the mark.** No Figma MCP read path exposed Ready-for-dev status
when it was measured (`use_figma` blocks `node.devStatus`; `get_metadata` and `get_design_context`
return no status). Re-measure before relying on this if the Figma MCP server changes, and record the
result in the assumption ledger.
So the human who marks a frame Ready for dev **also records the approval on that frame's
screen-index entry** (format in [`solution/figma.md`](../solution/figma.md)).

- **Indexed frames:** build **only** from frames whose index entry records approval. If a
  cited frame's entry does not record approval, **ask a human** whether it is marked Ready
  for dev. If they confirm, record the confirmation in the plan (who, when, which frame) and
  set the entry's approval — an agent may write the approval field **only** for a frame a
  human names as approved in the session.
- **Frames not yet in the index** (a frame whose file or page has not been migrated to the naming
  convention yet, and every frame of a file the index does not list): a human
  confirming in the session that the frame is marked Ready for dev counts as approval; record
  who, when and which frame (by URL and node ID) in the plan. Do not add index entries for
  frames whose names do not yet follow the naming convention below.
- If a human does not confirm approval, **stop and raise it**: never build from a draft, and
  never infer approval from ADO text, a Design item's state, or a frame's appearance.
- A Design work item may not close until the frames it delivers are approved (recorded in
  the index, or confirmed and recorded in the plan for frames not yet indexed). If a Design
  item is `Closed` while a frame it delivers is not approved, stop and raise it — see
  `azure-devops.md` → *Design*.

## Screen index

The screen index ([`solution/figma-screen-index.json`](../solution/figma-screen-index.json),
format in [`solution/figma.md`](../solution/figma.md)) is **the only citable source of node
IDs** for the frames it lists.

- Cite an indexed frame by its **index key** with the node ID the index resolves it to,
  written as `` `client/profile/view/desktop` (`123:456`) ``. Never cite a node ID from
  memory, from prose (a spec, a run log, `current-focus.md`), or from an earlier session.
- **A frame not yet in the index** — one not yet migrated to the naming convention, or in a file
  the index does not list — is cited by full URL with `node-id`,
  read live in the same session. Absence from the index is not a missing design.
- Before building, confirm live that each cited node still exists and that its name still
  slugs to its key. **A name that no longer slugs to its key is drift** — stop and raise it.

## Naming convention

**Two axes, never conflated.** *Theme* is the audience brand (for example `Staff`, `Client`); *Scheme*
is the colour scheme (`Light`, `Dark`). A theme may always use one scheme, but they stay separate
axes. The solution's themes are listed in [`solution/figma.md`](../solution/figma.md). Use the
audience's name for a theme in Figma, not an implementation term.

**One separator: ` / `.** Page names and screen frame names separate their parts with a
forward slash between single spaces. Figma already uses `/` for component, style and variable
hierarchies, and the screen index keys use it too, so one separator runs through the whole
file. A `/` with no spaces around it belongs to the part it sits in, which is how component
names use it (`Button/Primary`). The middle dot (` · `) used before 2026-10-07 is retired.

**Fixed page set** (one `Components / <Theme>` and one `Screens / <Theme>` page per theme the solution
defines; the theme names below are examples):

```
🎨 Foundations                  variables, type, spacing, radius (documentation)
🧩 Components / Icons           shared masters: every icon (Icon/*)
🧩 Components / Buttons         shared masters: buttons (Button/*)
🧩 Components / Form Inputs     shared masters: fields and form controls (Field/*,
                                Control/Checkbox), plus their state guidelines
🧩 Components / Cards           shared masters: content cards (surface fill, border, lg radius)
🧩 Components / Badges          shared masters: small non-interactive labels (Feedback/*)
🧩 Components / Navigation      shared masters: page headers, menus, menu items and navigation
                                (Page/*, Header/*, Menu/*, Navigation/*)
🧩 Components / Shared          every other shared master
🧩 Components / <Theme> (<Scheme>)  instances of the shared masters placed in that theme's mode,
                                plus any genuinely theme-only master (e.g. Staff (Dark))
🛡️ Screens / <Theme>            one page per theme (e.g. Screens / Staff, Screens / Client)
🔐 Screens / Auth               pre-login, theme-neutral; states its scheme explicitly
                                (only when the solution has pre-login screens)
✉️ Emails / <Theme>             emails for that theme, if any
🗄️ Archive                      deprecated or superseded; agents ignore it
```

**Shared master pages.** The first seven Components pages (Icons, Buttons, Form Inputs, Cards,
Badges, Navigation and Shared) are the *shared master pages*: structure-only masters bound to semantic
variables, resolving in Light by default. A master goes on the category page for its kind, or on
`Components / Shared` when no category fits. A theme-specific master (e.g. `Staff/Header/App`)
stays on its theme's page even when its kind has a category page. The page groups masters for review; it does not
rename them, so `Feedback/Badge` keeps its name on Badges. A note at the top of each page says
which masters it holds. A component's state rules sit next to its masters, in a frame named
`<Subject> States — Guidelines` (for example `Field States — Guidelines` on Form Inputs).

Each theme's components page declares its scheme; a theme with only a dark design states
"scheme locked, no light variant" so the absence is a decision, not a gap.

**One master, shown per theme.** A component whose structure is shared across themes has
**one** master, on its shared master page; each theme's page holds instances of it inside a
frame set to that theme's variable mode. Only a component that differs *structurally*
between themes gets a theme-specific master, named with the theme prefix and living on that
theme's page.

**Theme is never a variant.** Pick a variant by `State`, `Size` and `Breakpoint` as the screen
design shows them; never by theme. The theme comes from the frame: every screen frame sets the
Color collection to its theme's mode, and every instance inside resolves from it. Read a
component's values from its instance in the target frame (or from the theme's components page),
never from the bare master. A token under `color/review/` is a placeholder whose Light and Dark
values are equal; treat its Dark value as undecided and raise it rather than build from it.

**Component names** use Figma's slash hierarchy: `<Category>/<Name>` for shared masters
(e.g. `Button/Primary`), `<Theme>/<Category>/<Name>` for a theme-specific one (e.g.
`Staff/Header/App`). Variant properties use one vocabulary, in this order:
`State` = Default | Hover | Focus | Disabled | Open | Error; `Selected` = False | True;
`Size` = SM | MD | LG; `Breakpoint` = Desktop | Mobile. `Selected` is the control's "on" value,
not an interaction: a checked checkbox, the active toggle option, the current page. A component
carries only the values its design uses. The code slug is the kebab-case of `<Category>/<Name>`
(e.g. `button-primary`).

**Icons** are `Icon/<Name>` components on `Components / Icons`. Masters and screens use instances,
never loose vectors. An icon binds one default semantic colour; an instance takes its context's
colour by overriding the vector colour with another semantic token (`currentColor` in code). Theme
is never a variant here either. A component that shows a changeable icon exposes an Instance Swap
property (`Button/Icon` → `Icon`), not a variant per icon. Icon vectors scale with the instance.

**Focus variants** keep the resting look and add the focus treatment from the Foundations page
(`color/border/focus` at `border-width/emphasis`, plus the 3px `color/focus-ring`). A control with an
opaque fill carries the `Focus/Ring` effect style, with clip content on. A control without one
(outline buttons, links, unselected options, nav items) draws the same ring as a `Focus Ring`
layer, because Figma renders a shadow spread only under an opaque fill. Both are the same
`box-shadow` in code.

**Screen frame names:** `<Theme> / <Screen> / <State> / <Breakpoint>`, e.g.
`Client / Profile / View / Desktop`, `Auth / Forgot Password / Default / Mobile`. The index
key is the slug of each ` / `-separated segment, joined by `/`
(`client/profile/view/desktop`, `auth/forgot-password/default/mobile`).

**Slug rule** (deterministic, so a check can recompute it): lowercase; each run of spaces
and hyphens becomes one hyphen; every other character (punctuation, including a `/` inside a
segment, parentheses, emoji) is removed; leading and trailing hyphens are trimmed.

Anything that does not follow the pattern is renamed or moved to Archive.

## Reading the file

**Read the latest before working.** Like code, Figma files are edited by multiple
contributors. Always read the current state of the relevant Figma pages at the start of a
session — via screenshots, metadata, or design context from the Figma tooling — before
designing, planning, or implementing against them. Never work from memory, an earlier
session's summary, or exported images checked into the repo (exported frames a human hands
over for the current item are the exception above).

**Retrieval rules:**

- **Enumerate pages with `use_figma`** (`figma.root.children`). Never treat `get_metadata`'s
  page listing (called without a `nodeId`) as a complete inventory — it has been observed to
  list 2 of a file's 5 pages.
- **Query a frame placed in the target theme's mode**, on that theme's page — not the bare
  master on a shared master page, whose values are unresolved for any theme.
- Ignore `Archive`.

If what you find differs unexpectedly from what the plan or your instructions describe —
nodes missing, renamed, restyled, or content that contradicts the requirements — stop and
raise it with a human before proceeding. Do not silently adopt either version.

## Figma in plans

When planning with [`plan-work-item`](../../skills/plan-work-item/SKILL.md) — in the item's
`spec.md`, or in the ADO Description below 5 points:

- **Assert design availability.** State explicitly whether a design exists for the item, per
  *When the design lookup applies*. If it does, cite it; if it does not, apply *No design, no
  build*. Silence about designs is not acceptable.
- **Include reference points.** Name the Figma file (by its entry in
  [`solution/figma.md`](../solution/figma.md)) and cite each frame by index key and resolved
  node ID, so any contributor can deep-link straight to it. Reference the governing design
  system the same way.
- **Plan design work as work.** Updates, refinements, or corrections to the Figma files the
  item requires — including drift found while researching — are planned in the spec (or ADO)
  exactly like code changes. Figma edits made during planning or implementation are recorded
  in the item's run-log entry (which nodes, what changed, why).

## Drift and divergence

- **Small drift** (a token value, a copy string, one element out of date): fix it in
  the correct direction as part of the current work and record it in the item's run-log
  entry.
- **Significant divergence** — the design and the code have drifted far enough that
  aligning them would constitute a refactoring effort: do not unilaterally align
  either side. Summarise the findings (what diverged, when, the cost of each
  direction) and run a [`grill-me`](../../skills/grill-me/SKILL.md) session with a human to
  decide the direction, scope, and sequencing of the alignment.

## Design systems

A design may be governed by a design system living in the same Figma project or in a
separate one; when several projects derive from one design system, it is usually
separate. Identify which design system governs before any styling work — for this
solution, [`solution/figma.md`](../solution/figma.md) says which — and read token values
from the design system, not from possibly-stale library copies inside the consuming file.
When a consuming file's library copy is stale, raise it — library version bumps are
performed by a human in the Figma UI.

Treat a design system like a shared library: it may be consumed by other designs and
other projects. **Do not edit a design system as part of a work item without explicit
human approval**, and record the approval and the change in the item's run-log entry.
Additions and corrections that only affect the item's own file do not need this approval
(beyond the normal drift rules above).

## Direction-specific workflows and skills

Load the relevant skill before touching the tools — each encodes failure modes that
are expensive to rediscover. These skills ship with the **Figma plugin / Figma MCP server**
(`skill://figma/<name>/SKILL.md`), not with this repo:

| Skill | Use when | Note |
|---|---|---|
| `figma-use` | Any script execution against a Figma file (`use_figma`) | **Mandatory before every `use_figma` call** — reads and writes |
| `figma-design-to-code` | Implementing a Figma design as code | **Mandatory before `get_design_context`.** Its "visually match" target means the verification bar in `design.md`, not a pixel match |
| `figma-generate-design` | Creating or updating a page/screen/layout in Figma from code or prose | Load alongside `figma-use` |
| `figma-generate-library` | Building or extending a design system or any component in Figma | Load alongside `figma-use` |
| `figma-code-connect` | Mapping Figma components to code components | Keep mappings current as components land |

**Design → code:** read the live design and the governing design system first;
implement from named design tokens, never eyeballed values; verify the result against
the four-level bar in [`design.md`](../design.md) → *Verifying an Implementation Against Its
Design*, which supersedes the skill's pixel-match mandate for this solution; and feed corrections
*back into Figma* rather than diverging quietly.

**Code → design** (a session dedicated to creating or updating Figma designs, driven
by prose, prompts, or existing code): read the current file state first, reuse the
governing design system's components and variables rather than drawing ad-hoc
elements, work incrementally with visual verification (screenshots) after each step,
and record the node IDs of what was created or changed — in the screen index for screen
frames — so plans can reference them.

Design edits follow the same review sensibility as code: verify after every change,
keep changes scoped to the stated intent, and record what changed and why.
