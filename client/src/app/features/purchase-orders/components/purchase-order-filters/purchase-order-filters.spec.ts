import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';

import {
  EMPTY_QUERY,
  PurchaseOrderListQuery,
  toListRequest,
} from '../../models/purchase-order-list';
import { PurchaseOrdersApi } from '../../services/purchase-orders-api';
import { FilterChanges, PurchaseOrderFilters } from './purchase-order-filters';

const customers = Array.from({ length: 12 }, (_, i) => ({
  id: `c${i}`,
  name: `Alpha Customer ${i}`,
  email: `c${i}@example.com`,
}));

class FakeApi {
  counts: PurchaseOrderListQuery[] = [];
  lookupCustomers() {
    return of({ data: customers });
  }
  count(query: PurchaseOrderListQuery) {
    this.counts.push(query);
    return of({ data: [], totalCount: query.statusId === 60 ? 6 : 31 });
  }
}

async function setup(query: PurchaseOrderListQuery = EMPTY_QUERY, wide = true) {
  const changes: FilterChanges[] = [];
  let cleared = 0;
  const view = await render(PurchaseOrderFilters, {
    inputs: { query, wide },
    on: { changed: (c: FilterChanges) => changes.push(c), cleared: () => cleared++ },
    providers: [{ provide: PurchaseOrdersApi, useValue: new FakeApi() }],
  });
  return { changes, cleared: () => cleared, view, user: userEvent.setup() };
}

describe('PurchaseOrderFilters', () => {
  it('should send the typed search after a pause', async () => {
    const { changes, user } = await setup();

    await user.type(screen.getByRole('searchbox', { name: 'Reference' }), ' po-2026-001 ');

    await waitFor(() => expect(changes).toEqual([{ search: 'po-2026-001' }]));
  });

  it('should apply the same search again after the filters were cleared', async () => {
    const { changes, user, view } = await setup();
    const search = screen.getByRole('searchbox', { name: 'Reference' });

    await user.type(search, 'po');
    await waitFor(() => expect(changes).toEqual([{ search: 'po' }]));
    view.fixture.componentRef.setInput('query', { ...EMPTY_QUERY, search: 'po' });
    view.fixture.componentRef.setInput('query', EMPTY_QUERY);
    view.fixture.detectChanges();
    await user.clear(search);
    await user.type(search, 'po');

    await waitFor(() => expect(changes).toEqual([{ search: 'po' }, { search: 'po' }]));
  });

  it('should apply a status', async () => {
    const { changes, user } = await setup();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), '10');

    expect(changes).toEqual([{ statusId: 10 }]);
  });

  it('should keep Clear filters disabled until a filter is set', async () => {
    await setup();
    expect(
      (screen.getByRole('button', { name: /clear filters/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('should refuse an eleventh customer and explain the limit', async () => {
    const ten = customers.slice(0, 10).map(({ id, name }) => ({ id, name }));
    const { changes, user } = await setup({ ...EMPTY_QUERY, customers: ten });

    await user.click(screen.getByRole('button', { name: /customers/i }));
    await user.type(screen.getByRole('searchbox', { name: 'Search customers' }), 'Alpha');
    const eleventh = await screen.findByRole('checkbox', { name: 'Alpha Customer 10' });

    expect((eleventh as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('Up to 10 customers · 10 selected');
    await user.click(eleventh);
    expect(changes).toEqual([]);
  });

  it('should add a ticked customer to the filter', async () => {
    const { changes, user } = await setup();

    await user.click(screen.getByRole('button', { name: /customers/i }));
    await user.type(screen.getByRole('searchbox', { name: 'Search customers' }), 'Alpha');
    await user.click(await screen.findByRole('checkbox', { name: 'Alpha Customer 0' }));

    expect(changes).toEqual([{ customers: [{ id: 'c0', name: 'Alpha Customer 0' }] }]);
  });

  it('should flag a start after the end and not apply it', async () => {
    const { changes, user } = await setup();

    await user.click(screen.getByRole('button', { name: /created/i }));
    const group = screen.getByRole('group', { name: 'Created' });
    const [from, to] = within(group).getAllByLabelText(/from|to/i) as HTMLInputElement[];
    from.value = '2026-10-20';
    from.dispatchEvent(new Event('change'));
    to.value = '2026-10-10';
    to.dispatchEvent(new Event('change'));

    await waitFor(() =>
      expect(screen.getByText('The start date must be on or before the end date.')).toBeTruthy(),
    );
    expect((screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(changes).toEqual([]);
  });

  it('should open the mobile sheet with a live count and apply its draft', async () => {
    const { changes, user } = await setup(EMPTY_QUERY, false);

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), '60');
    const show = await screen.findByRole('button', { name: 'Show 6 orders' });
    await user.click(show);

    expect(changes).toEqual([{ customers: [], statusId: 60, createdFrom: null, createdTo: null }]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('toListRequest', () => {
  it('should send local calendar days as their start and end instants', () => {
    const request = toListRequest({
      ...EMPTY_QUERY,
      createdFrom: '2026-10-20',
      createdTo: '2026-10-22',
      page: 3,
    }) as {
      createdMin: string;
      createdMax: string;
      skipCount: number;
    };

    expect(new Date(request.createdMin).getDate()).toBe(20);
    expect(new Date(request.createdMin).getHours()).toBe(0);
    expect(new Date(request.createdMax).getDate()).toBe(22);
    expect(new Date(request.createdMax).getHours()).toBe(23);
    expect(request.skipCount).toBe(20);
  });
});
