# Client Shell and Landing — Feature plan (AB#1432)

## Outcome

A user opening Sharp ERP sees a branded, responsive shell on every route. The shell has the background
image and a navigation header with emblem, wordmark, menu items and a Demo Mode toggle. Users land on a
welcome screen of three stacked cards. Reviewers can switch Demo Mode on, and it persists and is readable
by every feature.

## Decision boundary

**In scope**

- The shell layout with the full-page background (2560 × 1440 PNG; a placeholder until supplied).
- `Navigation/Header` with the emblem and wordmark (placeholders until supplied), the Home and Purchase
  Orders menu items, an active state, and a collapsed mobile menu.
- The Demo Mode toggle: off by default, persisted in local storage, exposed as one app-wide state.
- The landing route with three cards built from the shared `Card/Default` component: welcome and summary;
  a reviewer note on Demo Mode; a developer thank-you with profile picture, LinkedIn and professional-site
  links.

**Out of scope**

- The Purchase Orders screen itself (AB#1466 creates its shell). Until then, the menu item routes to a
  placeholder.
- Any backend effect of Demo Mode. Demo Mode is client-only by design, so the backend never relaxes a rule.
- Final logo, background and profile artwork. These are replaced when supplied.
- Theme switching and dark mode.

## Evidence

| Claim | Tier | What settles it |
|---|---|---|
| The approved Figma header, card and landing frames exist before this Story starts | assumed | AB#1463 frames recorded as approved in the screen index |
| Demo Mode needs no server-side counterpart | derived | Brief: Demo Mode only changes client behaviour, to show that the backend does not rely on the client |

## Work-item decomposition

| ADO | Type | Primary slug | Points | Adds |
|---|---|---|---|---|
| AB#1465 | User Story | `app-shell-landing-navigation` | 8 | The shell and background, the navigation header, the Demo Mode toggle and state, and the welcome landing screen |

## Observable proof

- **Positive:** every route shows the shell. At 576px the menu collapses and opens. Demo Mode switched on
  survives a reload. The root URL shows the three cards, and the external links open in a new tab.
- **Negative:** on a first visit with empty storage, Demo Mode is off. Below 768px there is no horizontal
  page scroll.

## Completion boundary

- The Story passes the four-level design verification bar (`.agents/standards/design.md`) against its
  approved frames, at desktop and mobile.
- The header, card and toggle are shared components under the client's common location, mirroring their
  Figma masters.
