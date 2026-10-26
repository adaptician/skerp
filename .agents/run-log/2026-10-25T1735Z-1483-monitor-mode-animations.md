---
work-item: 1483
summary: >
  Milestone 2 of Monitor Purchase Orders Live — rows animate in, out and in place after a Monitor Mode
  refresh.
---
# Monitor Mode change animations (AB#1483, milestone AB#1485)

## What changed

- A Monitor Mode refresh records which rows arrived, left and changed in place. Arriving rows grow into
  place, leaving rows shrink and fade (Angular's `(animate.enter)`/`(animate.leave)` keep a leaving row
  until its animation ends), edited rows are outlined (3px primary) and lifted with the dropdown
  elevation for 2 s, and status changes also take the new status's pill background.
- Body cells of the table wrap their content in `.po-table__cell` so a row can animate its height.

Consumers re-checked:

| Mechanism | Consumer | Result |
|---|---|---|
| `adapt-purchase-order-list` cell markup (`.po-table__cell` wrapper; customer ellipsis moved onto it) | the page with Monitor Mode off | pass: 1400px — 7 columns, every row 56px, same as `sales/purchase-orders/list/desktop` (`28:316`); page and list tests pass |
| Purchase-orders NgRx slice (`loaded` now settles the monitor state) | page, effects, reducer spec | pass: 158 client tests |

design-fidelity-check verify: UNVERIFIED — `sales/purchase-orders/list/desktop` (`28:316`) and the
prose-approved monitor surfaces: L3 for the motion — the browser pane ran hidden, so CSS animations and
transitions did not advance and screenshots could not show them; a human visual sign-off step was added to
How To Test. L1/L4 checked live: outline `rgb(169, 80, 47) solid 3px`, `--elevation-dropdown`, tint =
the new status's pill background, `translateY(-2px)`, cleared after ~2 s; enter/leave classes and the
`po-row-cell-grow`/`po-row-content-grow` animations observed with a MutationObserver on create and delete;
cards checked at 375px.

## What surprised you

- The browser pane was hidden, which freezes CSS transitions at their first frame: computed styles read
  as transparent until transitions were disabled on the page. The same would stall `animationend` in a
  background tab, so the row animation now also settles on a 1 s timeout.
- A create on a full page also pushes the page's last row off, and a delete pulls one on; animating those
  as leave/enter keeps the grid from jumping, so arrivals and departures are judged by comparing pages,
  not only by the pushed change kind.

## What you assumed

- "Purchase order line items" in the animation brief means the grid's rows (spec → Decisions).
