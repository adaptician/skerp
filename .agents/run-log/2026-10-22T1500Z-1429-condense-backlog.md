---
work-item: AB#1429
summary: >
  Condensed the backlog on the product owner's instruction: one CRUD Feature and one State Machine Feature
  under AB#1429; one Spike and one Story under Solution Preparation; superseded items set to Removed.
---
# Condense backlog to complete-whole Features and Stories

## What changed

- **Solution Preparation (ADO):**
  - Spike AB#1464 *Solution setup* (13 points) under AB#1431 replaces AB#1438, AB#1439 and AB#1440.
  - User Story AB#1465 *App shell, landing, and navigation header* (8) under AB#1432 replaces AB#1441,
    AB#1442 and AB#1443.
  - Design AB#1463 is unchanged.
- **Purchase Order Management (ADO):**
  - Feature AB#1433 is now *Purchase Order CRUD* (slug `purchase-order-crud`). It holds:
    - AB#1466 *Create* (21), which replaces AB#1444, 1446, 1449, 1451–1456;
    - AB#1467 *List* (13), which replaces AB#1445, 1447 and 1448;
    - AB#1468 *Edit* (8), which replaces AB#1457 and 1458;
    - AB#1469 *Delete* (3), which replaces AB#1461 and 1462.
  - Feature AB#1436 is now *Purchase Order State Machine* (slug `purchase-order-state-machine`). It holds
    AB#1470 *Update Status* (8), which replaces AB#1450, 1459 and 1460.
- **Removed:** Features AB#1434, AB#1435 and AB#1437, and items AB#1438–AB#1462, were set to `Removed`.
  The MCP surface has no delete; a human can hard-delete them in the web UI. A merge-map comment was
  added to AB#1431, 1432, 1433 and 1436. A WIQL query confirmed the live set is 1430–1433, 1436 and
  1463–1470.
- **Repo:**
  - The five per-capability Feature plans were replaced by `purchase-order-crud/` and
    `purchase-order-state-machine/`.
  - The Epic overview and both Solution Preparation Feature plans were rewritten.
  - Re-plan notes were appended to the five assumption entries.

## What surprised you

- The first split was driven by the planning depth ladder (no spec above 8 points). The product owner
  ruled that this rule is not working and should be ignored for now; it will be resolved later. The new
  Stories are 3–21 points.

## What you assumed

- New items were created, rather than the old ones retitled, because `Custom.QuotationPoints` may only be
  written at creation. Retitling would have left quotes that no longer matched the scope. Features carry
  no estimate, so AB#1433 and AB#1436 were reused.
- Work the outline did not name was placed in the Story that first needs it, so nothing was dropped:
  - normalisers, the reference, customer and product lookups, and the Demo Mode save behaviour went to
    Create;
  - the lazy line-item endpoint went to List.
- `PurchaseOrderStatusContext` lives in AB#1470. Create sets Pending directly until AB#1470 routes it
  through the context, and AB#1470 is ordered before Edit and Delete.
