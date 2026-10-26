import { createFeature, createReducer, createSelector, on } from '@ngrx/store';

import {
  EMPTY_QUERY,
  LineItemsState,
  PAGE_SIZE,
  PurchaseOrderListItem,
  PurchaseOrderListQuery,
  hasAnyFilter,
} from '../models/purchase-order-list';
import {
  MonitorConnectionState,
  NO_ROW_CHANGES,
  RowChanges,
  RowHighlightKind,
} from '../models/purchase-order-monitor';
import { PurchaseOrdersActions } from './purchase-orders.actions';

export interface PurchaseOrdersState {
  readonly query: PurchaseOrderListQuery;
  readonly items: readonly PurchaseOrderListItem[];
  readonly totalCount: number;
  readonly loading: boolean;
  readonly failed: boolean;
  /** Ids of the expanded rows. */
  readonly expanded: readonly string[];
  readonly lineItems: Readonly<Record<string, LineItemsState>>;
  /** Ids of the rows whose status change is with the server. */
  readonly statusChanging: readonly string[];
  /** Monitor Mode: on or off, and its live connection's state. */
  readonly monitor: MonitorState;
}

export interface MonitorState {
  readonly enabled: boolean;
  readonly connection: MonitorConnectionState;
  /** Counts refreshes, so a highlight's expiry only clears the refresh that set it. */
  readonly refresh: number;
  /** Rows that arrived and left in the last refresh. */
  readonly entering: readonly string[];
  readonly leaving: readonly string[];
  /** Rows that changed in place, each with the refresh that highlighted it. */
  readonly highlights: Readonly<Record<string, { kind: RowHighlightKind; refresh: number }>>;
}

const MONITOR_OFF: MonitorState = {
  enabled: false,
  connection: 'off',
  refresh: 0,
  entering: [],
  leaving: [],
  highlights: {},
};

/** Monitor Mode with no row animations pending. */
const settled = (monitor: MonitorState): MonitorState => ({
  ...monitor,
  entering: [],
  leaving: [],
  highlights: {},
});

export const initialPurchaseOrdersState: PurchaseOrdersState = {
  query: EMPTY_QUERY,
  items: [],
  totalCount: 0,
  loading: false,
  failed: false,
  expanded: [],
  lineItems: {},
  statusChanging: [],
  monitor: MONITOR_OFF,
};

const startLoading = (state: PurchaseOrdersState): PurchaseOrdersState => ({
  ...state,
  loading: true,
  failed: false,
});

/**
 * The list screen's state: the query, the page of rows the server returned, and the line items of
 * expanded rows. Every amount in it is the server's.
 */
export const purchaseOrdersFeature = createFeature({
  name: 'purchaseOrders',
  reducer: createReducer(
    initialPurchaseOrdersState,
    on(PurchaseOrdersActions.opened, PurchaseOrdersActions.retried, startLoading),
    on(PurchaseOrdersActions.queryChanged, (state, { changes }) =>
      startLoading({ ...state, query: { ...state.query, ...changes, page: 1 } }),
    ),
    on(PurchaseOrdersActions.filtersCleared, (state) =>
      startLoading({ ...state, query: { ...EMPTY_QUERY, sorting: state.query.sorting } }),
    ),
    on(PurchaseOrdersActions.pageChanged, (state, { page }) =>
      startLoading({ ...state, query: { ...state.query, page } }),
    ),
    on(PurchaseOrdersActions.sortToggled, (state) =>
      startLoading({
        ...state,
        query: {
          ...state.query,
          sorting: state.query.sorting === 'createdAt desc' ? 'createdAt asc' : 'createdAt desc',
          page: 1,
        },
      }),
    ),
    on(PurchaseOrdersActions.loaded, (state, { items, totalCount }) => ({
      ...state,
      // A page the user asked for appears as it is; only pushed changes animate.
      monitor: settled(state.monitor),
      items,
      totalCount,
      loading: false,
      failed: false,
      expanded: state.expanded.filter((id) => items.some((item) => item.id === id)),
    })),
    on(PurchaseOrdersActions.loadFailed, (state) => ({ ...state, loading: false, failed: true })),
    on(PurchaseOrdersActions.rowToggled, (state, { id }) => ({
      ...state,
      expanded: state.expanded.includes(id)
        ? state.expanded.filter((expandedId) => expandedId !== id)
        : [...state.expanded, id],
    })),
    on(PurchaseOrdersActions.lineItemsRequested, (state, { id }) => ({
      ...state,
      lineItems: {
        ...state.lineItems,
        [id]: {
          items: state.lineItems[id]?.items ?? [],
          totalCount: state.lineItems[id]?.totalCount ?? 0,
          loading: true,
          failed: false,
        },
      },
    })),
    on(PurchaseOrdersActions.lineItemsLoaded, (state, { id, items, totalCount, append }) => ({
      ...state,
      lineItems: {
        ...state.lineItems,
        [id]: {
          items: append ? [...(state.lineItems[id]?.items ?? []), ...items] : items,
          totalCount,
          loading: false,
          failed: false,
        },
      },
    })),
    on(PurchaseOrdersActions.lineItemsLoadFailed, (state, { id }) => ({
      ...state,
      lineItems: {
        ...state.lineItems,
        [id]: {
          items: state.lineItems[id]?.items ?? [],
          totalCount: state.lineItems[id]?.totalCount ?? 0,
          loading: false,
          failed: true,
        },
      },
    })),
    on(PurchaseOrdersActions.statusChangeRequested, (state, { id }) => ({
      ...state,
      statusChanging: [...state.statusChanging, id],
    })),
    on(PurchaseOrdersActions.statusChanged, (state, { order }) => ({
      ...state,
      items: state.items.map((item) => (item.id === order.id ? order : item)),
      statusChanging: state.statusChanging.filter((id) => id !== order.id),
    })),
    on(PurchaseOrdersActions.statusChangeFailed, (state, { id }) =>
      startLoading({
        ...state,
        statusChanging: state.statusChanging.filter((changingId) => changingId !== id),
      }),
    ),
    on(PurchaseOrdersActions.orderDeleted, (state, { id }) => {
      // The last row of a later page: step back a page, so the list never lands on an empty one.
      const page =
        state.query.page > 1 && state.items.length === 1 ? state.query.page - 1 : state.query.page;
      const lineItems = { ...state.lineItems };
      delete lineItems[id];
      return startLoading({
        ...state,
        query: { ...state.query, page },
        expanded: state.expanded.filter((expandedId) => expandedId !== id),
        lineItems,
      });
    }),
    on(PurchaseOrdersActions.orderEdited, (state, { order }) => {
      // Its lines changed on the server: the cached pages are dropped, and reloaded if expanded.
      const lineItems = { ...state.lineItems };
      delete lineItems[order.id];
      return {
        ...state,
        items: state.items.map((item) => (item.id === order.id ? order : item)),
        lineItems,
      };
    }),
    on(PurchaseOrdersActions.monitorModeToggled, (state, { enabled }) => ({
      ...state,
      // Rows cannot be expanded or collapsed in Monitor Mode, so none stay open.
      expanded: enabled ? [] : state.expanded,
      monitor: { ...settled(state.monitor), enabled, connection: enabled ? 'connecting' : 'off' },
    })),
    on(PurchaseOrdersActions.monitorConnectionChanged, (state, { connection }) =>
      state.monitor.enabled ? { ...state, monitor: { ...state.monitor, connection } } : state,
    ),
    on(PurchaseOrdersActions.closed, (state) => ({
      ...state,
      monitor: { ...state.monitor, connection: 'off' },
    })),
    on(PurchaseOrdersActions.monitorRefreshed, (state, { query, items, totalCount, changes }) => {
      // The user changed the query (or a load is on its way) since this refresh was sent.
      if (query !== state.query || state.loading) {
        return state;
      }
      const refresh = state.monitor.refresh + 1;
      const before = new Set(state.items.map((item) => item.id));
      const after = new Set(items.map((item) => item.id));
      const highlights = { ...state.monitor.highlights };
      for (const { id, change } of changes) {
        if (
          (change === 'edited' || change === 'statusChanged') &&
          before.has(id) &&
          after.has(id)
        ) {
          highlights[id] = { kind: change, refresh };
        }
      }
      return {
        ...state,
        items,
        totalCount,
        failed: false,
        monitor: {
          ...state.monitor,
          refresh,
          entering: items.filter((item) => !before.has(item.id)).map((item) => item.id),
          leaving: state.items.filter((item) => !after.has(item.id)).map((item) => item.id),
          highlights,
        },
      };
    }),
    on(PurchaseOrdersActions.monitorHighlightsExpired, (state, { refresh }) => ({
      ...state,
      monitor: {
        ...state.monitor,
        highlights: Object.fromEntries(
          Object.entries(state.monitor.highlights).filter(
            ([, highlight]) => highlight.refresh !== refresh,
          ),
        ),
      },
    })),
    on(PurchaseOrdersActions.orderCreated, (state, { order }) => {
      // On the unfiltered first page, newest first, the new order belongs at the top; anywhere
      // else the effect reloads the page so a filtered list never shows an order outside it.
      if (!showsNewestUnfiltered(state.query)) {
        return state;
      }

      const row: PurchaseOrderListItem = {
        id: order.id,
        reference: order.reference,
        createdAt: order.createdAt,
        customer: order.customer,
        currency: order.currency,
        status: order.status,
        total: order.total,
        lineItemCount: order.lineItemCount,
        allowedStatusIds: order.allowedStatusIds,
        isEditable: order.isEditable,
        isDeletable: order.isDeletable,
      };
      return {
        ...state,
        items: [row, ...state.items].slice(0, PAGE_SIZE),
        totalCount: state.totalCount + 1,
      };
    }),
  ),
  extraSelectors: ({ selectQuery, selectMonitor }) => ({
    selectHasFilters: createSelector(selectQuery, hasAnyFilter),
    selectRowChanges: createSelector(selectMonitor, (monitor): RowChanges =>
      monitor.enabled
        ? {
            entering: monitor.entering,
            leaving: monitor.leaving,
            highlights: Object.fromEntries(
              Object.entries(monitor.highlights).map(([id, { kind }]) => [id, kind]),
            ),
          }
        : NO_ROW_CHANGES,
    ),
  }),
});

/** True when the list shows the first page of every order, newest first. */
export function showsNewestUnfiltered(query: PurchaseOrderListQuery): boolean {
  return query.page === 1 && query.sorting === 'createdAt desc' && !hasAnyFilter(query);
}

export const {
  selectQuery,
  selectItems,
  selectTotalCount,
  selectLoading,
  selectFailed,
  selectExpanded,
  selectLineItems,
  selectHasFilters,
  selectStatusChanging,
  selectMonitor,
  selectRowChanges,
} = purchaseOrdersFeature;
