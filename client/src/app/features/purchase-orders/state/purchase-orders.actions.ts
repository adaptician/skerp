import { createActionGroup, emptyProps, props } from '@ngrx/store';

import { LineItem, PurchaseOrder } from '../models/purchase-order';
import { MonitorConnectionState, PurchaseOrderChange } from '../models/purchase-order-monitor';
import { PurchaseOrderListItem, PurchaseOrderListQuery } from '../models/purchase-order-list';

/** Things that happen on the Purchase Orders screen, named after the event. */
export const PurchaseOrdersActions = createActionGroup({
  source: 'Purchase Orders',
  events: {
    /** The screen opened; show the first page with the current query. */
    Opened: emptyProps(),
    /** The screen closed; Monitor Mode's connection closes with it. */
    Closed: emptyProps(),
    /** Filters or search changed; the list returns to page 1. */
    'Query Changed': props<{ changes: Partial<Omit<PurchaseOrderListQuery, 'page'>> }>(),
    /** Every filter and the search were cleared. */
    'Filters Cleared': emptyProps(),
    'Page Changed': props<{ page: number }>(),
    'Sort Toggled': emptyProps(),
    /** The user asked to try a failed load again. */
    Retried: emptyProps(),
    Loaded: props<{ items: readonly PurchaseOrderListItem[]; totalCount: number }>(),
    'Load Failed': emptyProps(),
    /** A row was expanded or collapsed (chevron, card toggle, or Actions → View). */
    'Row Toggled': props<{ id: string }>(),
    'Line Items Requested': props<{ id: string; skip: number }>(),
    'Line Items Loaded': props<{
      id: string;
      items: readonly LineItem[];
      totalCount: number;
      append: boolean;
    }>(),
    'Line Items Load Failed': props<{ id: string }>(),
    /** The user picked a status in a row's status control. */
    'Status Change Requested': props<{ id: string; statusId: number }>(),
    /** The server accepted the change; carries the updated row. */
    'Status Changed': props<{ order: PurchaseOrderListItem }>(),
    /** The server refused the change (the error popup says why); the row keeps its status. */
    'Status Change Failed': props<{ id: string }>(),
    /** The server deleted an order; the page reloads so it stays full. */
    'Order Deleted': props<{ id: string }>(),
    /** The edit form saved an order; carries the updated row. */
    'Order Edited': props<{ order: PurchaseOrderListItem }>(),
    /** The create form saved an order; carries the server's copy. */
    'Order Created': props<{ order: PurchaseOrder }>(),
    /** Monitor Mode was switched on or off (by the user, or restored when the screen opened). */
    'Monitor Mode Toggled': props<{ enabled: boolean }>(),
    /** The live connection connected, or dropped. */
    'Monitor Connection Changed': props<{ connection: MonitorConnectionState }>(),
    /** The hub pushed a change to an order. */
    'Monitor Change Received': props<{ change: PurchaseOrderChange }>(),
    /** A refresh's highlights have shown for their 2 seconds. */
    'Monitor Highlights Expired': props<{ refresh: number }>(),
    /** The current page, fetched again after pushed changes; no loading state was shown. */
    'Monitor Refreshed': props<{
      /** The query the page was fetched with; a refresh for an older query is dropped. */
      query: PurchaseOrderListQuery;
      items: readonly PurchaseOrderListItem[];
      totalCount: number;
      changes: readonly PurchaseOrderChange[];
    }>(),
  },
});
