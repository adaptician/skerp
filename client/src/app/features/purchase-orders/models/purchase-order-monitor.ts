/** What happened to an order, as the Monitor Mode hub reports it. */
export type PurchaseOrderChangeKind = 'created' | 'edited' | 'statusChanged' | 'deleted';

/** A change pushed by the hub. It carries no order data: the list fetches its own page again. */
export interface PurchaseOrderChange {
  readonly id: string;
  readonly change: PurchaseOrderChangeKind;
}

/** The live connection's state, shown by the health indicator; `off` while Monitor Mode is off. */
export type MonitorConnectionState = 'off' | 'connecting' | 'live' | 'disconnected';

/** What a Monitor Mode connection emits: a change of its own state, or a pushed order change. */
export type MonitorEvent =
  | { readonly kind: 'state'; readonly state: Exclude<MonitorConnectionState, 'off'> }
  | { readonly kind: 'change'; readonly change: PurchaseOrderChange };

/** Pushed changes this close together are fetched once. */
export const MONITOR_REFRESH_DEBOUNCE_MS = 300;

/** How long an edited or re-statused row stays outlined (and tinted) after a refresh. */
export const MONITOR_HIGHLIGHT_MS = 2000;

/** How a row that stayed on the page changed: outlined and lifted, and for a status also tinted. */
export type RowHighlightKind = 'edited' | 'statusChanged';

/**
 * What the last Monitor Mode refresh did to the page: rows that arrived (they expand in), rows that
 * went (they shrink out), and rows that changed in place.
 */
export interface RowChanges {
  readonly entering: readonly string[];
  readonly leaving: readonly string[];
  readonly highlights: Readonly<Record<string, RowHighlightKind>>;
}

export const NO_ROW_CHANGES: RowChanges = { entering: [], leaving: [], highlights: {} };
