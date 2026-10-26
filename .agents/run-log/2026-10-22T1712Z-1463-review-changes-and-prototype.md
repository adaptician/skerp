---
work-item: AB#1463
summary: >
  Applied the operator's two review changes (button icon colour, line-item error list) and wired a
  desktop and a mobile clickable prototype across the Sales screens.
---
# Review changes and prototype flows

## What changed

- **Button icons:** icons swapped through the Icon property had fallen back to `color/icon` (dark) instead
  of the label colour. A pass over every page restored each swapped icon's colour from its host master
  (67 icons on the Screens page, 1 on the Navigation page).
- **Line-item validation:**
  - new `Form/LineItemErrors` (47:444);
  - `Form/LineItemRow` gained a Show Errors property. Its desktop variant is now a vertical stack of the
    field row and the error list;
  - invalid line-item fields show only the danger outline;
  - both Validation Errors frames show "Quantity should be 1 or more" and "Price should be greater than 0"
    below the row;
  - the Form Input States guidelines describe the rule.
- **Prototype:** two flow starting points, *Desktop prototype* (26:2) and *Mobile prototype* (26:149), with
  122 and 115 click or timeout interactions.
- **Repo:** the item spec gained the prototype section, the two review decisions and the new component.

## What surprised you

- Swapping an instance-swap property with `setProperties` drops colour overrides on the swapped icon, and
  hidden instance children are skipped by traversal unless `figma.skipInvisibleInstanceChildren` is false.
  After a swap, the nested instance is renamed to the new component (`Icon/Plus`), so matching had to use
  child positions rather than names.
- Adding the first interaction to a top-level frame creates a flow starting point automatically, so naming
  the flows had to replace that entry rather than append to it.
- Figma rejects a link from a frame to itself, so "Home" on the Welcome screen and "Purchase Orders" on
  the list have no interaction. They would not navigate anywhere anyway.

## What you assumed

- In Demo Mode, picking a disallowed status (Fulfilled from Pending) leads to the Error frame, and the
  header's Demo Mode toggle on the list leads to the Status Control Demo Mode frame, as the closest
  existing states. The duplicate-save rejection in Demo Mode has no dedicated frame, so its Save is not
  linked.
