# App shell, landing, and navigation header — Story spec (AB#1465)

User Story under Feature AB#1432 *Client Shell and Landing* (Epic AB#1428), slug
`app-shell-landing-navigation`, **8 points**. Primary branch:
`feat/solution-preparation/app-shell-landing-navigation`, cut from the AB#1464 branch
`feat/solution-preparation/solution-setup` because it builds on the client foundation; both reach `main`
in one PR (decided by Tyler Pieterse, 2026-10-22).

## What and why

Every route in Sharp ERP sits inside one branded shell: the warm backdrop, and a header with the emblem
and wordmark lock-up, the Home and Purchase Orders menu, and the Demo Mode toggle. The root route is a
welcome screen of three stacked cards. Demo Mode is one app-wide, persisted state that every later
feature reads to relax its client-side guard rails, so reviewers can see that the server alone keeps the
data correct.

## Acceptance criteria

### The shell frames every route

- **Given** the client is open on any route (`/` or `/purchase-orders`)
- **When** the page renders
- **Then** the backdrop fills the viewport behind the content
- **And** the header shows the Sharp ERP emblem and wordmark, the Home and Purchase Orders menu items, and
  the Demo Mode toggle with its label
- **And** the menu item for the current route is shown as active (`aria-current="page"`)

### Menu navigation

- **Given** the client is on `/`
- **When** the user selects Purchase Orders in the menu
- **Then** the URL is `/purchase-orders` and a placeholder screen says the purchase order list is coming
- **And** the Purchase Orders menu item is active
- **And** selecting the lock-up or Home returns to `/`

### The menu collapses below 768px

- **Given** the viewport is narrower than 768px
- **When** the page renders
- **Then** the menu items are hidden behind a menu button, and the Demo Mode toggle stays in the header
- **When** the user activates the menu button
- **Then** a panel lists Home and Purchase Orders and the button becomes a close (×) button with
  `aria-expanded="true"`
- **When** the user selects a menu item, presses Escape or activates the close button
- **Then** the panel closes
- **And** at 576px and 768px there is no horizontal page scroll

### Demo Mode is off on a first visit

- **Given** local storage holds no Demo Mode value
- **When** the client loads
- **Then** the Demo Mode toggle is off (`aria-checked="false"`)

### Demo Mode persists

- **Given** the user switches Demo Mode on
- **When** the page is reloaded or another route is opened
- **Then** the toggle is still on
- **And** switching it off and reloading leaves it off

### Demo Mode is one app-wide state

- **Given** the welcome screen shows the Demo Mode toggle inside the reviewer card
- **When** the user switches either toggle
- **Then** both toggles show the same state

### Welcome landing screen

- **Given** the user opens `/`
- **When** the page renders
- **Then** three stacked cards appear in this order: *Welcome to Sharp ERP* with a View purchase orders
  button; *How Demo Mode works* with its explanation, toggle and four points; *Thank you* with the
  developer's photo, sign-off, LinkedIn and Professional website links
- **And** View purchase orders navigates to `/purchase-orders`
- **And** the LinkedIn and Professional website links open in a new tab with `rel="noopener noreferrer"`

### Keyboard and focus

- **Given** a keyboard user
- **When** they tab through the header and cards
- **Then** every control shows the focus ring and the Demo Mode toggle switches with Space or Enter

## Step 1: Tracer bullet

| Element | New / changed | Layer / project / folder | Access | Stub behaviour |
|---|---|---|---|---|
| `common/state/demo-mode/` (actions, feature reducer + selector, effects) | new | client `src/app/common/state/` | exported via `index.ts` | off by default; restore on app init, persist on switch |
| `common/services/demo-mode-storage.service.ts` | new | client `common/services/` | injectable | reads/writes `skerp.demoMode`; never throws |
| `a-header` (`common/components/header/`) | new | shared component | standalone | lock-up, menu, toggle |
| `a-toggle`, `a-card`, `a-button`, `a-brand-lockup` | new | `common/components/` | standalone | inputs/outputs only |
| `shell/` layout (`app.html` backdrop + header + `router-outlet`) | changed | client root | — | wraps every route |
| `features/welcome/pages/welcome-page` | new | feature | lazy route `''` | three cards |
| `features/purchase-orders/pages/purchase-orders-placeholder-page` | new | feature | lazy route `purchase-orders` | placeholder until AB#1466 |
| `app.routes.ts` | changed | client root | — | two lazy routes |

The round hits when: both routes render inside the shell · the toggle dispatches and a selector reads the
state on both routes · storage reads before first render · the shared components take only inputs/outputs ·
tests reach the reducer, selectors and components through their public exports.

## Design

`design-fidelity-check: applies — the shell, header, toggle, cards and welcome screen are UI surfaces.`

| Screen · state · breakpoint | Citation | Page | Approval | Fingerprint |
|---|---|---|---|---|
| Welcome · default · desktop | `sales/welcome/default/desktop` (`26:2`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:434faafce5b4519a` |
| Welcome · default · mobile | `sales/welcome/default/mobile` (`26:149`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:0643623e297e8d0f` |
| Welcome · menu open · mobile | `sales/welcome/menu-open/mobile` (`26:279`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:f0e1aaba7ec6218b` |
| Header over list · desktop (active Purchase Orders item) | `sales/purchase-orders/list/desktop` (`28:316`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:a4a608ba5f90c4e0` |
| Header · md change point | `sales/purchase-orders/list/md` (`32:5047`) | 🛡️ Screens / Sales | index: Tyler Pieterse, 2026-10-22 | `fp1:c216c36c24612c42` |

Masters (shared pages, so built shared from first use): `Navigation/Header` 20-137,
`Navigation/MenuItem` 20-57, `Control/Toggle` 7-51, `Card/Default` 19-14, `Brand/Lockup` 14-16,
`Button/Primary` 5-50, `Button/Secondary` 5-99, `Media/Avatar` 25-286, `Background/Page` 16-104 —
for example [`Navigation/Header`](https://www.figma.com/design/yzLk80i2s6D2NaP0CO0Irc/Skerp?node-id=20-137).

**Decisions where the design is silent** (Tyler Pieterse delegated these: "use your best judgement …
once a decision is made stick to it"):

- The toggle inside the reviewer card is a live control bound to the same Demo Mode state. The frame
  shows it on beside an off header toggle to illustrate it; in code both always agree.
- The Purchase Orders route shows a placeholder card until AB#1466 builds the list (Feature plan).
- The developer's name, photo, LinkedIn and website are placeholders in the design. They come from client
  configuration (`environment.ts → developer`), so supplying them needs no code change.
- The menu panel closes on navigation, Escape, the close button and a tap on the scrim; focus returns
  to the menu button when the user dismissed it.
- The header takes its menu items as an input, so it assumes no routing structure (angular.md).
- Tests query by role, href and ARIA attributes, never by visible copy (Deliverable: "never rely on …
  text copy for tests").

## Functional impact

| Shared mechanism | Consumers (search) | Risk |
|---|---|---|
| Root layout `app.html` / `app.ts` | every route in `app.routes.ts` (welcome, purchase-orders) | low: both added here |
| Global styles `src/styles/*` (from AB#1464) | `error-popup` component | low: re-check popup after adding partials |
| `common/components/*` (new) | header, welcome page, placeholder page; AB#1466 will consume | none today |
| Demo Mode state (new) | header, welcome card; AB#1466+ status control and create modal | none today |

Search: `rg -l "error-popup|styles/" client/src` after AB#1464.

## Release toggle

Not applicable: the shell and landing screen are the application frame and its root route, so hiding them
leaves nothing to show. The Purchase Orders placeholder is the safe stand-in the Feature plan asks for.

## Deployment

None beyond AB#1464's local run. No new configuration keys on the API.
