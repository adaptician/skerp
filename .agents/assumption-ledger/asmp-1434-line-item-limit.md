---
status: settled
tier: assumed
claim: >
  An order allows 1–100 line items (brief client rule), enforced identically on the server; the brief's
  unit-test wording "0 or more than 1000" is taken as a typo for 100.
settles: >
  A human confirms the server-side maximum (100 or 1000) before AB#1453 is planned.
outcome: >
  Product owner decision (2026-10-22): an order allows 1 to 100 line items. The client and the server both enforce the limit on create (AB#1466) and edit (AB#1468). The brief's "1000" unit-test wording is superseded by 100.
---
# Line-item count limit: 100 or 1000

`brief.md` → *Client-Side Rules* says "minimum line items: 1; maximum line items: 100", while its
*Minimum Unit Tests* say creation fails when line items are "0 or more than 1000". `entities.md` caps
line-item **quantity** at 1000, which may be the source of the confusion. AB#1453 (create API), AB#1454
(creation modal) and AB#1457 (edit API) all enforce this limit.

## Re-planned 2026-10-22

The backlog was condensed. AB#1453, AB#1454 and AB#1457 are now Removed and merged into AB#1466 (Create Purchase Order) and AB#1468 (Edit Purchase Order). Decide before AB#1466 is planned.

## Settled 2026-10-22

Product owner decision (2026-10-22): an order allows 1 to 100 line items. The client and the server both enforce the limit on create (AB#1466) and edit (AB#1468). The brief's "1000" unit-test wording is superseded by 100.
