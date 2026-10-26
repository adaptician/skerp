---
status: settled
tier: assumed
claim: >
  The purchase-order list request gains an optional grand-total range filter (e.g. totalMin / totalMax),
  because brief.md requires a price-range filter but api.md's List request table has no such fields.
settles: >
  A human confirms the filter exists, its field names, and that it applies to the order grand total
  (not line-item prices), before AB#1445 is planned.
outcome: >
  Product owner decision (2026-10-22): the price-range filter is removed and no longer in scope. The List request keeps the api.md contract unchanged, and AB#1467, AB#1433 and the designer prompt no longer include a price range.
---
# List price-range filter missing from the API contract

`brief.md` → *Purchase Order Retrieval* lists "price range" among the filters; `api.md` → *List (POST)*
defines search, statusId, customerIds, createdMin/createdMax, sorting and paging only. AB#1445 (list API)
and AB#1448 (list filters) both depend on the answer. If the filter is dropped instead, AB#1448's price
range control and the related acceptance criteria are removed.

## Re-planned 2026-10-22

The backlog was condensed. AB#1445 and AB#1448 are now Removed and merged into AB#1467 (List Purchase Orders). Decide before AB#1467 is planned.

## Settled 2026-10-22

Product owner decision (2026-10-22): the price-range filter is removed and no longer in scope. The List request keeps the api.md contract unchanged, and AB#1467, AB#1433 and the designer prompt no longer include a price range.
