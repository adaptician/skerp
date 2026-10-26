# Welcome

The default route (`/`): three stacked cards built from the shared `a-card` — what Sharp ERP is, how
Demo Mode works, and the developer's thank-you. Figma: `sales/welcome/default/desktop` (26:2),
`sales/welcome/default/mobile` (26:149).

## Primary pieces

| Piece | Role |
|---|---|
| `pages/welcome-page` | The route's screen. Reads Demo Mode from the store and dispatches `DemoModeActions.switched` from the reviewer card's toggle. |

## Design notes

- The toggle in the reviewer card is live and bound to the same app-wide state as the header toggle.
  The design shows it on beside an off header toggle as an illustration; in code they always agree.
- The developer's name, role, photo and links come from `environment.developer` (placeholders until
  supplied), so changing them needs no code change.
