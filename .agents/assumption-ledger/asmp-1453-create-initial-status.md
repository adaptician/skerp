---
status: settled
tier: assumed
claim: >
  How a create request whose statusId is not Pending is handled is undecided: the brief says creation
  defaults to Pending and the form shows a status field, while api.md makes statusId required on create.
settles: >
  A human chooses one of: (a) reject any non-Pending statusId on create; (b) create as Pending, then apply
  the requested status as a transition through PurchaseOrderStatusContext (so Confirmed/Cancelled succeed,
  Fulfilled fails); (c) ignore statusId on create. Decide before AB#1453 is planned.
outcome: >
  Product owner decision (2026-10-22): option (a). A create request may only carry the Pending statusId; any other value is rejected as an invalid request (400). The creation form shows status as a fixed, read-only Pending.
---
# Initial status on create

`brief.md` → *Purchase Order Status Update*: "during creation status is defaulted to Pending", and the
`PurchaseOrderStatusContext` "MUST BE USED whenever a purchase order status is created". The creation
form lists "status with default Pending", implying the user can change it, and `api.md`'s create table
marks `statusId` as required. AB#1453 and AB#1454 depend on the choice; AB#1450's state machine supports
all three options.

## Re-planned 2026-10-22

The backlog was condensed. AB#1453 and AB#1454 are now Removed and merged into AB#1466 (Create Purchase Order), and the state machine (formerly AB#1450) is in AB#1470 (Update Purchase Order Status). Decide before AB#1466 is planned.

## Settled 2026-10-22

Product owner decision (2026-10-22): option (a). A create request may only carry the Pending statusId; any other value is rejected as an invalid request (400). The creation form shows status as a fixed, read-only Pending.
