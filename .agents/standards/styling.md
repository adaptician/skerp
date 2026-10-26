---
title: Styling Standards
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Writing CSS-based styling in any client application.
disposition: >
  mechanise — a stylelint configuration once a client project exists; this is the standard the
  Delivery Loop trial found least mechanised in practice, so treat it as the first candidate.
last-reviewed: 2026-10-02
---
# Styling Standards

These standards apply to all client applications that use CSS-based styling. Platform-specific implementation details (file structure, tooling integration) are in the relevant platform standard under `.agents/standards/technologies/` (for example `angular.md`).

---

## Preprocessor

**SCSS** is the standard preprocessor for this project. LESS is not used. SCSS is a strict superset of CSS, integrates natively with Angular's build toolchain, and is the convention used by Angular Material and most Angular-ecosystem component libraries.

SCSS variables use the `$` prefix: `$cornflower-blue: #6495ED`.

---

## Design Token Architecture

When designs live in Figma, the conventions in
[`technologies/figma.md`](technologies/figma.md) govern how designs are read,
referenced in specs, and kept in sync with code.

Styling is organised as three distinct layers. Each layer has a defined role; each layer references only the layer below it. Skipping layers — for example, using a raw hex value directly in a component — breaks the chain and defeats the purpose of the system.

```
Layer 1 — Primitives    SCSS named variables          $cornflower-blue: #6495ED
Layer 2 — Semantics     CSS custom properties         --color-primary: #{$sky-surge}
Layer 3 — Components    CSS custom properties         --button--primary__background: var(--color-primary)
```

### Layer 1 — Primitives

Named SCSS variables that give human-readable names to raw values. Colour names can be sourced from tools like [coolors.co](https://coolors.co/colors) to obtain palette-friendly names. These variables exist solely to avoid repeating hex codes and to give raw values a name that can be referenced meaningfully.

```scss
// _colors.scss
// Named colours
$cornflower-blue: #6495ED;
$pale-sky:        #B9D9EB;
$sky-surge:       #00B9E8;
$black:           #0D0D0D;
$black-muted:     #3A3A3A;

// Palette aliases — map intent to named colours
$color-primary:   $sky-surge;
$color-secondary: $cornflower-blue;
$color-tertiary:  $pale-sky;
```

Layer 1 is entirely SCSS — it compiles away at build time. It never appears in the browser's computed styles. Its sole purpose is to eliminate magic hex values from everything above it.

The exact colour names are design-driven and are not rigidly enforced by this standard. What is enforced: every raw value that is used in more than one place must be a named Layer 1 variable. No hex codes appear in Layer 2 or Layer 3.

### Layer 2 — Semantics

CSS custom properties that map palette aliases to their role in the UI. These are declared inside theme selectors (`:root` for the default theme, `[data-theme="dark"]` for overrides). This is where theming lives — a change here propagates to every component that uses the token.

```scss
// _themes.scss

// Default theme (light)
:root {
  --color-primary:         #{$color-primary};
  --color-primary-hover:   #{$color-primary-slighted};
  --color-secondary:       #{$color-secondary};
  --color-text:            #{$black};
  --color-text-muted:      #{$black-muted};
  --color-border:          #{$pale-sky};
  --color-success:         #{$fern-green};
  --color-warning:         #{$golden-rod};
  --color-error:           #{$persian-red};

  --border-width:          2px;
  --border-radius:         4px;
  --border-radius-round:   8px;
  --border-radius-pill:    999px;
}

// Dark theme overrides — only properties that differ from the default
[data-theme="dark"] {
  --color-text:            #{$white};
  --color-text-muted:      #{$white-muted};
  --color-border:          #{$black-muted};
}
```

**Why CSS custom properties, not SCSS variables?** SCSS variables resolve at build time; they cannot change at runtime. CSS custom properties are inherited and can be overridden by a `[data-theme]` attribute without any JavaScript beyond toggling the attribute. The combination — SCSS variables at Layer 1, CSS custom properties at Layers 2 and 3 — uses each tool for what it is suited to.

**`:root` as the default, unless otherwise specified or approved.** Define the full token set in `:root` for the default light theme, with dark (or any other) theme expressed as `[data-theme="dark"]` overrides only. This is the default theming strategy for any client that needs theme support at all — depart from it only with an explicit reason, agreed with a human, not as a per-component choice. It means the application is correctly styled even if no `data-theme` attribute is set, and each theme file carries only the diff from the default rather than the full duplicated set.

**Every app renders correctly on a device set to light.** An app styled only for dark, with no light fallback, looks broken on a light-default device even when it works. So:

- **The base `:root` always carries a complete, working light token set.** No themed token is undefined in light.
- **Every themed token has a `:root` default.** A token declared only under a theme selector (for example a token declared only under an audience-theme selector) fails this rule.
- **A dark-only design locks its scheme explicitly** — `color-scheme: dark` plus explicit tokens under the theme selector — and never depends on `prefers-color-scheme` or a device default for its colours.

*Scheme* (light/dark) and *theme* (an audience brand, where the solution has more than one) are separate axes. In this standard `[data-theme]` selects a scheme. An audience theme may use its own attribute and follows the same three rules.

### Layer 3 — Components

CSS custom properties scoped to a specific component. These reference Layer 2 semantic tokens via `var()`. Component tokens insulate the component from changes to the semantic palette — if `--color-primary` changes meaning across a rebrand, the component token continues to say what it is, not what value it holds.

**Every interactive control's tokens must cover default, hover, and disabled at minimum** (`focus`/`active` where the platform distinguishes them) — see `.agents/standards/design.md` → *Interactive Control States Are Not Optional*. A component missing a hover or disabled token is missing a state, not omitting one by design; treat it as a gap to raise, not a value to invent.

Component token naming follows **BEM** structure — block, element, modifier — adapted to CSS custom property syntax:

```
--{block}--{modifier}__{element}--{state}
```

- **Block** — the component (`button`, `input`, `card`, `modal`)
- **Modifier** — the variant (`primary`, `secondary`, `danger`) — optional, omit when the block has no variants
- **Element** — the part of the component being styled (`background`, `text`, `border`, `icon`, `shadow`)
- **State** — the interaction or condition (`hover`, `focus`, `disabled`, `active`) — optional

```scss
// _button.scss

// Declare component tokens with their semantic defaults
:root {
  --button--primary__background:          var(--color-primary);
  --button--primary__text:                var(--color-text-on-primary);
  --button--primary__border:              transparent;
  --button--primary__background--hover:   var(--color-primary-hover);
  --button--primary__background--disabled:var(--color-primary-muted);
  --button--primary__text--disabled:      var(--color-text-muted);

  --button--secondary__background:        transparent;
  --button--secondary__border:            var(--color-primary);
  --button--secondary__text:              var(--color-primary);
}

// Component styles reference only their own tokens
.button--primary {
  background:    var(--button--primary__background);
  color:         var(--button--primary__text);
  border-color:  var(--button--primary__border);

  &:hover {
    background: var(--button--primary__background--hover);
  }

  &:disabled {
    background: var(--button--primary__background--disabled);
    color:      var(--button--primary__text--disabled);
    cursor:     not-allowed;
  }
}
```

The `__` and `--` delimiters are consistent with BEM. The property prefix `--` means the modifier delimiter appears as `--{modifier}` immediately after the block, which results in three consecutive hyphens at the start of a property name with a modifier (e.g. `--button--primary`). This is a known visual artefact of applying BEM to CSS custom property names; the structure is what matters, and consistency makes it scannable once familiar.

---

## File Organisation

```scss
src/styles/
├── _breakpoints.scss     ← Compile-time SCSS variables for responsive breakpoints (see below)
├── _colors.scss          ← Layer 1: primitive named values (palette)
├── _themes.scss          ← Layer 2: semantic tokens in :root and [data-theme] selectors
├── _typography.scss      ← Layer 2: font, size, weight, line-height tokens
├── _spacing.scss         ← Layer 2: spacing and layout tokens
├── _reset.scss           ← Base reset / normalisation
├── _mixins.scss          ← Shared SCSS mixins
├── _buttons.scss         ← Layer 3 tokens and base styles for all button variants
├── _inputs.scss          ← Layer 3 tokens and base styles for input elements
├── _forms.scss           ← Layer 3 tokens and form layout/structure styles — generic form
│                            elements only (inputs, form groups, checkboxes, radios, form layout);
│                            styles specific to one custom input/checkbox component live with that
│                            component instead
├── _pages.scss           ← Page-container and site-wide layout structure — desktop margins, the
│                            flex column/row patterns behind general responsiveness, main/section
│                            element styling, and generic table/grid/row styling
└── styles.scss           ← Root stylesheet: imports all partials above

src/app/features/<feature>/
└── <component>.component.scss  ← Component styles; feature-specific overrides and contextual variations
```

Partials use the `_` prefix convention. The root `styles.scss` imports all global partials. Component styles are co-located with the component file.

**Global partials vs component stylesheets.** `src/styles/` partials define the shared baseline — the Layer 3 tokens and SCSS rules that govern how an element looks everywhere it appears. A component stylesheet is for feature-specific variations or contextual adjustments that do not belong in the global baseline. If a change should affect every button in the application, it belongs in `_buttons.scss`. If it is specific to how a button behaves inside one feature's layout, it belongs in the component stylesheet. Changing a global partial should read as a site-wide change — increasing a heading's font size, switching the body font, making a colour more vivid; a specific or specialised style does not belong there.

The files listed above are present in most client applications. Additional global partials (e.g. `_cards.scss`, `_modals.scss`, `_tables.scss`) should be added as the design warrants, following the same pattern. The number of global partials reflects the scope of the design system, not a fixed list.

**Keep these files aligned with the design system or Figma file** — see `.agents/standards/design.md` → *Keep Design Tokens and Figma Variables in Lockstep*. When a design variable changes, updating the matching codebase variable should be the entire job.

---

## Styling Framework-Owned Components

A framework-owned component is one the solution does not author: a stock screen of an application framework, or markup that a UI library such as Bootstrap renders. When it needs the same styling on more than one screen, **share at token level.** Set the library's custom properties (for example Bootstrap's `--bs-*`) and this solution's semantic tokens once, globally or for the theme scope, so that every instance picks them up.

Do not copy a scoped rule into each screen's stylesheet. Per-component selector CSS against a stock component's DOM (`:has()`, `!important`, element and class chains) is not a way of sharing. It stays an approval-only exception, recorded with the package and version it depends on. When tokens cannot reach the design, raise it and choose the next least invasive mechanism (a supported extension point or override) with a human.

---

## Responsive Breakpoints

**The default breakpoint scale is mandated, not chosen per solution.** Unlike the font-size scale
below (which is genuinely brand-specific and always needs confirming), breakpoints are a solved
problem — use the widely-recognised five-tier scale below as the baseline for every solution:

| Variable | Width | Roughly targets |
|---|---|---|
| `$breakpoint-sm` | `576px` | Landscape phones |
| `$breakpoint-md` | `768px` | Tablets |
| `$breakpoint-lg` | `992px` | Small desktops / laptops |
| `$breakpoint-xl` | `1200px` | Desktops |
| `$breakpoint-xxl` | `1400px` | Large desktops |

Depart from these exact values only for a documented reason (record it in
`.agents/standards/solution/styling.md` as a solution-specific overlay per
`.agents/standards/solution/README.md`) — never silently, and never per-component.

Breakpoints are always declared as **compile-time SCSS variables**, never as CSS custom properties — a standard CSS `@media` condition cannot consume a custom property, so a Layer 2 token would simply not work here. Declare them once, centrally, in `_breakpoints.scss`:

```scss
// _breakpoints.scss
$breakpoint-sm:  576px;
$breakpoint-md:  768px;
$breakpoint-lg:  992px;
$breakpoint-xl:  1200px;
$breakpoint-xxl: 1400px;
```

Never hard-code a pixel value inside a `@media` query, and never hard-code a hex value in place of a Layer 1 colour — both scatter values that must later be found and changed everywhere they were copied. Reference the variable instead.

**These are also the exact widths a Figma design's responsive frames must use** — see
`.agents/standards/design.md` → *Breakpoint Frames Must Match the Code Scale, Pixel for Pixel*.

**Nest each breakpoint's media rule inside the selector it affects**, rather than grouping media queries by breakpoint in a separate block elsewhere in the file. Every rule that affects a given class then lives in one place:

```scss
.sample-class {
  // Default styles — apply at the smallest (mobile) size
  display: flex;
  flex-direction: column;
  width: 1rem;
  height: 100%;
  color: $cherry-blossom;

  // Nested media rules for .sample-class stay right here, so it is easy to find
  // everything that affects this class in one place.
  @media (min-width: $breakpoint-sm) {
    width: 1.2rem;
  }

  @media (min-width: $breakpoint-md) {
    width: 1.5rem;
  }

  @media (min-width: $breakpoint-lg) {
    flex-direction: row;
    width: 1.8rem;
  }
}
```

Each successive breakpoint's rules are designed to override what came before as the viewport grows — mobile-first, ascending `min-width`.

---

## Typography Scale

`_typography.scss` should express font sizes as a deliberate, ascending scale of named SCSS
variables (e.g. `$font-size-xs` through `$font-size-2xl`) feeding the Layer 2 typography tokens,
covering at minimum `h1`–`h4`, body text, and `p` — not a set of ad hoc sizes invented per
component. This lets a responsive type rule step through the scale predictably at each breakpoint
rather than inventing a new value each time. See `.agents/standards/design.md` → *Font-Size
Hierarchy* for confirming the scale's minimum and maximum with the designer before generating it.

---

## Theme Switching

Theme switching is implemented by toggling the `data-theme` attribute on the document root element (`<html>` or `<body>`). No stylesheet swaps, no class changes, no JavaScript style injection — the CSS custom property cascade handles everything.

```typescript
// theme.service.ts
setTheme(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme);
}
```

The current theme preference should be persisted (local storage or user profile) and applied before first render to prevent a flash of the default theme.

---

## Rebranding

Changing the brand colour palette requires only Layer 1 changes (`_colors.scss`) and, where palette roles change, Layer 2 changes (`_themes.scss`). Layer 3 component tokens and component styles are untouched. This is the intended path — validate it holds by ensuring no hex values appear outside `_colors.scss`.

---

## Multi-Platform Token Sharing (Flutter — Future Consideration)

CSS custom properties are a web-only construct; Flutter's theming uses Dart `ThemeData`. If a project includes both a web client and a Flutter mobile application, the Layer 1 and Layer 2 token definitions represent a shared design contract that both platforms need to express.

In that scenario, investigate **Style Dictionary** (Amazon Open Source) — a tool that takes design tokens defined once in JSON and generates platform-specific outputs: SCSS variables for web, Dart constants for Flutter, iOS Swift, and others. The SCSS token files in this project could be replaced by Style Dictionary output without changing the architecture above.

This is a project-level architectural decision and should be captured as an ADR at the point it becomes relevant. Do not pre-emptively restructure for Style Dictionary unless Flutter is confirmed in scope.

---

## See also

- `.agents/standards/design.md` — interactive-state requirements, the design-to-code reuse review, and Figma variable alignment that this file's token architecture supports.
- `.agents/standards/client.md` — component reuse and the refactor-vs-duplicate decision framework.
- `.agents/standards/technologies/angular.md` — the concrete `common/` vs feature-local file placement for Angular.
