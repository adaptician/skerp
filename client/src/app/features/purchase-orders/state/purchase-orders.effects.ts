import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  EMPTY,
  auditTime,
  buffer,
  catchError,
  concatMap,
  filter,
  map,
  mergeMap,
  of,
  switchMap,
  take,
  tap,
  timer,
  withLatestFrom,
} from 'rxjs';

import { NotificationService } from '../../../common/services/notification.service';
import { LINE_ITEMS_PAGE_SIZE } from '../models/purchase-order-list';
import {
  MONITOR_HIGHLIGHT_MS,
  MONITOR_REFRESH_DEBOUNCE_MS,
} from '../models/purchase-order-monitor';
import { MonitorModeStorageService } from '../services/monitor-mode-storage.service';
import { PurchaseOrderMonitorConnection } from '../services/purchase-order-monitor-connection';
import { PurchaseOrdersApi } from '../services/purchase-orders-api';
import { PurchaseOrdersActions } from './purchase-orders.actions';
import {
  selectExpanded,
  selectLineItems,
  selectMonitor,
  selectQuery,
  showsNewestUnfiltered,
} from './purchase-orders.feature';

/** Loads the page the query describes; a newer query cancels a load still in flight. */
export const loadPurchaseOrders = createEffect(
  (actions = inject(Actions), store = inject(Store), api = inject(PurchaseOrdersApi)) =>
    actions.pipe(
      ofType(
        PurchaseOrdersActions.opened,
        PurchaseOrdersActions.queryChanged,
        PurchaseOrdersActions.filtersCleared,
        PurchaseOrdersActions.pageChanged,
        PurchaseOrdersActions.sortToggled,
        PurchaseOrdersActions.retried,
        PurchaseOrdersActions.orderDeleted,
        // A refusal can mean the row is stale (changed elsewhere): show what the server holds now.
        PurchaseOrdersActions.statusChangeFailed,
      ),
      withLatestFrom(store.select(selectQuery)),
      switchMap(([, query]) =>
        api.list(query).pipe(
          map((page) =>
            PurchaseOrdersActions.loaded({ items: page.data, totalCount: page.totalCount }),
          ),
          catchError(() => of(PurchaseOrdersActions.loadFailed())),
        ),
      ),
    ),
  { functional: true },
);

/** Expanding a row the first time loads its first page of line items. */
export const loadLineItemsOnExpand = createEffect(
  (actions = inject(Actions), store = inject(Store)) =>
    actions.pipe(
      ofType(PurchaseOrdersActions.rowToggled),
      withLatestFrom(store.select(selectExpanded), store.select(selectLineItems)),
      filter(
        ([{ id }, expanded, lineItems]) =>
          expanded.includes(id) && !lineItems[id]?.items.length && !lineItems[id]?.loading,
      ),
      map(([{ id }]) => PurchaseOrdersActions.lineItemsRequested({ id, skip: 0 })),
    ),
  { functional: true },
);

/** Fetches one page of an order's line items (20 at a time). */
export const loadLineItems = createEffect(
  (actions = inject(Actions), api = inject(PurchaseOrdersApi)) =>
    actions.pipe(
      ofType(PurchaseOrdersActions.lineItemsRequested),
      mergeMap(({ id, skip }) =>
        api.get(id, skip, LINE_ITEMS_PAGE_SIZE).pipe(
          map((order) =>
            PurchaseOrdersActions.lineItemsLoaded({
              id,
              items: order.lineItems,
              totalCount: order.lineItemCount,
              append: skip > 0,
            }),
          ),
          catchError(() => of(PurchaseOrdersActions.lineItemsLoadFailed({ id }))),
        ),
      ),
    ),
  { functional: true },
);

/** An edited order that is expanded shows its new lines straight away. */
export const reloadLinesAfterEdit = createEffect(
  (actions = inject(Actions), store = inject(Store)) =>
    actions.pipe(
      ofType(PurchaseOrdersActions.orderEdited),
      withLatestFrom(store.select(selectExpanded)),
      filter(([{ order }, expanded]) => expanded.includes(order.id)),
      map(([{ order }]) => PurchaseOrdersActions.lineItemsRequested({ id: order.id, skip: 0 })),
    ),
  { functional: true },
);

/** A created order that the reducer could not place (filters, another page) reloads the page. */
export const reloadAfterCreate = createEffect(
  (actions = inject(Actions), store = inject(Store)) =>
    actions.pipe(
      ofType(PurchaseOrdersActions.orderCreated),
      withLatestFrom(store.select(selectQuery)),
      filter(([, query]) => !showsNewestUnfiltered(query)),
      map(() => PurchaseOrdersActions.retried()),
    ),
  { functional: true },
);

/** Sends a status change; the row changes only when the server accepts it. */
export const changeStatus = createEffect(
  (actions = inject(Actions), api = inject(PurchaseOrdersApi)) =>
    actions.pipe(
      ofType(PurchaseOrdersActions.statusChangeRequested),
      mergeMap(({ id, statusId }) =>
        api.updateStatus(id, statusId).pipe(
          map((order) => PurchaseOrdersActions.statusChanged({ order })),
          // The error popup ("Status change not allowed") carries the server's reason.
          catchError(() => of(PurchaseOrdersActions.statusChangeFailed({ id }))),
        ),
      ),
    ),
  { functional: true },
);

/** Under a status filter, a row that moved to another status no longer belongs: reload the page. */
export const reloadAfterStatusChange = createEffect(
  (actions = inject(Actions), store = inject(Store)) =>
    actions.pipe(
      ofType(PurchaseOrdersActions.statusChanged),
      withLatestFrom(store.select(selectQuery)),
      filter(([{ order }, query]) => query.statusId !== null && order.status.id !== query.statusId),
      map(() => PurchaseOrdersActions.retried()),
    ),
  { functional: true },
);

/** Confirms an accepted status change with a success popup. */
export const confirmStatusChange = createEffect(
  (actions = inject(Actions), notifications = inject(NotificationService)) =>
    actions.pipe(
      ofType(PurchaseOrdersActions.statusChanged),
      tap(({ order }) =>
        notifications.showSuccess(
          'Status updated',
          `${order.reference} is now ${order.status.name}.`,
        ),
      ),
    ),
  { functional: true, dispatch: false },
);

/**
 * Opening the screen turns Monitor Mode back on if it was on when the user left (still in the store)
 * or refreshed (in storage), so the connection always reopens with it.
 */
export const restoreMonitorMode = createEffect(
  (actions = inject(Actions), store = inject(Store), storage = inject(MonitorModeStorageService)) =>
    actions.pipe(
      ofType(PurchaseOrdersActions.opened),
      withLatestFrom(store.select(selectMonitor)),
      filter(([, monitor]) => monitor.enabled || storage.read()),
      map(() => PurchaseOrdersActions.monitorModeToggled({ enabled: true })),
    ),
  { functional: true },
);

/** Remembers every Monitor Mode switch. */
export const rememberMonitorMode = createEffect(
  (actions = inject(Actions), storage = inject(MonitorModeStorageService)) =>
    actions.pipe(
      ofType(PurchaseOrdersActions.monitorModeToggled),
      tap(({ enabled }) => storage.write(enabled)),
    ),
  { functional: true, dispatch: false },
);

/**
 * Holds the live connection open while Monitor Mode is on: switching it off, or closing the screen,
 * unsubscribes and so closes the connection.
 */
export const monitorConnection = createEffect(
  (actions = inject(Actions), connection = inject(PurchaseOrderMonitorConnection)) =>
    actions.pipe(
      ofType(PurchaseOrdersActions.monitorModeToggled, PurchaseOrdersActions.closed),
      switchMap((action) =>
        action.type === PurchaseOrdersActions.monitorModeToggled.type && action.enabled
          ? connection
              .connect()
              .pipe(
                map((event) =>
                  event.kind === 'state'
                    ? PurchaseOrdersActions.monitorConnectionChanged({ connection: event.state })
                    : PurchaseOrdersActions.monitorChangeReceived({ change: event.change }),
                ),
              )
          : EMPTY,
      ),
    ),
  { functional: true },
);

/**
 * Fetches the current page again, with the current query and no loading state, after pushed changes.
 * Fetches run one after another, so each batch of changes lands on the page it produced.
 */
export const refreshOnMonitorChange = createEffect(
  (actions = inject(Actions), store = inject(Store), api = inject(PurchaseOrdersApi)) => {
    const changes = actions.pipe(
      ofType(PurchaseOrdersActions.monitorChangeReceived),
      map(({ change }) => change),
    );
    return changes.pipe(
      // auditTime, not debounceTime: a steady stream of changes still refreshes every 300 ms.
      buffer(changes.pipe(auditTime(MONITOR_REFRESH_DEBOUNCE_MS))),
      concatMap((batch) =>
        store.select(selectMonitor).pipe(
          take(1),
          filter((monitor) => monitor.enabled),
          withLatestFrom(store.select(selectQuery)),
          switchMap(([, query]) => api.refresh(query).pipe(map((page) => ({ query, page })))),
          map(({ query, page }) =>
            PurchaseOrdersActions.monitorRefreshed({
              query,
              items: page.data,
              totalCount: page.totalCount,
              changes: batch,
            }),
          ),
          // The rows on screen stay; the next pushed change tries again.
          catchError(() => EMPTY),
        ),
      ),
    );
  },
  { functional: true },
);

/** Each refresh's highlights fade after 2 seconds; a later refresh of the same row keeps its own. */
export const expireMonitorHighlights = createEffect(
  (actions = inject(Actions), store = inject(Store)) =>
    actions.pipe(
      ofType(PurchaseOrdersActions.monitorRefreshed),
      withLatestFrom(store.select(selectMonitor)),
      mergeMap(([, { refresh }]) =>
        timer(MONITOR_HIGHLIGHT_MS).pipe(
          map(() => PurchaseOrdersActions.monitorHighlightsExpired({ refresh })),
        ),
      ),
    ),
  { functional: true },
);
