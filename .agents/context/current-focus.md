# Current focus

Purchase Order Management (Epic AB#1429,
[overview](../specs/epics/purchase-order-management/README.md)): the CRUD and State Machine Features
merged to `main` in PR 728. Solution Preparation (Epic AB#1428) is merged.

## Active work

- **Monitor Mode** (Feature AB#1482, Story AB#1483,
  [spec](../specs/epics/purchase-order-management/features/purchase-order-monitor-mode/work/monitor-purchase-orders/spec.md)):
  primary branch `feat/purchase-order-management/monitor-purchase-orders`, cut from `main`; milestone
  branches merge into it, and its PR goes to `main`. Introduces SignalR (`/api/v1/hubs/purchase-orders`).
- **Release toggle:** `Feature_PurchaseOrders` (off in `appsettings.json`, on in the `http` launch
  profile). The client's `featureEnabled` guard falls back to a placeholder page while it is off.
- **Design is approved.** All 55 Sales frames are recorded as approved (Tyler Pieterse, 2026-10-22) in
  the screen index, with fingerprints. Cite frames from the index; `design-fidelity-check` verifies them.
- **Planning depth ladder suspended.** The product owner ruled that the no-spec-above-8-points rule is
  not working, and it is to be ignored until it is resolved. Stories here run up to 21 points.

## Open decisions

None. [ADR 0001](../adrs/0001-angular-client-in-client-folder.md) is Accepted (measured 2026-10-22).

## Live constraints

- The governance tree (`.agents/`, `.claude/`, `.codex/`) is committed from 2026-10-23, so the gate,
  standards, screen index, this context pack and `.mcp.json` travel with the repository.
- The developer's name, photo and links on the welcome screen are placeholders until supplied.
- Superseded work items AB#1434, 1435, 1437 and 1438–1462 are in the `Removed` state, awaiting optional
  hard-delete by a human.
