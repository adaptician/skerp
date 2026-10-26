import { provideStore } from '@ngrx/store';
import { Store } from '@ngrx/store';
import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Observable, Subject, map, of, throwError } from 'rxjs';

import { NotificationService } from '../../../../common/services/notification.service';
import { DemoModeActions, provideDemoMode } from '../../../../common/state/demo-mode';
import { PurchaseOrder } from '../../models/purchase-order';
import {
  PagedResponse,
  PurchaseOrderListItem,
  PurchaseOrderListQuery,
} from '../../models/purchase-order-list';
import { MonitorEvent } from '../../models/purchase-order-monitor';
import { MonitorModeStorageService } from '../../services/monitor-mode-storage.service';
import { PurchaseOrderMonitorConnection } from '../../services/purchase-order-monitor-connection';
import { PurchaseOrdersApi } from '../../services/purchase-orders-api';
import { PurchaseOrdersActions, providePurchaseOrdersState } from '../../state';
import { PurchaseOrdersPage } from './purchase-orders-page';

function order(n: number): PurchaseOrderListItem {
  return {
    id: `id-${n}`,
    reference: `PO-2026-${String(n).padStart(3, '0')}`,
    createdAt: `2026-10-${String(n).padStart(2, '0')}T10:00:00Z`,
    customer: { id: 'c1', name: 'Alpha Studios', email: 'orders@alpha.co.za' },
    currency: { id: 1, name: 'ZAR' },
    status: { id: 10, name: 'Pending' },
    total: 1284.5,
    lineItemCount: 25,
    allowedStatusIds: [20, 90],
    isEditable: true,
    isDeletable: true,
  };
}

class FakeApi {
  queries: PurchaseOrderListQuery[] = [];
  listResult: () => Observable<PagedResponse<PurchaseOrderListItem>> = () =>
    of({ data: Array.from({ length: 10 }, (_, i) => order(i + 1)), totalCount: 15 });

  list(query: PurchaseOrderListQuery) {
    this.queries.push(query);
    return this.listResult();
  }

  get(id: string, skip: number, take: number) {
    this.getCalls.push([id, skip]);
    const lines = Array.from({ length: Math.min(take, 25 - skip) }, (_, i) => ({
      id: `${id}-l${skip + i}`,
      productId: 'p',
      sku: `SKU${skip + i}`,
      name: 'Delicious Soda',
      quantity: 2,
      price: 24.5,
      total: 49,
    }));
    return of({ id, lineItems: lines, lineItemCount: 25 } as unknown as PurchaseOrder);
  }

  deleted: string[] = [];
  deleteResult: Observable<void> = of(undefined);

  deleteOrder(id: string) {
    this.deleted.push(id);
    return this.deleteResult;
  }

  editLoads: string[] = [];
  getCalls: [string, number][] = [];
  getForEditResult: ((id: string) => Observable<PurchaseOrder>) | null = null;

  getForEdit(id: string) {
    this.editLoads.push(id);
    if (this.getForEditResult) {
      return this.getForEditResult(id);
    }
    return of({
      ...order(Number(id.slice(3))),
      lineItems: [
        { id: 'l1', productId: 'p1', sku: 'SDA001', name: 'Soda', quantity: 2, price: 1, total: 2 },
      ],
      lineItemCount: 1,
      notes: null,
    } as PurchaseOrder);
  }

  edit(id: string) {
    return of({ ...order(Number(id.slice(3))), total: 99 });
  }

  statusRequests: [string, number][] = [];
  statusResult: (id: string, statusId: number) => Observable<PurchaseOrderListItem> = (id) =>
    of({
      ...order(Number(id.slice(3))),
      status: { id: 20, name: 'Confirmed' },
      allowedStatusIds: [60, 90],
    });

  updateStatus(id: string, statusId: number) {
    this.statusRequests.push([id, statusId]);
    return this.statusResult(id, statusId);
  }

  refreshes: PurchaseOrderListQuery[] = [];
  refreshResult: () => Observable<PagedResponse<PurchaseOrderListItem>> = () => this.listResult();

  refresh(query: PurchaseOrderListQuery) {
    this.refreshes.push(query);
    return this.refreshResult();
  }
}

/** Stands in for the hub: `events` is what the open connection reports. */
class FakeMonitorConnection {
  events = new Subject<MonitorEvent>();
  open = 0;

  connect() {
    return new Observable<MonitorEvent>((subscriber) => {
      this.open++;
      const subscription = this.events.subscribe(subscriber);
      return () => {
        this.open--;
        subscription.unsubscribe();
      };
    });
  }
}

async function setup(api = new FakeApi(), monitor = new FakeMonitorConnection()) {
  const view = await render(PurchaseOrdersPage, {
    providers: [
      provideStore(),
      provideDemoMode(),
      providePurchaseOrdersState(),
      { provide: PurchaseOrdersApi, useValue: api },
      { provide: PurchaseOrderMonitorConnection, useValue: monitor },
    ],
  });
  return { api, monitor, view, user: userEvent.setup() };
}

describe('PurchaseOrdersPage', () => {
  it('should load the first page newest first and show every column', async () => {
    const { api } = await setup();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(10);
    expect(api.queries[0]).toMatchObject({ page: 1, sorting: 'createdAt desc' });
    const first = within(rows[0]);
    expect(first.getByText('PO-2026-001')).toBeTruthy();
    expect(first.getByText('Alpha Studios')).toBeTruthy();
    expect(first.getByText('R 1 284.50')).toBeTruthy();
    expect(first.getByText('Pending')).toBeTruthy();
    expect(first.getByText('1 Oct 2026')).toBeTruthy();
    expect(first.getByRole('button', { name: 'Actions for PO-2026-001' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Pagination' }).textContent).toContain('of 15');
  });

  it('should load 20 line items on expand and the rest on Load more', async () => {
    const { user } = await setup();

    await user.click(screen.getByRole('button', { name: 'Line items of PO-2026-001' }));
    const region = screen.getByRole('region', { name: 'Line items of PO-2026-001' });
    expect(within(region).getAllByRole('row')).toHaveLength(21);
    expect(region.textContent).toContain('Showing 20 of 25');

    await user.click(within(region).getByRole('button', { name: /load more line items/i }));
    expect(within(region).getAllByRole('row')).toHaveLength(26);
    expect(within(region).queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('should expand a row from Actions → View', async () => {
    const { user } = await setup();

    await user.click(screen.getByRole('button', { name: 'Actions for PO-2026-002' }));
    await user.click(screen.getByRole('menuitem', { name: 'View' }));

    expect(screen.getByRole('region', { name: 'Line items of PO-2026-002' })).toBeTruthy();
  });

  it('should ask for the next page and flip the sort', async () => {
    const { api, user } = await setup();

    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    await user.click(screen.getByRole('button', { name: 'Created' }));

    expect(api.queries.map((q) => [q.page, q.sorting])).toEqual([
      [1, 'createdAt desc'],
      [2, 'createdAt desc'],
      [1, 'createdAt asc'],
    ]);
  });

  it('should show the empty placeholder when nothing matches', async () => {
    const api = new FakeApi();
    api.listResult = () => of({ data: [], totalCount: 0 });
    await setup(api);

    expect(screen.getByText('No purchase orders yet')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });

  it('should offer a retry when the list cannot load', async () => {
    const api = new FakeApi();
    let fail = true;
    api.listResult = () =>
      fail ? throwError(() => new Error('down')) : of({ data: [order(1)], totalCount: 1 });
    const { user } = await setup(api);

    expect(screen.getByRole('alert').textContent).toContain('could not be loaded');
    fail = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('should offer Clear filters when a filtered list is empty, and clear them', async () => {
    const api = new FakeApi();
    api.listResult = () => of({ data: [], totalCount: 0 });
    const { user } = await setup(api);

    await user.type(screen.getByRole('searchbox', { name: 'Reference' }), 'PO-NONE');
    await waitFor(() =>
      expect(screen.getByText('No purchase orders match your filters')).toBeTruthy(),
    );
    const clear = screen.getAllByRole('button', { name: /clear filters/i });
    await user.click(clear[clear.length - 1]);

    expect(api.queries.at(-1)).toMatchObject({ search: '', page: 1 });
    expect(screen.getByText('No purchase orders yet')).toBeTruthy();
  });

  it('should reload rather than insert when an order is created under a filter', async () => {
    const { api, user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    const loads = api.queries.length;

    TestBed.inject(Store).dispatch(
      PurchaseOrdersActions.orderCreated({
        order: { ...order(99), lineItems: [], notes: null } as unknown as PurchaseOrder,
      }),
    );

    expect(api.queries).toHaveLength(loads + 1);
    expect(api.queries.at(-1)).toMatchObject({ page: 2 });
  });

  it('should update a row in place and confirm when the status changes', async () => {
    const { api, user } = await setup();
    const loads = api.queries.length;

    await user.click(screen.getByRole('button', { name: /^Status of PO-2026-002/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmed' }));

    expect(api.statusRequests).toEqual([['id-2', 20]]);
    expect(api.queries).toHaveLength(loads);
    const row = screen.getAllByRole('row')[2];
    expect(
      within(row).getByRole('button', { name: /^Status of PO-2026-002: Confirmed/ }),
    ).toBeTruthy();
    expect(TestBed.inject(NotificationService).notifications()).toContainEqual(
      expect.objectContaining({
        kind: 'success',
        title: 'Status updated',
        description: 'PO-2026-002 is now Confirmed.',
      }),
    );
  });

  it('should keep the status when the server refuses a Demo Mode change', async () => {
    const api = new FakeApi();
    api.statusResult = () => throwError(() => new Error('refused'));
    const { user } = await setup(api);
    TestBed.inject(Store).dispatch(DemoModeActions.switched({ enabled: true }));

    await user.click(await screen.findByRole('button', { name: /^Status of PO-2026-001/ }));
    await user.click(screen.getByRole('button', { name: 'Fulfilled' }));

    expect(api.statusRequests).toEqual([['id-1', 60]]);
    await waitFor(() => expect(api.queries.length).toBeGreaterThan(1));
    const row = screen.getAllByRole('row')[1];
    expect(
      within(row).getByRole('button', { name: /^Status of PO-2026-001: Pending/ }),
    ).toBeTruthy();
  });

  it('should reload a status-filtered page when a row leaves the filter', async () => {
    const { api, user } = await setup();
    TestBed.inject(Store).dispatch(
      PurchaseOrdersActions.queryChanged({ changes: { statusId: 10 } }),
    );
    const loads = api.queries.length;

    await user.click(await screen.findByRole('button', { name: /^Status of PO-2026-003/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmed' }));

    expect(api.queries).toHaveLength(loads + 1);
    expect(api.queries.at(-1)).toMatchObject({ statusId: 10 });
  });

  it('should disable Edit for a locked order and edit a Pending one in place', async () => {
    const api = new FakeApi();
    const base = api.listResult;
    api.listResult = () =>
      base().pipe(
        map((page) => ({
          ...page,
          data: page.data.map((row, i) => (i === 1 ? { ...row, isEditable: false } : row)),
        })),
      );
    const { user } = await setup(api);

    await user.click(screen.getByRole('button', { name: 'Actions for PO-2026-002' }));
    expect(screen.getByRole('menuitem', { name: /Edit/ }).getAttribute('aria-disabled')).toBe(
      'true',
    );
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Actions for PO-2026-001' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(await screen.findByRole('dialog', { name: 'Edit purchase order' })).toBeTruthy();
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'x');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(within(screen.getAllByRole('row')[1]).getByText('R 99.00')).toBeTruthy();
  });

  it('should ignore a second Edit while the first order is loading', async () => {
    const api = new FakeApi();
    const pending = new Subject<PurchaseOrder>();
    api.getForEditResult = () => pending;
    const { user } = await setup(api);

    await user.click(screen.getByRole('button', { name: 'Actions for PO-2026-001' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Actions for PO-2026-002' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

    expect(api.editLoads).toEqual(['id-1']);
  });

  it("should reload an expanded row's lines and confirm after an edit", async () => {
    const api = new FakeApi();
    const { user } = await setup(api);
    await user.click(screen.getByRole('button', { name: 'Line items of PO-2026-001' }));
    const before = api.getCalls.length;

    await user.click(screen.getByRole('button', { name: 'Actions for PO-2026-001' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    await screen.findByRole('dialog', { name: 'Edit purchase order' });
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'x');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(api.getCalls.slice(before)).toEqual([['id-1', 0]]));
    expect(TestBed.inject(NotificationService).notifications()).toContainEqual(
      expect.objectContaining({ kind: 'success', title: 'Purchase order updated' }),
    );
  });

  it("should not reload a collapsed row's lines after an edit", async () => {
    const api = new FakeApi();
    await setup(api);

    TestBed.inject(Store).dispatch(
      PurchaseOrdersActions.orderEdited({ order: { ...order(1), total: 5 } }),
    );

    expect(api.getCalls).toEqual([]);
  });

  it('should delete a Pending order after confirmation and reload the page', async () => {
    const { api, user } = await setup();
    const loads = api.queries.length;

    await user.click(screen.getByRole('button', { name: 'Actions for PO-2026-003' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete purchase order?' });
    expect(dialog.textContent).toContain('PO-2026-003 for Alpha Studios will be deleted.');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(api.deleted).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Actions for PO-2026-003' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(api.deleted).toEqual(['id-3']);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(api.queries).toHaveLength(loads + 1);
    expect(TestBed.inject(NotificationService).notifications()).toContainEqual(
      expect.objectContaining({ kind: 'success', title: 'Purchase order deleted' }),
    );
  });

  it('should reload the page when the server refuses the delete', async () => {
    const api = new FakeApi();
    api.deleteResult = throwError(() => new Error('refused'));
    const { user } = await setup(api);
    const loads = api.queries.length;

    await user.click(screen.getByRole('button', { name: 'Actions for PO-2026-003' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(api.queries).toHaveLength(loads + 1);
    expect(api.queries.at(-1)).toMatchObject({ page: 1 });
  });

  it('should disable Delete for a locked order', async () => {
    const api = new FakeApi();
    const base = api.listResult;
    api.listResult = () =>
      base().pipe(
        map((page) => ({
          ...page,
          data: page.data.map((row) => ({ ...row, isDeletable: false })),
        })),
      );
    const { user } = await setup(api);

    await user.click(screen.getByRole('button', { name: 'Actions for PO-2026-001' }));
    const item = screen.getByRole('menuitem', { name: /Delete/ });
    expect(item.getAttribute('aria-disabled')).toBe('true');
    await user.click(item);

    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  describe('Monitor Mode', () => {
    afterEach(() => localStorage.removeItem(MonitorModeStorageService.storageKey));

    it('should hide creating, row actions and expansion, and keep the status control', async () => {
      const { monitor, user } = await setup();

      await user.click(screen.getByRole('switch', { name: 'Monitor Mode' }));
      monitor.events.next({ kind: 'state', state: 'live' });

      await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Live'));
      expect(monitor.open).toBe(1);
      expect(screen.queryByRole('button', { name: /new purchase order/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Actions for/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Line items of/ })).toBeNull();
      expect(screen.queryByRole('columnheader', { name: 'Actions' })).toBeNull();
      expect(screen.getByRole('button', { name: /^Status of PO-2026-001: Pending/ })).toBeTruthy();
    });

    it('should look as before, with the connection closed, once switched off', async () => {
      const { monitor, user } = await setup();
      const toggle = screen.getByRole('switch', { name: 'Monitor Mode' });

      await user.click(toggle);
      await user.click(toggle);

      expect(monitor.open).toBe(0);
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.getByRole('button', { name: /new purchase order/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Actions for PO-2026-001' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Line items of PO-2026-001' })).toBeTruthy();
    });

    it('should say plainly when the connection drops and offer a refresh', async () => {
      const { monitor, user } = await setup();

      await user.click(screen.getByRole('switch', { name: 'Monitor Mode' }));
      monitor.events.next({ kind: 'state', state: 'live' });
      monitor.events.next({ kind: 'state', state: 'disconnected' });

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toContain('Disconnected');
      expect(alert.textContent).toContain('Refresh the page to reconnect');
      expect(within(alert).getByRole('button', { name: /refresh/i })).toBeTruthy();
    });

    it('should fetch the page again under the current query when a change is pushed', async () => {
      const { api, monitor, user } = await setup();
      await user.click(screen.getByRole('button', { name: 'Page 2' }));
      await user.click(screen.getByRole('switch', { name: 'Monitor Mode' }));
      api.refreshResult = () =>
        of({ data: [{ ...order(11), reference: 'PO-2026-099' }], totalCount: 16 });

      monitor.events.next({ kind: 'change', change: { id: 'id-99', change: 'created' } });

      await waitFor(() => expect(screen.getByText('PO-2026-099')).toBeTruthy());
      expect(api.refreshes).toHaveLength(1);
      expect(api.refreshes[0].page).toBe(2);
      expect(api.queries).toHaveLength(2);
    });

    it('should come back on after a refresh', async () => {
      localStorage.setItem(MonitorModeStorageService.storageKey, 'true');

      const { monitor } = await setup();

      expect(
        screen.getByRole('switch', { name: 'Monitor Mode' }).getAttribute('aria-checked'),
      ).toBe('true');
      expect(monitor.open).toBe(1);
    });
  });
});
