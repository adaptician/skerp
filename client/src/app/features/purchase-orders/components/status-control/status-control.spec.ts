import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { STATUS } from '../../models/purchase-order';
import { PurchaseOrderListItem } from '../../models/purchase-order-list';
import { DEMO_STATUS_NOTE, StatusControl } from './status-control';

function order(
  status: { id: number; name: string },
  allowedStatusIds: readonly number[],
): PurchaseOrderListItem {
  return {
    id: 'o1',
    reference: 'PO-2026-024',
    createdAt: '2026-10-22T10:00:00Z',
    customer: { id: 'c1', name: 'Alpha Studios', email: 'orders@alpha.co.za' },
    currency: { id: 1, name: 'ZAR' },
    status,
    total: 10,
    lineItemCount: 1,
    allowedStatusIds,
    isEditable: allowedStatusIds.length > 0,
    isDeletable: allowedStatusIds.length > 0,
  };
}

const PENDING = order({ id: STATUS.pending, name: 'Pending' }, [
  STATUS.confirmed,
  STATUS.cancelled,
]);
const FULFILLED = order({ id: STATUS.fulfilled, name: 'Fulfilled' }, []);

async function setup(value: PurchaseOrderListItem, demoMode = false) {
  const selected: number[] = [];
  await render(StatusControl, {
    inputs: { order: value, demoMode },
    on: { statusSelected: (id: number) => selected.push(id) },
  });
  return { selected, user: userEvent.setup() };
}

const trigger = () => screen.getByRole('button', { name: /^Status of PO-2026-024/ });
const panel = () => screen.getByRole('group', { name: 'Change the status of PO-2026-024' });

describe('StatusControl', () => {
  it('should offer only the allowed statuses with Demo Mode off', async () => {
    const { selected, user } = await setup(PENDING);

    await user.click(trigger());
    const options = within(panel()).getAllByRole('button');
    expect(options.map((o) => o.textContent?.trim())).toEqual(['Confirmed', 'Cancelled']);
    expect(within(panel()).queryByRole('button', { name: /Demo Mode/ })).toBeNull();

    await user.click(within(panel()).getByRole('button', { name: 'Confirmed' }));
    expect(selected).toEqual([STATUS.confirmed]);
    expect(screen.queryByRole('group')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('should show a plain pill for a terminal order with Demo Mode off', async () => {
    await setup(FULFILLED);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Fulfilled')).toBeTruthy();
  });

  it('should offer all four statuses, the current one ticked, in Demo Mode', async () => {
    const { selected, user } = await setup(PENDING, true);

    await user.click(trigger());
    const choices = ['Pending', 'Confirmed', 'Fulfilled', 'Cancelled'].map((name) =>
      within(panel()).getByRole('button', { name }),
    );
    expect(choices[0].getAttribute('aria-current')).toBe('true');
    expect(choices[1].getAttribute('aria-current')).toBeNull();
    expect(within(panel()).getAllByRole('button', { name: /offered in Demo Mode/ })).toHaveLength(
      4,
    );

    await user.click(choices[2]);
    expect(selected).toEqual([STATUS.fulfilled]);
  });

  it('should give a terminal order the full control in Demo Mode', async () => {
    const { user } = await setup(FULFILLED, true);

    await user.click(trigger());
    expect(
      within(panel()).getAllByRole('button', { name: /^(Pending|Confirmed|Fulfilled|Cancelled)$/ }),
    ).toHaveLength(4);
  });

  it('should show the Demo Mode note on focus and hide it on Escape', async () => {
    const { user } = await setup(PENDING, true);

    await user.click(trigger());
    const info = within(panel()).getByRole('button', {
      name: 'Why Fulfilled is offered in Demo Mode',
    });
    info.focus();
    const described = document.getElementById(info.getAttribute('aria-describedby') ?? '');
    expect(described?.textContent?.trim()).toBe(DEMO_STATUS_NOTE);
    await waitFor(() => expect(described?.classList).toContain('info-tip__tooltip--visible'));

    await user.keyboard('{Escape}');
    await waitFor(() => expect(described?.classList).not.toContain('info-tip__tooltip--visible'));
    expect(panel()).toBeTruthy();
  });

  it('should show the Demo Mode note on hover', async () => {
    const { user } = await setup(PENDING, true);

    await user.click(trigger());
    const info = within(panel()).getByRole('button', {
      name: 'Why Cancelled is offered in Demo Mode',
    });
    const described = document.getElementById(info.getAttribute('aria-describedby') ?? '');

    await user.hover(info);
    await waitFor(() => expect(described?.classList).toContain('info-tip__tooltip--visible'));
    await user.unhover(info);
    await waitFor(() => expect(described?.classList).not.toContain('info-tip__tooltip--visible'));
  });

  it('should move between options with the arrow keys and close on Escape', async () => {
    const { user } = await setup(PENDING);

    await user.click(trigger());
    expect(document.activeElement?.textContent?.trim()).toBe('Confirmed');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent?.trim()).toBe('Cancelled');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent?.trim()).toBe('Confirmed');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('should be disabled while a change is with the server', async () => {
    await render(StatusControl, { inputs: { order: PENDING, busy: true } });

    expect((trigger() as HTMLButtonElement).disabled).toBe(true);
  });
});
