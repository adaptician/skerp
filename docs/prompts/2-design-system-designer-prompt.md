# Designer prompt — Sharp ERP design system and core screens

Prompt for the Designer agent behind ADO Design item **AB#1463** (Feature AB#1431 *Development
preparation*, Epic AB#1428 *Solution Preparation*). The same text is the Design item's Description.
Change it here first, then regenerate the ADO field from this file.

---

## Role and goal

You are the product designer for **Sharp ERP** (the internal code name is *Skerp*). In Figma, build a
well-structured, cohesive and easy-to-use **design system** and the **core screens** for a small web
application. Developers will build an Angular 21 client from your work. Every colour, type size,
spacing value and radius you use becomes a code token, and every main component becomes a code
component. Build for that handover: everything is token-bound and named predictably.

Design **desktop and mobile** for every component that changes between them and for every screen. The
product must be responsive and mobile-friendly throughout.

## Product context

- **Users:** a small internal sales team. They create and manage customer purchase orders and track
  each order's status. They use the app daily, so it should be calm, clear and low-friction, not
  flashy.
- **Purpose:** an internal demonstration app. It must look professional and polished to reviewers.
- **What a user does:**
  - view, search and filter a paginated list of purchase orders, and expand a row to see its line
    items;
  - create a purchase order with line items in a modal;
  - edit a *Pending* purchase order in a modal;
  - change an order's status;
  - delete a *Pending* order after confirming.
- **Demo Mode:** a toggle in the navigation header. When it is on, some screens deliberately show
  extra reviewer-facing behaviour (described under *Screens*). Demo-only UI must look intentional
  and clearly secondary to the real workflow.
- **Out of scope:** sign-in, user accounts and avatars for the current user, tax, currency
  conversion, settings pages and dark mode.

## Brand and visual direction

- **Brand name in all copy:** "Sharp ERP". Never use "Skerp" in any text a user would read.
- **Palette: warm and calming.** Aim for an earthy, restful feel, for example soft sand or cream
  neutrals, a muted terracotta or clay primary, sage or eucalyptus greens, and a warm charcoal for
  text. Avoid harsh saturated blues, pure black text on pure white, and neon accents. You choose the
  exact palette. Give every colour a human-readable name (as on coolors.co, e.g. `clay-rose`,
  `warm-sand`).
- **Semantic colours must stay warm but unambiguous.** Success, warning, danger and info must be
  told apart at a glance, and *danger* must read clearly as destructive.
- **Status colours** (shown as pills): Pending, Confirmed, Fulfilled and Cancelled each get a distinct
  token pair (background and text). The label text always carries the meaning; never rely on colour
  alone.
- **Contrast:** meet WCAG 2.2 AA. Body text needs 4.5:1, large text and UI boundaries 3:1. Check
  text on every tinted surface, including pills and the danger button.
- **Fonts: web-friendly**, freely available on Google Fonts, with no more than two families. For
  example, a warm humanist sans for UI and body text (such as *Nunito Sans*, *DM Sans* or *Source
  Sans 3*), and optionally a softer display face for headings. Numbers in tables and totals must
  align, so use tabular figures where the font supports them.
- **Background:** every page sits on a full-bleed background image, 2560 × 1440 PNG, supplied later.
  Use a tasteful warm placeholder (a soft gradient or abstract texture). Content surfaces such as
  cards, the table and modals must stay readable over it.
- **Logo:** design a placeholder **emblem** (a square mark that works from 24px to 128px) and a
  **wordmark** ("Sharp ERP"). Also design a lock-up of the two together. The final artwork may be
  replaced later, so build both as components.

## Foundations: confirm before generating

**Before you generate the type-scale variables, ask the operator to confirm the minimum and maximum
font sizes.** Propose a range (for example 12px minimum, 40px maximum) and a ratio, and wait for
confirmation. The scale must be a deliberate ascending set (`xs` … `2xl` or similar) covering at
least h1–h4, body, small and caption text.

Then create Figma variables in these collections, so that they mirror the code's three token layers:

1. **Primitives:** the named raw colours (no hex value is used anywhere else), the spacing scale (a
   4px base is recommended), radii, border widths and font sizes.
2. **Semantic (Color collection, one mode: `Light`):** role tokens that alias primitives, such as
   `color/surface`, `color/surface-raised`, `color/text`, `color/text-muted`, `color/border`,
   `color/primary`, `color/primary-hover`, `color/primary-muted`, `color/danger`, `color/success`,
   `color/warning`, `color/info`, `color/border/focus`, `color/focus-ring`, the `color/status/*` pairs
   and `color/overlay` (the modal scrim). Components bind **only** semantic tokens, never primitives
   and never raw values.
3. **Component-level values** live on the components and reference semantic tokens.

Add text styles for every step of the type scale, and effect styles for elevation (card, dropdown,
modal) and for `Focus/Ring` (a 3px `color/focus-ring`). Document all of this on the Foundations page.

## Responsive breakpoints: exact widths

The code uses these breakpoints, mobile-first: **sm 576px · md 768px · lg 992px · xl 1200px ·
xxl 1400px**. Make frames at these exact pixel widths, never at approximate or default widths:

- **Desktop frames: 1400px wide.**
- **Mobile frames: 576px wide.**

If you believe a narrower phone frame (for example 375px) is needed to show the layout below `sm`,
raise it with the operator rather than adding it yourself, because that width is not on the code
scale. Where a layout changes at md or lg (for example the filters or the table collapsing), show
that state too, at those exact widths.

## File structure and naming: mandatory

Create one Figma file for the app and its design system. Use these pages, exactly:

```
🎨 Foundations
🧩 Components / Icons
🧩 Components / Buttons
🧩 Components / Form Inputs
🧩 Components / Cards
🧩 Components / Badges
🧩 Components / Navigation
🧩 Components / Shared
🧩 Components / Sales (Light)
🛡️ Screens / Sales
🗄️ Archive
```

- **Theme:** there is one audience theme, **Sales**, with the scheme **Light** only. State on the
  `Components / Sales (Light)` page: "Scheme: Light. No dark variant in scope."
- **Shared master pages:** masters on Icons, Buttons, Form Inputs, Cards, Badges, Navigation and
  Shared are structure-only and bound to semantic variables. `Components / Sales (Light)` holds
  instances of them inside a frame set to the `Light` mode. Each shared page starts with a note
  saying which masters it holds.
- **Component names** use the slash hierarchy `<Category>/<Name>`, for example `Button/Primary`,
  `Button/Danger`, `Field/Text`, `Field/MultiSelect`, `Feedback/Pill`, `Navigation/Header`,
  `Overlay/Modal`, `Icon/Check`. The code slug will be the kebab-case of this name
  (`button-primary`), so keep the names stable and meaningful.
- **Variant properties** use only this vocabulary, in this order: `State` = Default | Hover | Focus |
  Disabled | Open | Error; `Selected` = False | True; `Size` = SM | MD | LG; `Breakpoint` = Desktop |
  Mobile. Give a component only the values it uses. Theme is never a variant.
- **Icons** are `Icon/<Name>` components on the Icons page, scale with their instance, and bind one
  default semantic colour. Components that show a changeable icon expose an **Instance Swap**
  property, not a variant per icon. Never use loose vectors in masters or screens.
- **Screen frames** are named `<Theme> / <Screen> / <State> / <Breakpoint>`, for example
  `Sales / Purchase Orders / List / Desktop` or `Sales / Purchase Orders / Create Modal / Mobile`.
  The parts are separated by space-slash-space, and every name has exactly four parts. Every screen
  frame sets the Color collection to `Light` before anything is placed in it.
- Use auto layout throughout, so that components resize properly, and give layers meaningful names.
- Put deprecated or exploratory work on `🗄️ Archive`, never beside live work.

## Interactive states: not optional

Every interactive control (buttons, inputs, selects, toggles, checkboxes, menu items, links, pills
that act as controls, actions-menu items) needs **Default, Hover, Focus and Disabled** variants, plus
**Open** for anything that expands and **Error** for anything that validates. The focus treatment keeps
the resting look and adds `color/border/focus` at the emphasis border width, plus the 3px focus ring.
Controls with an opaque fill use the `Focus/Ring` effect style. Controls without one (outline buttons,
links, menu items, unselected options) draw the same ring as a `Focus Ring` layer. If you decide a
control is deliberately never disabled, write that down beside its masters. Put each control's state
rules in a `<Subject> States — Guidelines` frame next to its masters.

Touch targets must be at least 44 × 44px on mobile.

## Common components: minimum set

Build each of these as a proper component with variant sets, desktop and mobile where they differ:

1. **Searchable multi-select dropdown** (`Field/MultiSelect`). Example use: the customer filter. It
   has a search input, a scrollable option list with checkboxes, selected values shown as removable
   pills inside the field, a "+N more" overflow, a limit hint ("Up to 10 customers"), and empty
   ("No customers found") and loading states. States: Default, Hover, Focus, Open, Disabled, Error.
2. **Single-select dropdown** (`Field/Select`). Example use: status. It has a placeholder, a selected
   value and an option list, with an option that can carry a trailing **info icon** with a
   **tooltip** (needed for Demo Mode).
3. **Pill** (`Feedback/Pill`). Example uses: a reference number and a status. Make a neutral
   reference/tag variant, one variant per status, and a removable variant with an × for selected
   values.
4. **Actions dropdown button** (`Button/Actions` plus `Menu/Actions`). It is a compact button
   (kebab or "Actions ▾") that opens a menu of items, each with an optional icon. **Destructive items
   such as Delete use the danger theme**: danger text and icon, and a danger-tinted hover. Disabled
   items are shown when an action is unavailable.
5. **Confirmation modal** (`Overlay/ConfirmModal`). It has a title, a message that explains the
   consequence (for example "This purchase order will be deleted. This cannot be undone."), a
   secondary Cancel and a primary Confirm, with a **danger** variant for destructive confirmations.
   It sits over a scrim and becomes a bottom sheet or full-width dialog on mobile.
6. **Popup error message** (`Feedback/ErrorPopup`). It is a non-blocking toast or snackbar that shows
   a short title and a server-provided description, with a dismiss ×. Its position on desktop and
   mobile is your choice; show where it sits. Add an info/success variant too, so the pattern
   generalises.
7. **Card** (`Card/Default`). It has a heading area and a body slot for injected content. Use a
   **slot** or instance-swap placeholder so the body is clearly replaceable. Surface fill, border and
   large radius.
8. **Navigation header** (`Navigation/Header`). It has the emblem and wordmark lock-up, the menu
   items (*Home*, *Purchase Orders*, with an active state), and the **Demo Mode toggle** with its
   label. On mobile, the menu items collapse behind a menu button into a panel or drawer, and the
   toggle stays reachable.
9. **Logo** (`Brand/Emblem`, `Brand/Wordmark`, `Brand/Lockup`): the placeholders described above.

The screens also need these supporting components. Build them in the same way:

- **Buttons:** Primary, Secondary, Ghost/Tertiary, Danger and Icon-only, in sizes SM/MD/LG, with an
  optional leading icon (via Instance Swap). Primary also needs a variant highlighted in the danger
  colour while still enabled, for Demo Mode.
- **Form inputs:** text, email, number (for quantity and price, right-aligned), textarea (notes, with
  a character counter, max 512), date-range picker, and search input.
  Each has a label, helper text and an error message.
- **Field lookup indicator:** an inline status icon inside a field, in three variants: a **green
  check** (reference available), a **red stop sign** (reference already exists) and a loading state.
- **Typeahead / autocomplete list:** for customer-name search (results appear from 5 typed
  characters) and SKU search (each result shows the SKU and product name). Selecting a customer turns
  the input into a pill and disables the email field beneath it.
- **Toggle switch:** for Demo Mode, with on/off, hover, focus and disabled.
- **Tooltip** and **info icon.**
- **Data table** (`Table/*`): header cell (sortable, with asc/desc indicators), row (default, hover,
  expanded), an expand chevron, and an expanded **line-item sub-table**. Each line item shows SKU,
  name, quantity, price and sub-total, with a "Load more line items" control. On mobile, rows become
  stacked cards.
- **Line-item editor row:** for the create and edit modals. It has SKU (searchable), name, quantity,
  price, a read-only sub-total and a remove button, plus an "Add line item" button. An order holds 1
  to 100 line items, so "Add line item" needs a disabled state with a hint ("Maximum 100 line items"),
  and the remove button is disabled on the last remaining line.
- **Read-only total display:** for the sub-total and grand total, clearly not editable, with a
  "calculating…" state.
- **Pagination:** page numbers, previous/next and a page-size or "showing x–y of z" summary, in a
  compact form on mobile.
- **Empty state:** an illustration or icon, a heading and a short message, with an optional action
  ("No purchase orders match your filters" and "Clear filters").
- **Loading:** a skeleton for table rows, and a spinner.
- **Demo note:** a subtle, clearly labelled reviewer-facing note block (for example a "Demo note"
  label in an info style) for the text shown under the Save button in Demo Mode.

## Screens

Design every screen at **Desktop (1400)** and **Mobile (576)**, on `🛡️ Screens / Sales`, with
realistic sample data. Use references such as `PO-2026-001`, customers such as "Alpha Studios",
products such as `SDA001 Delicious Soda`, the ZAR currency (symbol **R**) and the four statuses.

### 1. Welcome landing screen (`Sales / Welcome / Default / …`)

This is the default route, under the navigation header, over the background. It shows **three
stacked cards**:

1. a welcome message and a short summary of Sharp ERP;
2. a note for reviewers that explains how the Demo Mode toggle works;
3. a thank-you message from the developer, with a profile picture (placeholder) and links to
   LinkedIn and a professional website.

### 2. Purchase order list (`Sales / Purchase Orders / <State> / …`)

- **List:** the page title and a primary "New purchase order" button, a reference search, and a
  filter bar (customer multi-select, status single-select, created-date range, "Clear filters").
  The grid columns are reference (pill), customer name, total (currency symbol and grand total,
  right-aligned), status, created date (date only) and an Actions dropdown. Pagination sits
  below. The first page is newest first.
- **Row Expanded:** one row expanded to show its line items, with "Load more line items".
- **Filters Open:** the customer multi-select open with a search term, options and selected pills.
- **Empty:** the empty-state placeholder, shown when no orders match.
- **Loading:** the skeleton rows.
- **Status Control:** the status control on a row. *Normal:* the dropdown lists only valid next
  statuses, and a terminal status (Fulfilled or Cancelled) shows as a pill with no dropdown. *Demo
  Mode:* the dropdown lists every status and shows the info icon with its tooltip open.
- **Actions Open:** the Actions menu open, with Edit and View items and a **danger-styled Delete**.
  For non-Pending orders, Edit and Delete are disabled or hidden; show which you chose.
- **Delete Confirm:** the confirmation modal (danger variant) over the list.
- **Error:** the popup error message over the list. Example: "This status change is not allowed. A
  Pending order can only be Confirmed or Cancelled."
- **Mobile:** the filters collapse into a "Filters" button that opens a panel or sheet, and rows
  become cards. There is no horizontal page scroll.

### 3. Creation modal (`Sales / Purchase Orders / Create Modal / …`)

The modal opens from "New purchase order". It is full-screen on mobile. Its fields, in order:

- reference number;
- customer name and customer email;
- status, shown as a fixed, read-only **Pending** pill, because every new order starts as Pending;
  and currency (default "ZAR");
- line items (SKU, name, quantity, price, read-only sub-total, remove) and "Add line item";
- read-only grand total;
- notes;
- footer: Cancel and Save.

Show these states:

- **Default:** empty, with one blank line item.
- **Filled:** a valid order with three line items and totals shown.
- **Reference Available / Reference Exists:** the green check and the red stop sign on the reference
  field.
- **Customer Search:** the typeahead results under customer name.
- **Customer Selected:** the customer shown as a pill, with the email filled and disabled.
- **New Customer:** a new name is confirmed, and email is required and empty, in the Error state.
- **Product Selected:** a line whose SKU and name are filled from a search result and disabled.
- **Validation Errors:** required-field and invalid-value errors (for example a negative quantity).
- **Calculating:** totals in the "calculating…" state.
- **Save Disabled:** Demo Mode off and the reference exists, so Save is disabled.
- **Demo Mode Duplicate:** Demo Mode on and the reference exists, so Save stays **enabled and
  highlighted in danger red**. A demo note appears beneath it with this text: "To improve a user's
  experience, asserting reference availability is performed proactively. Disabling the 'Save' button
  provides a more interactive user experience. However, the button has been left enabled during demo
  mode to demonstrate that the backend does not rely on client-side validation to enforce data
  integrity."

### 4. Edit modal (`Sales / Purchase Orders / Edit Modal / …`)

The edit modal reuses the creation modal's structure. Reference and customer are shown **read-only**
(visibly locked, not just disabled-grey), and status is not editable here. Currency, notes and line
items stay editable. Show **Default** (pre-filled) and **Line Removed** (one line removed and the
totals recalculated).

### Demo Mode status tooltip text

Use this text for the status dropdown's tooltip in Demo Mode: "To improve a user's experience,
statuses are proactively removed from status dropdowns until only valid options remain. This helps
users learn and understand how the system works. However, all options have been included during demo
mode to demonstrate that the backend does not rely on client-side exclusions to enforce state
integrity."

## Working method

1. Read the file's current state before you change it.
2. Build in this order: Foundations (after the operator confirms the type-scale range), then Icons,
   then the components, then the screens.
3. After each step, take a screenshot and check it.
4. Build screens **only** from instances of your components and from your variables. Never draw
   one-off shapes or use raw values.
5. If two components could serve one role, keep one canonical master and delete or archive the
   other.

## Handover

When you finish, report:

- the Figma file name, URL and file key;
- the node IDs of every screen frame and main component you created, with each frame's exact name;
- the confirmed type-scale range and the chosen fonts and palette, with their names;
- any decision you made that this prompt did not cover, and any open questions.

**Do not mark anything Ready for dev.** Approval is a human decision: a stakeholder reviews the frames,
marks them Ready for dev in Dev Mode and records the approval. The development team records the file
and frames in the repository's screen index.
