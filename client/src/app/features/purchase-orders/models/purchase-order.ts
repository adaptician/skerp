import { StatusPillStatus } from '../../../common/components/status-pill/status-pill';

/** An enum value with its display name, as the API returns it. */
export interface NamedValue {
  readonly id: number;
  readonly name: string;
}

/** Currencies (entities.md → CurrencyId) with the labels and symbols the UI shows. */
export const CURRENCIES = [
  { id: 1, code: 'ZAR', label: 'ZAR — South African rand', symbol: 'R' },
  { id: 2, code: 'USD', label: 'USD — US dollar', symbol: '$' },
  { id: 3, code: 'EUR', label: 'EUR — Euro', symbol: '€' },
] as const;

export type CurrencyId = (typeof CURRENCIES)[number]['id'];

export const DEFAULT_CURRENCY_ID: CurrencyId = 1;

/** The currency symbol for a currency id; the code itself if the id is unknown. */
export function currencySymbol(currency: NamedValue | number): string {
  const id = typeof currency === 'number' ? currency : currency.id;
  return (
    CURRENCIES.find((c) => c.id === id)?.symbol ??
    (typeof currency === 'number' ? '' : currency.name)
  );
}

/** Statuses (entities.md → StatusId). Values match the server's. */
export const STATUS = {
  pending: 10,
  confirmed: 20,
  fulfilled: 60,
  cancelled: 90,
} as const;

export type StatusId = (typeof STATUS)[keyof typeof STATUS];

/** Every status in lifecycle order, with the name the UI shows. */
export const STATUS_OPTIONS: readonly NamedValue[] = [
  { id: STATUS.pending, name: 'Pending' },
  { id: STATUS.confirmed, name: 'Confirmed' },
  { id: STATUS.fulfilled, name: 'Fulfilled' },
  { id: STATUS.cancelled, name: 'Cancelled' },
];

/** The status pill colour for a status id. */
export function statusPill(statusId: number): StatusPillStatus {
  switch (statusId) {
    case STATUS.confirmed:
      return 'confirmed';
    case STATUS.fulfilled:
      return 'fulfilled';
    case STATUS.cancelled:
      return 'cancelled';
    default:
      return 'pending';
  }
}

export interface LineItem {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly price: number;
  readonly total: number;
}

/** A purchase order as the API returns it. `createdAt` is an ISO 8601 UTC timestamp. */
export interface PurchaseOrder {
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
  readonly lineItems: readonly LineItem[];
  readonly lineItemCount: number;
  readonly total: number;
  readonly notes: string | null;
  /** The statuses the server allows next; empty once the order is Fulfilled or Cancelled. */
  readonly allowedStatusIds: readonly number[];
  /** True while the order may be edited (Pending only), from the server. */
  readonly isEditable: boolean;
  /** True while the order may be deleted (Pending only), from the server. */
  readonly isDeletable: boolean;
}

/** A product chosen by id, or a new product by SKU and name. */
export type ProductRequest = { id: string } | { sku: string; name: string };

export interface LineItemRequest {
  /** An existing line on an edit; absent for a new line. */
  readonly id?: string;
  readonly product: ProductRequest;
  readonly quantity: number;
  readonly price: number;
}

export interface CreatePurchaseOrderRequest {
  readonly reference: string;
  readonly customer: { id: string } | { name: string; email: string };
  readonly currencyId: number;
  readonly statusId: number;
  readonly lineItems: readonly LineItemRequest[];
  readonly notes: string | null;
}

/** An edit: currency, notes and every line; a line with an `id` is an existing one. */
export interface EditPurchaseOrderRequest {
  readonly currencyId: number;
  readonly lineItems: readonly LineItemRequest[];
  readonly notes: string | null;
}

export interface CalculateTotalsRequest {
  readonly lineItems: readonly { id: string; quantity: number; price: number }[];
}

export interface CalculatedTotals {
  readonly lineItems: readonly { id: string; total: number }[];
  readonly total: number;
}

export interface ReferenceAvailability {
  readonly reference: string;
  readonly isAvailable: boolean;
}

export interface LookupResponse<TItem> {
  readonly data: readonly TItem[];
}

export interface CustomerLookupItem {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

export interface ProductLookupItem {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
}

/** Error codes the purchase-order screens react to beyond showing the popup. */
export const PurchaseOrderErrorCodes = {
  duplicateReference: 'PurchaseOrder.DuplicateReferenceNumber',
} as const;
