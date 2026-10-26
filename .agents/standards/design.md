---
title: Design and Design-to-Code
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Creating or reviewing a UI design (Figma or otherwise), or implementing a design in code.
disposition: >
  keep — whether a design covers its required states, and whether an implementation reused what
  already existed, are judgement calls a reviewer makes; the CSS-level token structure they rest on
  is separately tracked as mechanise in styling.md.
last-reviewed: 2026-10-07
---
# Design and Design-to-Code

This file governs the handoff between a design (typically a Figma file) and its code
implementation. `.agents/standards/client.md` and `.agents/standards/styling.md` own what the
resulting code looks like; this file owns what must be true *before* implementation starts and
*while* a design is being authored.

---

## Interactive Control States Are Not Optional

Every interactive control — a button, input, checkbox, select, radio, toggle, or similar — must
define **default, hover, and disabled** variants, deliberately and consistently, across the whole
solution. Add **focus** and **active** variants wherever the control's platform makes them
distinguishable from hover. This is the expected baseline unless a specific control has been
**deliberately** stated otherwise (e.g. a control that is genuinely never disabled in this
solution's flows) — silence on the subject is not that statement.

**When authoring or reviewing a Figma design**, these variants are expected to exist on the
component before it is considered ready for implementation. Use the
`figma-generate-library` skill (or whichever Figma skill fits the task at hand) to build variant
sets with proper states rather than a single static frame per control.

**When implementing from a design**, treat a missing state as a gap in the design, not a decision
for the agent to make. **Do not guess a hover or disabled treatment that was not specified** — a
guessed state that later conflicts with the design system creates rework and inconsistency exactly
where consistency matters most. Raise the absence to the operator and get the missing state defined
before implementing the control, the same way an `assumed` load-bearing claim would be raised rather
than resolved unilaterally (see `.agents/assumption-ledger/TEMPLATE.md`).

At the CSS level, these states are always expressed as component tokens per
`.agents/standards/styling.md` → *Layer 3 — Components* (`--button--primary__background--hover`,
`--button--primary__background--disabled`, and so on) — never as one-off values inline in a
component's stylesheet.

---

## Review Before You Build

Before implementing any design — a new screen, a new component, a restyle — review what the
solution already has. Implementing in isolation, without checking what exists, is how the same
button gets rebuilt three different ways across a solution. This is the UI-specific case of a
general rule that applies to every work item and every layer, not only design-to-code — see
`.agents/standards/agent-workflow.md` → *Reuse, Duplication, and When to Refactor* for the full
mindset (it applies during Analysis and Design too, not just implementation) and the benefit/risk
decision framework.

1. **Look for an existing component or style that already does this**, or is close enough to
   extend. See `.agents/standards/client.md` → *Screen vs Component Architecture* and *Reusable
   Elements* for the test ("can this be described independently of where it currently lives?") and
   for the framework-specific shared-location convention (e.g. `src/app/common/` in
   `.agents/standards/technologies/angular.md`).
2. **Before creating a new generic style or component, ask whether it is actually generic** — will
   it plausibly be reused elsewhere, or is it specific to the page/feature at hand? A component
   built to fulfil one page's design is not automatically a candidate for `common/`; a component
   that animates a button click with a generic gleam effect plainly is. When genuinely unsure,
   build it feature-local — promotion is cheap; premature generalization that guesses wrong is
   not. *When to Promote* below says when "later" arrives.
3. **Where an existing component is first-of-a-kind, feature-local, and could easily become
   generic**, weigh promoting and reusing it against building a duplicate. See
   `.agents/standards/agent-workflow.md` → *Reuse, Duplication, and When to Refactor* for how to
   weigh that decision (including when to ask a human) and what to do with the answer.

### When to Promote: Second Use, Same Source

**The first use stays local, unless the design already made it shared.** An element instanced from
a master on one of the Figma shared master pages (`Components / Icons`, `Buttons`, `Form Inputs`,
`Cards`, `Badges`, `Navigation` or `Shared`) is built shared from its first use. The designer putting it there is the reuse
signal (`.agents/standards/technologies/figma.md` → *Naming convention*). Any other element is built
feature-local at its first use. **The trigger to promote is the second concrete use from the same
design source, in the Story that creates it**, not a later clean-up item.

When a Story needs an element that an existing screen already styles or renders, ask in order:

1. **Is it the same thing in the design?** Same Figma main component, or same variable: presume it
   is shared. Genuinely different look or behaviour: keep them separate and stop here. The design
   has two components for one role: **ask the designer which is canonical**. Do not copy
   design-file duplication into code.
2. **What kind of difference remains?**
   - *Values only, per theme or context*: one global rule, with the difference expressed as tokens
     per theme (`.agents/standards/styling.md` → *Layer 2 — Semantics*).
   - *Content or configuration only*: one component with inputs.
   - *Structure or behaviour*: separate implementations. This is the only case that justifies a
     second one.
3. **Who owns the element?**
   - *The solution*: promote it now, in this Story, to a global partial
     (`src/styles/_<element>.scss`) or a shared component (`app/common/`;
     `.agents/standards/technologies/angular.md` → *Shared / Common Elements*).
   - *A stock framework component*: share it at token level, never by copying
     scoped selectors per screen. See `.agents/standards/styling.md` → *Styling Framework-Owned
     Components*.
   - Promotion would touch a file outside the Story's write surface, or someone's in-flight work:
     **ask a human first.** With even the slightest doubt, ask.

These questions decide whether two occurrences are one element. How to promote it safely
(re-testing the original context) is in `.agents/standards/client.md` → *Reuse, Duplication, and
When to Refactor*.

The outcome, over time, is a solution where styles and components accumulate into a consistent,
reusable library, and custom-built or custom-styled elements exist only where a real design
difference justifies them — not because nobody checked first.

---

## Keep Design Tokens and Figma Variables in Lockstep

The SCSS/CSS variables in `.agents/standards/styling.md` → *Design Token Architecture* should
mirror the solution's Figma variables directly enough that a change to a Figma variable becomes a
straightforward, mechanical update to the matching code variable — not a redesign. When pulling a
design into code, use the `figma-design-to-code` skill (or the relevant Figma
skill) to read the actual variable definitions (`get_variable_defs`) rather than eyeballing pixel
values from a screenshot.

If a Figma file's variables and the codebase's token names have drifted apart, that drift is worth
raising and reconciling deliberately — not perpetuating by adding a second, differently-named
variable for the same value.

**The same holds for components.** A shared code component or global style mirrors a Figma main
component the way a token mirrors a variable. Two occurrences instanced from the same main
component are presumed to be one element in code (see *When to Promote* above). The code slug is
the kebab-case of the component's Figma name (`.agents/standards/technologies/figma.md` → *Naming
convention*: `Button/Primary` → `button-primary`), so each side can be found from the other. Two
main components for one role is design-file duplication: ask the designer which is canonical
rather than building both.

---

## Breakpoint Frames Must Match the Code Scale, Pixel for Pixel

The solution's responsive breakpoints are a mandated default, not a per-solution decision — see
`.agents/standards/styling.md` → *Responsive Breakpoints* for the exact five values
(`$breakpoint-sm` through `$breakpoint-xxl`). When a Figma design needs to show how a screen or
component responds across widths, its frames for those states must be created at **exactly** those
pixel widths — not an approximation, and not whatever width the design tool defaulted to.

This is what makes design-vs-implementation drift visible at a glance: a reviewer can put the
Figma frame and the running application side by side at the same width and expect them to agree.
Frames at arbitrary widths make that comparison meaningless, because any difference could be
explained away as "that's just not quite the same width." If a design genuinely needs a breakpoint
the code scale does not have, that is itself a signal to raise — either the code scale needs a
sixth tier, or the design should be re-expressed within the existing five.

---

## Font-Size Hierarchy

Typography tokens (`.agents/standards/styling.md` → *File Organisation*, `_typography.scss`) should
form a deliberate, logical scale — not an arbitrary set of ad hoc sizes — so that responsive rules
can step through the scale predictably rather than inventing a new value at each breakpoint.

**When building a design system in Figma, ask the designer or operator to confirm the minimum and
maximum font sizes** the scale needs to span before generating the type-scale variables. Guessing a
range and adjusting later means regenerating every derived size and every place that referenced it.

---

## Verifying an Implementation Against Its Design

An implementation matches its design only when it passes all four levels below for every cited frame,
at each breakpoint it ships, in each theme, and on a device set to light. Passing one level tells you
nothing about the others: a nav icon can pass a design → code check, a login screen can look right while
its script never ran, and a missing background can be dismissed as a cache issue.
`design-fidelity-check` → `verify` runs the levels and reports each one.

1. **Tokens.** Every colour, type, spacing and radius value comes from the right token for the right
   theme. Read the frame's bound variables in the target theme's mode (`get_variable_defs`) and compare
   them with the tokens the rendered page computes. A raw literal where the design binds a variable
   fails. So does a token from another theme.
2. **Inventory, both directions.** For each designed region, list:
   - elements the design has that the code lacks;
   - elements the code renders that the design lacks, such as a boilerplate icon, a breadcrumb, a
     footer or stock copy.

   Each difference must be fixed, or be an omission or deviation a human approved before
   implementation and recorded in the plan. Any other difference fails.
3. **Visual.** Compare the Figma frame's screenshot (`get_screenshot`) with a browser screenshot of the
   page at the frame's width. Judge typography, colour, borders, spacing, position and layout. **This is
   a judged comparison, not a pixel diff.** Anti-aliasing, sub-pixel rounding and font rasterisation do
   not fail it on their own. A different type size or weight, a moved or resized element, a changed gap
   or a broken layout does fail it. Compare at each breakpoint, for each theme, and once on a device set
   to light (`.agents/standards/styling.md` → *Every app renders correctly on a device set to light*).
4. **Mechanism.** Behaviour the design depends on is shown to run. Do not infer it from the end state.
   Show that the handler fired, that the default action was prevented where the design needs it, and
   that the request was sent. A page that looks correct but whose script never ran fails.

**No screenshot, no pass.** Level 3 cannot pass without a working screenshot tool, browser or Figma.
Record the limitation. Add a human visual sign-off step to the item's How To Test, or to the field that
does that job on a work-item type without one. The item is not handed off as verified until a human has
signed it off.

This bar governs design verification in this solution. If a Figma skill asks for something else, this
bar wins. For example, `figma-design-to-code` says the result "MUST visually match" the design
screenshot. See `.agents/standards/technologies/figma.md` → *Direction-specific workflows and skills*.

---

## See also

- `.agents/standards/agent-workflow.md` → *Reuse, Duplication, and When to Refactor* — the general,
  layer-agnostic reuse mindset and benefit/risk decision framework this file's UI-specific version
  specialises.
- `.agents/standards/client.md` — component reuse, screen/component architecture, the refactor
  decision framework.
- `.agents/standards/styling.md` — the CSS token architecture, file organisation, and theming these
  rules assume.
- `.agents/standards/technologies/angular.md` — the concrete `common/` vs feature-local placement
  convention for Angular.
- `.agents/assumption-ledger/TEMPLATE.md` — how to record a load-bearing gap (like a missing design
  state) rather than guessing past it.
- `.agents/context/azure-devops.md` → *Design — precedes Story pickup, human closes it* — this is
  what points an agent picking up a Design work item back to this file in the first place.
