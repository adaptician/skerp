# Purchase Order Management — Epic overview (AB#1429)

A small internal sales team can view, search and filter a paginated list of customer purchase orders and
expand any order to see its line items. They can create orders with line items, edit Pending orders,
move an order through its status lifecycle, and soft-delete Pending orders. The backend enforces
normalisation, totals, state transitions and integrity. Demo Mode shows reviewers that the client's
conveniences are never what protects the data.

Human-authored inputs: [`brief.md`](brief.md), [`api.md`](api.md), [`entities.md`](entities.md).
Depends on the Solution Preparation Epic ([`../solution-preparation/README.md`](../solution-preparation/README.md)):
solution setup, the shell with Demo Mode, and the approved design (AB#1463).

## Features

| Feature | ADO | Plan |
|---|---|---|
| Purchase Order CRUD | AB#1433 | [`features/purchase-order-crud/README.md`](features/purchase-order-crud/README.md) |
| Purchase Order State Machine | AB#1436 | [`features/purchase-order-state-machine/README.md`](features/purchase-order-state-machine/README.md) |
| Purchase Order Monitor Mode | AB#1482 | [`features/purchase-order-monitor-mode/README.md`](features/purchase-order-monitor-mode/README.md) |

**Why this split.** A Feature is a complete whole. Viewing, creating, editing and deleting orders is one
capability, so it is one Feature, delivered as four Stories that each keep their own end-to-end context:
persistence, endpoints, UI and tests together. Status transitions are a separate, self-contained rule
set, so they form a second Feature.

**Order.**

1. Create (AB#1466) and List (AB#1467).
2. Update Status (AB#1470), so `PurchaseOrderStatusContext` exists before the Pending guards are needed.
3. Edit (AB#1468) and Delete (AB#1469).
4. Monitor Mode (AB#1483), added 2026-10-25 after the first two Features merged: a live, read-mostly
   view of the list over SignalR. It observes every operation the first two Features built.

Re-planned 2026-10-22 from an earlier five-Feature split. The merge map is in the comments on AB#1433
and AB#1436.
