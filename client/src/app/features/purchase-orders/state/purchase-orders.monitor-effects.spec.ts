import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, Subject, firstValueFrom, of, toArray } from 'rxjs';

import { EMPTY_QUERY, PurchaseOrderListQuery } from '../models/purchase-order-list';
import {
  MONITOR_HIGHLIGHT_MS,
  MONITOR_REFRESH_DEBOUNCE_MS,
  MonitorEvent,
} from '../models/purchase-order-monitor';
import { MonitorModeStorageService } from '../services/monitor-mode-storage.service';
import { PurchaseOrderMonitorConnection } from '../services/purchase-order-monitor-connection';
import { PurchaseOrdersApi } from '../services/purchase-orders-api';
import { PurchaseOrdersActions } from './purchase-orders.actions';
import {
  expireMonitorHighlights,
  monitorConnection,
  refreshOnMonitorChange,
  rememberMonitorMode,
  restoreMonitorMode,
} from './purchase-orders.effects';
import { initialPurchaseOrdersState } from './purchase-orders.feature';

describe('Monitor Mode effects', () => {
  let actions: Observable<Action>;
  const storage = { read: vi.fn<() => boolean>(), write: vi.fn<(enabled: boolean) => void>() };
  const api = { refresh: vi.fn() };
  let connectionEvents: Subject<MonitorEvent>;
  let connected = 0;
  const connection = {
    connect: () =>
      new Observable<MonitorEvent>((subscriber) => {
        connected++;
        const subscription = connectionEvents.subscribe(subscriber);
        return () => {
          connected--;
          subscription.unsubscribe();
        };
      }),
  };

  function setup(monitorEnabled = true, query: PurchaseOrderListQuery = EMPTY_QUERY) {
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions),
        provideMockStore({
          initialState: {
            purchaseOrders: {
              ...initialPurchaseOrdersState,
              query,
              monitor: {
                ...initialPurchaseOrdersState.monitor,
                enabled: monitorEnabled,
                connection: 'live',
              },
            },
          },
        }),
        { provide: MonitorModeStorageService, useValue: storage },
        { provide: PurchaseOrdersApi, useValue: api },
        { provide: PurchaseOrderMonitorConnection, useValue: connection },
      ],
    });
    return TestBed.inject(MockStore);
  }

  beforeEach(() => {
    storage.read.mockReset();
    storage.write.mockReset();
    api.refresh.mockReset();
    connectionEvents = new Subject<MonitorEvent>();
    connected = 0;
  });

  afterEach(() => vi.useRealTimers());

  it('should turn Monitor Mode back on when the screen opens and it was on', async () => {
    setup(false);
    storage.read.mockReturnValue(true);
    actions = of(PurchaseOrdersActions.opened());

    const result = await firstValueFrom(TestBed.runInInjectionContext(() => restoreMonitorMode()));

    expect(result).toEqual(PurchaseOrdersActions.monitorModeToggled({ enabled: true }));
  });

  it('should reconnect when the screen reopens with Monitor Mode still on, even without storage', async () => {
    setup(true);
    storage.read.mockReturnValue(false);
    actions = of(PurchaseOrdersActions.opened());

    const result = await firstValueFrom(TestBed.runInInjectionContext(() => restoreMonitorMode()));

    expect(result).toEqual(PurchaseOrdersActions.monitorModeToggled({ enabled: true }));
  });

  it('should leave Monitor Mode off when the screen opens and it was off', async () => {
    setup(false);
    storage.read.mockReturnValue(false);
    actions = of(PurchaseOrdersActions.opened());

    const results = await firstValueFrom(
      TestBed.runInInjectionContext(() => restoreMonitorMode()).pipe(toArray()),
    );

    expect(results).toEqual([]);
  });

  it('should remember every switch', async () => {
    setup();
    actions = of(PurchaseOrdersActions.monitorModeToggled({ enabled: false }));

    await firstValueFrom(TestBed.runInInjectionContext(() => rememberMonitorMode()));

    expect(storage.write).toHaveBeenCalledWith(false);
  });

  it('should hold the connection open only while Monitor Mode is on and the screen is open', () => {
    setup();
    const source = new Subject<Action>();
    actions = source;
    const emitted: Action[] = [];
    TestBed.runInInjectionContext(() => monitorConnection()).subscribe((a) => emitted.push(a));

    source.next(PurchaseOrdersActions.monitorModeToggled({ enabled: true }));
    connectionEvents.next({ kind: 'state', state: 'live' });
    connectionEvents.next({ kind: 'change', change: { id: 'a', change: 'edited' } });
    expect(connected).toBe(1);

    source.next(PurchaseOrdersActions.monitorModeToggled({ enabled: false }));
    expect(connected).toBe(0);

    source.next(PurchaseOrdersActions.monitorModeToggled({ enabled: true }));
    source.next(PurchaseOrdersActions.closed());
    expect(connected).toBe(0);
    expect(emitted).toEqual([
      PurchaseOrdersActions.monitorConnectionChanged({ connection: 'live' }),
      PurchaseOrdersActions.monitorChangeReceived({ change: { id: 'a', change: 'edited' } }),
    ]);
  });

  it('should fetch the current query once for changes that arrive together', () => {
    vi.useFakeTimers();
    const query = { ...EMPTY_QUERY, statusId: 10, page: 2 };
    setup(true, query);
    api.refresh.mockReturnValue(of({ data: [], totalCount: 11 }));
    const source = new Subject<Action>();
    actions = source;
    const emitted: Action[] = [];
    TestBed.runInInjectionContext(() => refreshOnMonitorChange()).subscribe((a) => emitted.push(a));

    source.next(
      PurchaseOrdersActions.monitorChangeReceived({ change: { id: 'a', change: 'created' } }),
    );
    source.next(
      PurchaseOrdersActions.monitorChangeReceived({ change: { id: 'b', change: 'deleted' } }),
    );
    vi.advanceTimersByTime(MONITOR_REFRESH_DEBOUNCE_MS);

    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(api.refresh).toHaveBeenCalledWith(query);
    expect(emitted).toEqual([
      PurchaseOrdersActions.monitorRefreshed({
        query,
        items: [],
        totalCount: 11,
        changes: [
          { id: 'a', change: 'created' },
          { id: 'b', change: 'deleted' },
        ],
      }),
    ]);
  });

  it('should keep refreshing while changes never pause', () => {
    vi.useFakeTimers();
    setup();
    api.refresh.mockReturnValue(of({ data: [], totalCount: 0 }));
    const source = new Subject<Action>();
    actions = source;
    TestBed.runInInjectionContext(() => refreshOnMonitorChange()).subscribe();

    for (let i = 0; i < 10; i++) {
      source.next(
        PurchaseOrdersActions.monitorChangeReceived({ change: { id: `o${i}`, change: 'edited' } }),
      );
      vi.advanceTimersByTime(MONITOR_REFRESH_DEBOUNCE_MS / 2);
    }

    expect(api.refresh.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('should not fetch for a change that lands after Monitor Mode was switched off', () => {
    vi.useFakeTimers();
    setup(false);
    const source = new Subject<Action>();
    actions = source;
    TestBed.runInInjectionContext(() => refreshOnMonitorChange()).subscribe();

    source.next(
      PurchaseOrdersActions.monitorChangeReceived({ change: { id: 'a', change: 'edited' } }),
    );
    vi.advanceTimersByTime(MONITOR_REFRESH_DEBOUNCE_MS);

    expect(api.refresh).not.toHaveBeenCalled();
  });

  it("should expire a refresh's highlights after 2 seconds", () => {
    vi.useFakeTimers();
    const store = setup();
    store.setState({
      purchaseOrders: {
        ...initialPurchaseOrdersState,
        monitor: { ...initialPurchaseOrdersState.monitor, enabled: true, refresh: 4 },
      },
    });
    const source = new Subject<Action>();
    actions = source;
    const emitted: Action[] = [];
    TestBed.runInInjectionContext(() => expireMonitorHighlights()).subscribe((a) =>
      emitted.push(a),
    );

    source.next(
      PurchaseOrdersActions.monitorRefreshed({
        query: EMPTY_QUERY,
        items: [],
        totalCount: 0,
        changes: [],
      }),
    );
    vi.advanceTimersByTime(MONITOR_HIGHLIGHT_MS - 1);
    expect(emitted).toEqual([]);
    vi.advanceTimersByTime(1);

    expect(emitted).toEqual([PurchaseOrdersActions.monitorHighlightsExpired({ refresh: 4 })]);
  });
});
