import { PurchaseOrder } from '../models/purchase-order';
import { EMPTY_QUERY, PurchaseOrderListItem } from '../models/purchase-order-list';
import { PurchaseOrdersActions } from './purchase-orders.actions';
import {
  initialPurchaseOrdersState,
  purchaseOrdersFeature,
  selectRowChanges,
} from './purchase-orders.feature';

const reducer = purchaseOrdersFeature.reducer;

function row(id: string): PurchaseOrderListItem {
  return {
    id,
    reference: `PO-${id}`,
    createdAt: '2026-10-22T10:00:00Z',
    customer: { id: 'c', name: 'Alpha Studios', email: 'orders@alpha.co.za' },
    currency: { id: 1, name: 'ZAR' },
    status: { id: 10, name: 'Pending' },
    total: 10,
    lineItemCount: 1,
    allowedStatusIds: [20, 90],
    isEditable: true,
    isDeletable: true,
  };
}

describe('purchaseOrdersFeature reducer', () => {
  it('should return to page 1 when a filter changes', () => {
    const onPage3 = reducer(
      initialPurchaseOrdersState,
      PurchaseOrdersActions.pageChanged({ page: 3 }),
    );

    const state = reducer(
      onPage3,
      PurchaseOrdersActions.queryChanged({ changes: { statusId: 10 } }),
    );

    expect(state.query.page).toBe(1);
    expect(state.query.statusId).toBe(10);
    expect(state.loading).toBe(true);
  });

  it('should flip the created sort and return to page 1', () => {
    const onPage2 = reducer(
      initialPurchaseOrdersState,
      PurchaseOrdersActions.pageChanged({ page: 2 }),
    );

    const state = reducer(onPage2, PurchaseOrdersActions.sortToggled());

    expect(state.query.sorting).toBe('createdAt asc');
    expect(state.query.page).toBe(1);
  });

  it('should clear every filter but keep the sort', () => {
    let state = reducer(initialPurchaseOrdersState, PurchaseOrdersActions.sortToggled());
    state = reducer(
      state,
      PurchaseOrdersActions.queryChanged({ changes: { search: 'PO', statusId: 20 } }),
    );

    state = reducer(state, PurchaseOrdersActions.filtersCleared());

    expect(state.query).toEqual({ ...EMPTY_QUERY, sorting: 'createdAt asc' });
  });

  it('should drop expanded rows that are no longer on the page', () => {
    let state = reducer(initialPurchaseOrdersState, PurchaseOrdersActions.rowToggled({ id: 'a' }));
    state = reducer(state, PurchaseOrdersActions.rowToggled({ id: 'b' }));

    state = reducer(state, PurchaseOrdersActions.loaded({ items: [row('b')], totalCount: 1 }));

    expect(state.expanded).toEqual(['b']);
  });

  it('should append a further page of line items', () => {
    const first = Array.from({ length: 20 }, (_, i) => ({
      id: `l${i}`,
      productId: 'p',
      sku: 'S',
      name: 'N',
      quantity: 1,
      price: 1,
      total: 1,
    }));
    let state = reducer(
      initialPurchaseOrdersState,
      PurchaseOrdersActions.lineItemsLoaded({
        id: 'a',
        items: first,
        totalCount: 25,
        append: false,
      }),
    );

    state = reducer(
      state,
      PurchaseOrdersActions.lineItemsLoaded({
        id: 'a',
        items: first.slice(0, 5),
        totalCount: 25,
        append: true,
      }),
    );

    expect(state.lineItems['a'].items).toHaveLength(25);
  });

  it('should put a created order first on the unfiltered first page', () => {
    const loaded = reducer(
      initialPurchaseOrdersState,
      PurchaseOrdersActions.loaded({
        items: Array.from({ length: 10 }, (_, i) => row(`${i}`)),
        totalCount: 30,
      }),
    );
    const order = { ...row('new'), lineItems: [], notes: null } as PurchaseOrder;

    const state = reducer(loaded, PurchaseOrdersActions.orderCreated({ order }));

    expect(state.items[0].id).toBe('new');
    expect(state.items).toHaveLength(10);
    expect(state.totalCount).toBe(31);
  });

  it('should leave a filtered list to be reloaded when an order is created', () => {
    const filtered = reducer(
      initialPurchaseOrdersState,
      PurchaseOrdersActions.queryChanged({ changes: { statusId: 20 } }),
    );
    const order = { ...row('new'), lineItems: [], notes: null } as PurchaseOrder;

    expect(reducer(filtered, PurchaseOrdersActions.orderCreated({ order }))).toBe(filtered);
  });

  it('should replace a row in place when its status changes', () => {
    const loaded = reducer(
      initialPurchaseOrdersState,
      PurchaseOrdersActions.loaded({ items: [row('a'), row('b')], totalCount: 2 }),
    );
    const changing = reducer(
      loaded,
      PurchaseOrdersActions.statusChangeRequested({ id: 'b', statusId: 20 }),
    );
    expect(changing.statusChanging).toEqual(['b']);

    const confirmed = {
      ...row('b'),
      status: { id: 20, name: 'Confirmed' },
      allowedStatusIds: [60, 90],
    };
    const state = reducer(changing, PurchaseOrdersActions.statusChanged({ order: confirmed }));

    expect(state.items.map((item) => item.status.name)).toEqual(['Pending', 'Confirmed']);
    expect(state.items[1]).toBe(confirmed);
    expect(state.statusChanging).toEqual([]);
  });

  it('should keep the row as it was when a status change is refused', () => {
    const loaded = reducer(
      initialPurchaseOrdersState,
      PurchaseOrdersActions.loaded({ items: [row('a')], totalCount: 1 }),
    );
    const changing = reducer(
      loaded,
      PurchaseOrdersActions.statusChangeRequested({ id: 'a', statusId: 60 }),
    );

    const state = reducer(changing, PurchaseOrdersActions.statusChangeFailed({ id: 'a' }));

    expect(state.items).toBe(loaded.items);
    expect(state.statusChanging).toEqual([]);
  });

  it('should replace an edited row and drop its cached line items', () => {
    let state = reducer(
      initialPurchaseOrdersState,
      PurchaseOrdersActions.loaded({ items: [row('a'), row('b')], totalCount: 2 }),
    );
    state = reducer(
      state,
      PurchaseOrdersActions.lineItemsLoaded({ id: 'a', items: [], totalCount: 3, append: false }),
    );

    const edited = { ...row('a'), total: 42 };
    state = reducer(state, PurchaseOrdersActions.orderEdited({ order: edited }));

    expect(state.items[0]).toBe(edited);
    expect(state.lineItems['a']).toBeUndefined();
  });

  it('should step back a page when the last row of a later page is deleted', () => {
    let state = reducer(initialPurchaseOrdersState, PurchaseOrdersActions.pageChanged({ page: 3 }));
    state = reducer(state, PurchaseOrdersActions.loaded({ items: [row('a')], totalCount: 21 }));

    state = reducer(state, PurchaseOrdersActions.orderDeleted({ id: 'a' }));

    expect(state.query.page).toBe(2);
    expect(state.loading).toBe(true);
  });

  it('should stay on the page when other rows remain', () => {
    let state = reducer(initialPurchaseOrdersState, PurchaseOrdersActions.pageChanged({ page: 2 }));
    state = reducer(
      state,
      PurchaseOrdersActions.loaded({ items: [row('a'), row('b')], totalCount: 12 }),
    );

    expect(reducer(state, PurchaseOrdersActions.orderDeleted({ id: 'a' })).query.page).toBe(2);
  });

  describe('Monitor Mode', () => {
    it('should start connecting and collapse every row when switched on', () => {
      const expanded = reducer(
        initialPurchaseOrdersState,
        PurchaseOrdersActions.rowToggled({ id: 'a' }),
      );

      const state = reducer(expanded, PurchaseOrdersActions.monitorModeToggled({ enabled: true }));

      expect(state.monitor).toMatchObject({ enabled: true, connection: 'connecting' });
      expect(state.expanded).toEqual([]);
    });

    it('should ignore a connection report once switched off', () => {
      const off = reducer(
        reducer(
          initialPurchaseOrdersState,
          PurchaseOrdersActions.monitorModeToggled({ enabled: true }),
        ),
        PurchaseOrdersActions.monitorModeToggled({ enabled: false }),
      );

      const state = reducer(
        off,
        PurchaseOrdersActions.monitorConnectionChanged({ connection: 'disconnected' }),
      );

      expect(state.monitor).toMatchObject({ enabled: false, connection: 'off' });
    });

    it('should replace the page on a refresh without showing a loading state', () => {
      const shown = reducer(
        initialPurchaseOrdersState,
        PurchaseOrdersActions.loaded({ items: [row('a'), row('b')], totalCount: 2 }),
      );

      const state = reducer(
        shown,
        PurchaseOrdersActions.monitorRefreshed({
          query: EMPTY_QUERY,
          items: [row('c'), row('a')],
          totalCount: 3,
          changes: [{ id: 'c', change: 'created' }],
        }),
      );

      expect(state.items.map((item) => item.id)).toEqual(['c', 'a']);
      expect(state.totalCount).toBe(3);
      expect(state.loading).toBe(false);
    });

    it('should keep Monitor Mode on but drop the connection when the screen closes', () => {
      const live = reducer(
        reducer(
          initialPurchaseOrdersState,
          PurchaseOrdersActions.monitorModeToggled({ enabled: true }),
        ),
        PurchaseOrdersActions.monitorConnectionChanged({ connection: 'live' }),
      );

      const state = reducer(live, PurchaseOrdersActions.closed());

      expect(state.monitor).toMatchObject({ enabled: true, connection: 'off' });
    });

    it('should record which rows arrived, left and changed in place on a refresh', () => {
      const shown = reducer(
        reducer(
          initialPurchaseOrdersState,
          PurchaseOrdersActions.monitorModeToggled({ enabled: true }),
        ),
        PurchaseOrdersActions.loaded({ items: [row('a'), row('b'), row('c')], totalCount: 3 }),
      );

      const state = reducer(
        shown,
        PurchaseOrdersActions.monitorRefreshed({
          query: EMPTY_QUERY,
          items: [row('n'), row('a'), row('b')],
          totalCount: 3,
          changes: [
            { id: 'n', change: 'created' },
            { id: 'a', change: 'edited' },
            { id: 'b', change: 'statusChanged' },
            { id: 'c', change: 'deleted' },
          ],
        }),
      );

      expect(selectRowChanges.projector(state.monitor)).toEqual({
        entering: ['n'],
        leaving: ['c'],
        highlights: { a: 'edited', b: 'statusChanged' },
      });
    });

    it('should clear only the highlights of the refresh that expired', () => {
      let state = reducer(
        reducer(
          initialPurchaseOrdersState,
          PurchaseOrdersActions.monitorModeToggled({ enabled: true }),
        ),
        PurchaseOrdersActions.loaded({ items: [row('a'), row('b')], totalCount: 2 }),
      );
      const refresh = (id: string) =>
        PurchaseOrdersActions.monitorRefreshed({
          query: EMPTY_QUERY,
          items: [row('a'), row('b')],
          totalCount: 2,
          changes: [{ id, change: 'edited' }],
        });
      state = reducer(state, refresh('a'));
      state = reducer(state, refresh('b'));
      state = reducer(state, refresh('a'));

      state = reducer(state, PurchaseOrdersActions.monitorHighlightsExpired({ refresh: 1 }));
      state = reducer(state, PurchaseOrdersActions.monitorHighlightsExpired({ refresh: 2 }));

      expect(Object.keys(selectRowChanges.projector(state.monitor).highlights)).toEqual(['a']);
    });

    it('should not animate a page the user asked for', () => {
      const refreshed = reducer(
        reducer(
          initialPurchaseOrdersState,
          PurchaseOrdersActions.monitorModeToggled({ enabled: true }),
        ),
        PurchaseOrdersActions.monitorRefreshed({
          query: EMPTY_QUERY,
          items: [row('n')],
          totalCount: 1,
          changes: [{ id: 'n', change: 'created' }],
        }),
      );

      const state = reducer(
        refreshed,
        PurchaseOrdersActions.loaded({ items: [row('x')], totalCount: 1 }),
      );

      expect(selectRowChanges.projector(state.monitor)).toEqual({
        entering: [],
        leaving: [],
        highlights: {},
      });
    });

    it('should drop a refresh fetched for a query the user has since changed', () => {
      const shown = reducer(
        reducer(
          initialPurchaseOrdersState,
          PurchaseOrdersActions.monitorModeToggled({ enabled: true }),
        ),
        PurchaseOrdersActions.loaded({ items: [row('a')], totalCount: 1 }),
      );
      const filtered = reducer(
        reducer(shown, PurchaseOrdersActions.queryChanged({ changes: { statusId: 20 } })),
        PurchaseOrdersActions.loaded({ items: [row('q2')], totalCount: 1 }),
      );

      const state = reducer(
        filtered,
        PurchaseOrdersActions.monitorRefreshed({
          query: shown.query,
          items: [row('q1')],
          totalCount: 9,
          changes: [{ id: 'q1', change: 'edited' }],
        }),
      );

      expect(state.items.map((item) => item.id)).toEqual(['q2']);
      expect(state.totalCount).toBe(1);
    });
  });
});
