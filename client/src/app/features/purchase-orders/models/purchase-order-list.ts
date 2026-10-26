import { LineItem, NamedValue } from './purchase-order';

/** A row of the purchase-order list; line items load separately when the row is expanded. */
export interface PurchaseOrderListItem {
  readonly id: string;
  readonly reference: string;
  readonly createdAt: string;
  readonly customer: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
  };
  readonly currency: NamedValue;
  readonly status: NamedValue;
  readonly total: number;
  readonly lineItemCount: number;
  /** The statuses the server allows next; empty once the order is Fulfilled or Cancelled. */
  readonly allowedStatusIds: readonly number[];
  /** True while the order may be edited (Pending only), from the server. */
  readonly isEditable: boolean;
  /** True while the order may be deleted (Pending only), from the server. */
  readonly isDeletable: boolean;
}

export interface PagedResponse<TItem> {
  readonly data: readonly TItem[];
  readonly totalCount: number;
}

/** A customer chosen in the filter: the id is sent, the name labels its pill. */
export interface CustomerFilter {
  readonly id: string;
  readonly name: string;
}

export type CreatedSort = 'createdAt desc' | 'createdAt asc';

/**
 * What the list shows: the filters (all optional, combined), the sort and the page (1-based).
 * Dates are the user's local calendar dates (`yyyy-mm-dd`), inclusive.
 */
export interface PurchaseOrderListQuery {
  readonly search: string;
  readonly statusId: number | null;
  readonly customers: readonly CustomerFilter[];
  readonly createdFrom: string | null;
  readonly createdTo: string | null;
  readonly sorting: CreatedSort;
  readonly page: number;
}

export const PAGE_SIZE = 10;
export const LINE_ITEMS_PAGE_SIZE = 20;
export const MAX_CUSTOMER_FILTERS = 10;

export const EMPTY_QUERY: PurchaseOrderListQuery = {
  search: '',
  statusId: null,
  customers: [],
  createdFrom: null,
  createdTo: null,
  sorting: 'createdAt desc',
  page: 1,
};

/** How many filters are set (the mobile Filters button shows it). The search counts separately. */
export function activeFilterCount(query: PurchaseOrderListQuery): number {
  return (
    (query.statusId !== null ? 1 : 0) +
    (query.customers.length > 0 ? 1 : 0) +
    (query.createdFrom !== null || query.createdTo !== null ? 1 : 0)
  );
}

export function hasAnyFilter(query: PurchaseOrderListQuery): boolean {
  return query.search.trim().length > 0 || activeFilterCount(query) > 0;
}

/** The request body for `POST purchase-orders/list`: local dates become the user's day bounds. */
export function toListRequest(query: PurchaseOrderListQuery, pageSize = PAGE_SIZE): object {
  return {
    search: query.search.trim() || null,
    statusId: query.statusId,
    customerIds: query.customers.map((c) => c.id),
    createdMin: query.createdFrom ? startOfLocalDay(query.createdFrom).toISOString() : null,
    createdMax: query.createdTo ? endOfLocalDay(query.createdTo).toISOString() : null,
    sorting: query.sorting,
    skipCount: (query.page - 1) * pageSize,
    maxResultCount: pageSize,
  };
}

function startOfLocalDay(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function endOfLocalDay(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

/** The expanded rows' lazily loaded line items. */
export interface LineItemsState {
  readonly items: readonly LineItem[];
  readonly totalCount: number;
  readonly loading: boolean;
  readonly failed: boolean;
}
