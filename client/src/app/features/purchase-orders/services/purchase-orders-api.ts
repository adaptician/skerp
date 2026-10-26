import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../common/services/api-client';
import {
  CalculateTotalsRequest,
  CalculatedTotals,
  CreatePurchaseOrderRequest,
  EditPurchaseOrderRequest,
  CustomerLookupItem,
  LookupResponse,
  ProductLookupItem,
  PurchaseOrder,
  ReferenceAvailability,
} from '../models/purchase-order';
import {
  PagedResponse,
  PurchaseOrderListItem,
  PurchaseOrderListQuery,
  toListRequest,
} from '../models/purchase-order-list';

/**
 * Typed access to the purchase-order, customer and product endpoints. Lookups and calculations
 * run while the user types, so they report failures to the caller instead of the error popup.
 */
@Injectable({ providedIn: 'root' })
export class PurchaseOrdersApi {
  private readonly api = inject(ApiClient);

  /** One page of the list; failures show the error popup and the list's retry state. */
  list(
    query: PurchaseOrderListQuery,
    pageSize?: number,
  ): Observable<PagedResponse<PurchaseOrderListItem>> {
    return this.api.post<PagedResponse<PurchaseOrderListItem>>(
      'purchase-orders/list',
      toListRequest(query, pageSize),
      { errorTitle: 'Could not load purchase orders' },
    );
  }

  /**
   * The same page for a Monitor Mode refresh. Quiet on failure: the rows on screen stay, and the
   * next pushed change tries again.
   */
  refresh(query: PurchaseOrderListQuery): Observable<PagedResponse<PurchaseOrderListItem>> {
    return this.api.post<PagedResponse<PurchaseOrderListItem>>(
      'purchase-orders/list',
      toListRequest(query),
      { suppressErrorPopup: true },
    );
  }

  /** How many orders a query would show, for the mobile filter sheet's button. Quiet on failure. */
  count(query: PurchaseOrderListQuery): Observable<PagedResponse<PurchaseOrderListItem>> {
    return this.api.post<PagedResponse<PurchaseOrderListItem>>(
      'purchase-orders/list',
      toListRequest({ ...query, page: 1 }, 1),
      { suppressErrorPopup: true },
    );
  }

  /** An order with one page of its line items. */
  get(id: string, skipCount: number, maxResultCount: number): Observable<PurchaseOrder> {
    return this.api.get<PurchaseOrder>(`purchase-orders/${encodeURIComponent(id)}`, {
      params: { skipCount, maxResultCount },
      errorTitle: 'Could not load the line items',
    });
  }

  /** Moves an order to another status; the server decides whether the change is allowed. */
  updateStatus(id: string, statusId: number): Observable<PurchaseOrderListItem> {
    return this.api.put<PurchaseOrderListItem>(
      `purchase-orders/${encodeURIComponent(id)}/status`,
      { statusId },
      { errorTitle: 'Status change not allowed' },
    );
  }

  /** An order with every line (an order holds at most 100), for the edit modal. */
  getForEdit(id: string): Observable<PurchaseOrder> {
    return this.api.get<PurchaseOrder>(`purchase-orders/${encodeURIComponent(id)}`, {
      params: { skipCount: 0, maxResultCount: 100 },
      errorTitle: 'Could not open the purchase order',
    });
  }

  /** Saves an edit; the server returns the updated list row. */
  edit(id: string, request: EditPurchaseOrderRequest): Observable<PurchaseOrderListItem> {
    return this.api.put<PurchaseOrderListItem>(
      `purchase-orders/${encodeURIComponent(id)}`,
      request,
      {
        errorTitle: 'Could not save the purchase order',
      },
    );
  }

  /** Soft-deletes a Pending order; the server answers 204. */
  deleteOrder(id: string): Observable<void> {
    return this.api.delete(`purchase-orders/${encodeURIComponent(id)}`, {
      errorTitle: 'Could not delete the purchase order',
    });
  }

  create(request: CreatePurchaseOrderRequest): Observable<PurchaseOrder> {
    return this.api.post<PurchaseOrder>('purchase-orders', request, {
      errorTitle: 'Could not save the purchase order',
    });
  }

  calculate(request: CalculateTotalsRequest): Observable<CalculatedTotals> {
    return this.api.post<CalculatedTotals>('purchase-orders/calculate', request, {
      suppressErrorPopup: true,
    });
  }

  checkReference(reference: string): Observable<ReferenceAvailability> {
    return this.api.get<ReferenceAvailability>('purchase-orders/reference-availability', {
      params: { reference },
      suppressErrorPopup: true,
    });
  }

  lookupCustomers(name: string): Observable<LookupResponse<CustomerLookupItem>> {
    return this.api.get<LookupResponse<CustomerLookupItem>>('customers/lookup', {
      params: { name },
      suppressErrorPopup: true,
    });
  }

  lookupProducts(sku: string): Observable<LookupResponse<ProductLookupItem>> {
    return this.api.get<LookupResponse<ProductLookupItem>>('products/lookup', {
      params: { sku },
      suppressErrorPopup: true,
    });
  }
}
