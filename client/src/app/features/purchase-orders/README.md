# Purchase orders

The `/purchase-orders` route (Epic AB#1429). Behind the `Feature_PurchaseOrders` release toggle: while
it is off, the `featureEnabled` guard does not match and the route falls back to
`pages/purchase-orders-placeholder-page`.

| Folder | Holds |
|---|---|
| `pages/purchase-orders-page/` | The screen: title row, *New purchase order*, filters, the list, pagination and the create modal. Provides the NgRx slice on the lazy route. |
| `components/purchase-order-form/` | The create and edit form in `a-modal`: reference check on blur, customer and SKU typeaheads, server totals, Demo Mode Save. Given an `order` it edits: reference, customer and status locked, existing lines keep their product, *Save changes* waits for a change. |
| `components/purchase-order-list/` | The grid: a table at `lg` and up, cards below; expandable rows, Actions menu, loading, empty and retry states. `statusTemplate` lets a later Story replace the status pill. |
| `components/status-control/` | A row's status: the allowed next statuses (or a pill once final); in Demo Mode all four with the brief's note in an info tooltip. Plugged into the list through `statusTemplate`. |
| `components/monitor-health/` | Monitor Mode's connection chip: Connecting…, Live, or Disconnected with *Refresh the page to reconnect* and a Refresh button. |
| `components/line-items-panel/` | An expanded order's lines, 20 at a time with *Load more*, loaded lazily on first expand. |
| `components/purchase-order-filters/` | Search, customer, status and created-date filters: a filter bar on wide screens, a toolbar and a bottom sheet (*Show N orders*) on narrow ones. |
| `components/customer-multi-select/` | The customer filter: searchable checkbox panel, up to ten customers. |
| `components/date-range-field/` | The created-date filter: From and To dates, a start after the end cannot be applied. |
| `state/` | The `purchaseOrders` feature: query, page, rows, per-order line items; effects call the API and reload after create. |
| `services/purchase-order-monitor-connection.ts` | Monitor Mode's SignalR connection to `/api/v1/hubs/purchase-orders`: subscribing opens it, unsubscribing closes it; it never reconnects on its own. |
| `services/monitor-mode-storage.service.ts` | Remembers Monitor Mode in local storage (`skerp.purchaseOrders.monitorMode`). |
| `services/purchase-orders-api.ts` | Typed calls to the purchase-order, customer and product endpoints. Lookups, calculate and the sheet's count never show the error popup; create, list and get do. |
| `models/purchase-order.ts` | API shapes, currencies (labels and symbols) and status ids. |
| `models/purchase-order-monitor.ts` | Pushed changes, the connection states and the refresh debounce. |
| `models/purchase-order-list.ts` | The list query, page sizes, the customer-filter limit and `toListRequest` (local-day date bounds). |

## Design notes

- **Totals come only from the server.** The form posts every line with valid amounts to
  `purchase-orders/calculate` on a quantity or price blur and on line removal, and shows what comes
  back; it never multiplies or adds an amount. `MoneyPipe` only formats.
- **Normalisation is never re-implemented.** The reference field sends the raw value to the
  availability lookup on blur and shows the normalised value the server returns.
- **Demo Mode** (`selectDemoModeEnabled`) only relaxes the duplicate-reference guard: Save stays
  enabled, danger-styled, with the brief's note under it. Every other client check still applies.
- **The modal is not a native `<dialog>`**: a native modal dialog makes the popup host inert, and a
  Save failure must stay readable and dismissible above the form. `a-modal` traps focus itself.
- A chosen product's SKU and name are locked; to change the product, remove the line and add another.
- Number inputs are native, so the decimal separator follows the browser's locale.
- **The list owns its query in the store.** Every filter, sort or page change dispatches one action;
  the effect reloads with `switchMap`, so a stale response never overwrites a newer one. Search is
  debounced and trimmed; the same text is applied again after the filters were cleared.
- **Line items load once per order**, on first expand, and are kept while the page is shown.
- **After create**, page 1 with no filter gets the new order prepended; anything else reloads the
  current page, so a filtered list never shows an order outside its filters.
- **Breakpoints:** the table and filter bar from `lg` (`ViewportService.isWide`); below it, cards, the
  filter toolbar and the sheet. Below `lg` the title row stacks and *New purchase order* is full width.
- **The status control never mirrors the rules.** It offers `allowedStatusIds` from the server; Demo
  Mode offers every status (terminal orders too) so the server's refusal can be seen. The row
  changes only when the server accepts; a refusal leaves it as it was, with the error popup. Under a
  status filter, a row that leaves the filter reloads the page.
- **Editing reads the whole order.** Actions → Edit loads the order with every line
  (`getForEdit`, at most 100), not the list's 20-line cache. Edit is shown disabled when the server's
  `isEditable` is false. After a save the row is replaced and an expanded row's lines reload.
- **Deleting asks first.** Actions → Delete (disabled unless `isDeletable`) opens `a-confirm-modal`;
  confirming soft-deletes on the server (204) and reloads the page, stepping back a page if it emptied
  the last one.
- **How the screen changes data.** A status change goes through the store (an effect calls the API).
  Create, edit and delete call the API from the form or page and then tell the store the outcome
  (`orderCreated`, `orderEdited`, `orderDeleted`). Either way the server's answer is what the list
  shows, and a refused change or delete reloads the page so a stale row refreshes. A new mutation
  should follow the store pattern (an action, an effect, an outcome action) unless it lives in a form.
- **Monitor Mode** (Feature AB#1482) is a toggle in the title row. On, it hides *New purchase order*,
  the Actions menus and line-item expansion (the list's `monitor` input), keeps the status control,
  and holds a SignalR connection open (`monitorConnection` effect). The hub pushes only
  `{ id, change }`; `refreshOnMonitorChange` fetches the current page again with the current query
  (`PurchaseOrdersApi.refresh`, quiet on failure, no loading state), once per 300 ms burst. Leaving the
  screen closes the connection; the choice is remembered, so the disconnected chip's Refresh comes
  back in Monitor Mode. Off, the screen is exactly as without it.
- **Monitor Mode animations.** `monitorRefreshed` compares the old and new page: arriving and leaving
  rows (`rowChanges.entering`/`leaving`) get `po-row--entering`/`po-row--leaving` through
  `(animate.enter)`/`(animate.leave)`, and in-place changes are highlighted for 2 s (`expireMonitorHighlights`
  clears only its own refresh). Body cells wrap their content in `.po-table__cell` so a table row can
  grow and shrink; with Monitor Mode off nothing animates.

