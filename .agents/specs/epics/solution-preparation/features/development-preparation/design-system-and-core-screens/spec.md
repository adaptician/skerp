# Design system and core screens — Design spec (AB#1463)

Design item under Feature AB#1431 *Development preparation* (Epic AB#1428), slug
`design-system-and-core-screens`, 8 points. The scope is the designer prompt
[`docs/prompts/design-system-designer-prompt.md`](../../../../../../../docs/prompts/design-system-designer-prompt.md),
which is also the item's ADO Description. This spec records what was built and the handover the prompt
asks for. Stakeholder approval (Ready for dev) is still outstanding.

## Acceptance

- **Given** the Figma file, **when** a developer opens it, **then** it has exactly the eleven pages the
  prompt names, a Primitives and a Color (`Light`) variable collection, text styles for every step of the
  confirmed type scale, and Elevation and `Focus/Ring` effect styles.
- **Given** any main component, **when** it is inspected, **then** it binds semantic variables only, its
  variant properties use only `State`, `Selected`, `Size` and `Breakpoint`, and every interactive control
  has Default, Hover, Focus and Disabled (plus Open or Error where it applies), or a written reason why not.
- **Given** the `🛡️ Screens / Sales` page, **when** a reviewer compares it with the prompt's *Screens*
  section, **then** every listed screen and state exists at 1400px and 576px, built from component
  instances, named `<Theme> / <Screen> / <State> / <Breakpoint>`, with the Color collection set to `Light`.
- **Given** the design, **when** text and UI boundaries are measured, **then** they meet WCAG 2.2 AA
  (see *Contrast* on the Foundations page).

## Delivered

| | |
|---|---|
| File | `Skerp` — <https://www.figma.com/design/yzLk80i2s6D2NaP0CO0Irc/Skerp> |
| File key | `yzLk80i2s6D2NaP0CO0Irc` |
| Theme / scheme | Sales / Light only |
| Variables | Primitives (mode `Value`): 28 colours, spacing, radius, border-width, font-size, line-height, size, font-family. Color (mode `Light`): 52 semantic tokens. Every variable has scopes and WEB code syntax. |
| Text styles | `Heading/H1`–`H4`, `Body/MD`, `Body/MD Strong`, `Body/SM`, `Body/SM Strong`, `Caption/Regular`, `Caption/Strong`, `Caption/Overline`, `Numeric/LG`, `Numeric/MD`, `Numeric/SM` — font size, line height and family bound to variables |
| Effect styles | `Elevation/Card`, `Elevation/Dropdown`, `Elevation/Modal`, `Focus/Ring` |
| Type scale | Confirmed by the operator on 2026-10-22: 12px to 40px, ratio ≈ 1.25 — xs 12, sm 14, md 16, lg 20, xl 24, 2xl 32, 3xl 40 |
| Fonts | Fraunces SemiBold (H1–H3), Nunito Sans (UI, body, numbers) — Google Fonts |

**Palette** (primitive name → value): porcelain `#FFFDF9`, ivory-cream `#FCF8F2`, linen `#F6EFE5`,
almond `#ECE2D3`, sand-dollar `#DDCDB7`, khaki-stone `#BFAE96`, taupe-grey `#76675A`, walnut-brown
`#65574A`, warm-charcoal `#3B332C`, espresso `#2A231E`, clay-blush `#F5E2D8`, clay-rose `#E3B39F`,
terracotta `#A9502F` (primary), rust-clay `#8A3E22`, sage-mist `#E3EBDC`, eucalyptus `#7E9C7F`,
fern-green `#3E6845`, wheat-cream `#F7EACB`, golden-ochre `#C99A3E`, umber-ochre `#7C5A12`, rosewater
`#F8E0DC`, garnet `#A82A2A` (danger), oxblood `#861F22`, seafoam-mist `#DDEBEA`, dusty-teal `#356A72`,
deep-lagoon `#2A555C`, espresso-scrim `#2A231E` at 48%, transparent.

### Main components

| Page | Component (node ID) |
|---|---|
| Icons | 35 `Icon/*` masters (`4:5`–`4:209`): Check, Close, ChevronDown/Up/Right/Left, SortNone/Asc/Desc, Search, SearchX, Plus, Minus, Trash, Edit, View, MoreVertical, Info, Warning, Error, Success, StopSign, Calendar, Filter, Menu, Lock, Loader, ExternalLink, Globe, LinkedIn, User, Package, Home, Orders, Flask |
| Buttons | `Button/Primary` 5:50 · `Button/Secondary` 5:99 · `Button/Ghost` 5:151 · `Button/Danger` 5:200 · `Button/PrimaryHighlighted` 5:225 · `Button/Icon` 5:265 · `Button/Actions` 12:141 · `Menu/Item` 12:37 · `Menu/ItemDanger` 12:55 · `Menu/Actions` 12:56 |
| Form Inputs | `Control/Checkbox` 7:18 · `Control/Toggle` 7:51 · `Indicator/LookupAvailable` 7:53 · `Indicator/LookupExists` 7:56 · `Indicator/LookupLoading` 7:59 · `Field/Search` 7:86 · `Field/Text` 9:179 · `Field/Number` 9:227 · `Field/Textarea` 9:275 · `Field/ReadOnly` 9:276 · `Field/Select` 10:225 · `Field/MultiSelect` 10:416 · `Field/DateRange` 10:581 · `Field/StatusSelect` 10:754 · `Menu/Option` 7:145 · `Menu/SelectPanel` 8:17 · `Menu/TypeaheadItem` 7:156 · `Menu/Typeahead` 8:73 · `Menu/CalendarDay` 7:174 · `Menu/Calendar` 8:92 · `Form/Total` 11:387 · `Form/LineItemHeader` 11:388 · `Form/LineItemRow` 11:533 · `Form/LineItemErrors` 47:444 |
| Cards | `Card/Default` 19:14 |
| Badges | `Feedback/Pill` 6:2 · `Status/Pending` 6:4 · `Status/Confirmed` 6:7 · `Status/Fulfilled` 6:10 · `Status/Cancelled` 6:13 · `Feedback/PillRemovable` 6:32 |
| Navigation | `Navigation/MenuItem` 20:57 · `Navigation/Header` 20:137 · `Navigation/PageButton` 20:155 · `Navigation/Pagination` 20:190 |
| Shared | `Brand/Emblem` 14:8 · `Brand/Wordmark` 14:13 · `Brand/Lockup` 14:16 · `Overlay/Tooltip` 14:46 · `Feedback/InfoTip` 14:71 · `Feedback/Spinner` 14:81 · `Feedback/DemoNote` 14:82 · `Feedback/EmptyState` 14:88 · `Feedback/ErrorPopup` 16:56 · `Feedback/InfoPopup` 16:75 · `Feedback/SuccessPopup` 16:94 · `Overlay/Scrim` 16:95 · `Background/Page` 16:104 · `Overlay/Modal` 16:160 · `Overlay/ConfirmModal` 16:196 · `Overlay/Sheet` 16:197 · `Media/Avatar` 25:286 · `Table/HeaderCell` 18:113 · `Table/HeaderRow` 18:114 · `Table/LineItemRow` 18:160 · `Table/LineItems` 18:238 · `Table/Row` 18:456 · `Table/SkeletonRow` 18:480 |

Documentation frames: Foundations `23:2`; Sales (Light) showcase `24:2`; state guidelines on Buttons
`21:75`, Form Inputs `21:541`, Badges `22:102`, Navigation `22:81`, Shared `22:393`.

### Screen frames

All on `🛡️ Screens / Sales`. Prefix every name with `Sales / `.

| Frame | Desktop (1400) | Mobile (576) |
|---|---|---|
| `Welcome / Default` | 26:2 | 26:149 |
| `Welcome / Menu Open` | — | 26:279 |
| `Purchase Orders / List` | 28:316 | 33:4809 |
| `Purchase Orders / Row Expanded` | 30:714 | 33:4988 |
| `Purchase Orders / Filters Open` | 30:1309 | 33:5228 |
| `Purchase Orders / Empty` | 30:1978 | 33:5551 |
| `Purchase Orders / Loading` | 31:1797 | 33:5628 |
| `Purchase Orders / Status Control` | 31:2084 | 33:5727 |
| `Purchase Orders / Status Control Demo Mode` | 31:2657 | 34:5650 |
| `Purchase Orders / Actions Open` | 31:3187 | 34:5948 |
| `Purchase Orders / Actions Open Locked` | 32:3183 | 34:6167 |
| `Purchase Orders / Delete Confirm` | 32:3685 | 34:6380 |
| `Purchase Orders / Error` | 32:4151 | 34:6575 |
| `Purchase Orders / Create Modal` | 35:6421 | 35:7949 |
| `Purchase Orders / Create Modal Filled` | 35:7114 | 35:8241 |
| `Purchase Orders / Create Modal Reference Available` | 36:7952 | 40:14320 |
| `Purchase Orders / Create Modal Reference Exists` | 36:8613 | 40:14573 |
| `Purchase Orders / Create Modal Customer Search` | 36:9237 | 40:14800 |
| `Purchase Orders / Create Modal Customer Selected` | 36:9871 | 40:15033 |
| `Purchase Orders / Create Modal New Customer` | 36:10491 | 40:15258 |
| `Purchase Orders / Create Modal Product Selected` | 38:10451 | 40:15479 |
| `Purchase Orders / Create Modal Validation Errors` | 38:11244 | 41:15239 |
| `Purchase Orders / Create Modal Calculating` | 38:11914 | 41:15544 |
| `Purchase Orders / Create Modal Save Disabled` | 38:12752 | 41:16020 |
| `Purchase Orders / Create Modal Demo Mode Duplicate` | 38:13586 | 41:16487 |
| `Purchase Orders / Edit Modal` | 38:14423 | 41:16954 |
| `Purchase Orders / Edit Modal Line Removed` | 38:15217 | 41:17381 |

Layout change points: `Sales / Purchase Orders / List / LG` (992px) `32:4605` and
`Sales / Purchase Orders / List / MD` (768px) `32:5047`.

### Prototype

Two flows on the Screens page, both clickable in Figma's presentation view:

- **Desktop prototype** — starts at `Sales / Welcome / Default / Desktop` (26:2).
- **Mobile prototype** — starts at `Sales / Welcome / Default / Mobile` (26:149).

Each flow links the header navigation, the list states (expand, filters, search to empty, pagination to
loading, status control, actions, delete confirmation, error), and the create and edit journeys. The create
journey runs reference → customer search → customer selected → product search → calculating → filled →
save. Demo Mode is reached through the header toggle. Loading and Calculating advance on their own after
1.2 seconds. All links navigate between frames with a 150ms dissolve; nothing uses overlays.

## Decisions the prompt did not cover

- **Variant vocabulary vs. "one variant per status".** The vocabulary has no status or tone axis, so
  status pills (`Status/*`) and the info and success popups are separate masters. In code each family is
  one component with an input (`status`, `kind`).
- **Danger confirmation.** `Overlay/ConfirmModal` is one master whose default configuration is the danger
  variant; the neutral configuration swaps the exposed Confirm button and the icon.
- **Read-only is a master, not a state.** `Field/ReadOnly` (sunken fill, dashed border, lock icon) shows
  locked values in the edit modal and the fixed Pending status, because `ReadOnly` is not in the State
  vocabulary.
- **`color/border/default`.** Figma cannot hold a variable and a group at the same path, so the default
  border token is `color/border/default`; its code syntax is still `var(--color-border)`.
- **Extra tokens.** Semantic: surface variants (sunken, hover, selected, disabled, inverse), text variants
  (placeholder, disabled, link, on-primary, on-danger, inverse), `color/icon`, `color/icon-strong`,
  `color/skeleton`, `color/transparent` and `color/backdrop/*` for the placeholder background. Primitive:
  `size/*` (icons 16/20/24, controls 32/40/44), `line-height/*` and `font-family/*`.
- **Touch targets.** Every input is 44px tall at every width, so fields need no `Breakpoint` axis. Buttons
  use `Size=LG` (44px) on mobile.
- **Change points.** The header menu collapses below md (768); the table and the filter bar appear from lg
  (992). Below lg, filters move into `Overlay/Sheet` behind a Filters button.
- **Non-Pending actions.** Edit and Delete stay visible but Disabled, so the menu shape stays stable
  (`Actions Open Locked`).
- **Popup placement.** Desktop: top-right, 24px below the header. Mobile: full width minus 16px gutters,
  16px above the bottom.
- **Modal frames.** Desktop modal states sit over the list and the scrim. Mobile modal frames show the full
  scroll height of the full-screen modal.
- **Line-item validation (review change, 2026-10-22).** A field error under a narrow line-item column
  pushed the input out of line. Invalid line-item fields now keep only the danger outline (State=Error,
  Show Helper off). `Form/LineItemRow` → Show Errors lists every message below the row with
  `Form/LineItemErrors`. Each message names the field and the rule: "Quantity should be 1 or more",
  "Price should be greater than 0". In code, the list is `role="alert"` and each invalid input points at
  its message with `aria-describedby`.
- **Icon colour on swap (review change, 2026-10-22).** Icons inside buttons follow the label colour (for
  example `color/text-on-primary` on Button/Primary). Swapping the Icon property through the plugin API
  dropped that override, so swapped icons fell back to `color/icon`. Every swapped icon was restored from
  its host master. Swapping in the Figma UI keeps the override.
- **Slots.** `Card/Default`, `Overlay/Modal` and `Overlay/Sheet` bodies are Figma slots.
- **Additions.** `Media/Avatar` (developer photo), `Overlay/Sheet` (mobile filters), `Form/LineItemHeader`,
  `Caption/Overline` and `Numeric/*` text styles.

## Open questions

- **Tabular figures.** The plugin API cannot set OpenType features. A human enables *Tabular figures* on
  the `Numeric/*` styles in Figma; code uses `font-variant-numeric: tabular-nums`
  ([`asmp-1463-tabular-figures`](../../../../../../assumption-ledger/asmp-1463-tabular-figures.md)).
- **Thank-you card.** The developer's name, photo, LinkedIn and website URLs are placeholders
  (`[Developer name]`).
- **Artwork.** The emblem, wordmark and the 2560 × 1440 background PNG are placeholders, built as
  components so they can be replaced.
- **Approval.** No frame is marked Ready for dev. A stakeholder approves the frames; a human then records
  the file in `solution/figma.md` and the frames in `solution/figma-screen-index.json` (both human-owned).
- **ADO acceptance criteria (checked 2026-10-22).** They match the Acceptance section above. One gap
  remains: the remove (×) control on `Feedback/PillRemovable` is a visible icon target smaller than
  44px. On mobile it needs a 44px hit area (an invisible padding area in Figma, or `min-width`/`min-height`
  in code) before the touch-target criterion is fully met. The extra `List / LG` and `List / MD` frames go
  beyond the required 1400 and 576 widths and only document the layout change points.
