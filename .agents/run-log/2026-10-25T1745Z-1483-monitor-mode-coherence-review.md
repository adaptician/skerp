---
work-item: 1483
summary: >
  Coherence review of Monitor Mode (fresh-context subagent) — one blocking stale-refresh race fixed,
  advisories surfaced for the product owner.
---
# Monitor Mode coherence review (AB#1483)

## What changed

A fresh-context review against the product owner's objective found the build serves it, with one
blocking gap, fixed here:

- **Blocking — fixed:** a Monitor Mode refresh sent under one query could land after the user changed
  the query and overwrite the grid with the old query's rows. `monitorRefreshed` now carries its query
  and the reducer drops it when the query changed or a load is pending (reducer test added).
- **Advisory — fixed:** refreshes waited for a 300 ms quiet gap (`debounceTime`), so a constant stream
  of changes never refreshed; it is now `auditTime` (test added).
- **Advisory — recorded:** `Clients.All` covers one API instance only; added to the Feature plan's out of
  scope (the Deliverable runs locally, deployments out of scope).

Advisories left for the product owner, in the PR's reviewer notes:

- rows pushed off or pulled onto the page by a create, delete or filter shift animate like a created or
  deleted row (a shrink-and-fade may read as "deleted");
- a failed background refresh is silent while the chip still says Live;
- the Monitor Mode toggle is new on the title row (approved as a prose surface), and Monitor Mode off now
  wraps each body cell's content — measured identical at 1400px only;
- Monitor Mode is remembered in local storage with no expiry, shared across tabs;
- the hub is anonymous, like the rest of the API.

## What surprised you

- The race needed no network fault: a filter change during a 300 ms burst was enough.

## What you assumed

- Dropping a stale refresh is safe because the user's own load shows the current query's page; the
  next push refreshes it again.
