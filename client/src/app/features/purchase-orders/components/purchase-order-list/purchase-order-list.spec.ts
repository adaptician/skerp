import { render, screen } from '@testing-library/angular';

import { PurchaseOrderListItem } from '../../models/purchase-order-list';
import { NO_ROW_CHANGES, RowChanges } from '../../models/purchase-order-monitor';
import { PurchaseOrderList } from './purchase-order-list';

function order(id: string, status = { id: 10, name: 'Pending' }): PurchaseOrderListItem {
  return {
    id,
    reference: `PO-${id}`,
    createdAt: '2026-10-22T10:00:00Z',
    customer: { id: 'c', name: 'Alpha Studios', email: 'orders@alpha.co.za' },
    currency: { id: 1, name: 'ZAR' },
    status,
    total: 10,
    lineItemCount: 1,
    allowedStatusIds: [],
    isEditable: true,
    isDeletable: true,
  };
}

async function setup(rowChanges: RowChanges, monitor = true) {
  await render(PurchaseOrderList, {
    inputs: {
      items: [order('a'), order('b', { id: 20, name: 'Confirmed' }), order('c')],
      monitor,
      rowChanges,
    },
  });
  return (reference: string) => screen.getByText(reference).closest('tr') as HTMLElement;
}

describe('PurchaseOrderList Monitor Mode highlights', () => {
  it('should outline an edited row without tinting it', async () => {
    const row = await setup({ ...NO_ROW_CHANGES, highlights: { a: 'edited' } });

    expect(row('PO-a').classList).toContain('po-row--highlighted');
    expect(row('PO-a').classList).not.toContain('po-row--tinted');
    expect(row('PO-c').classList).not.toContain('po-row--highlighted');
  });

  it('should tint a row whose status changed with its new status colour', async () => {
    const row = await setup({ ...NO_ROW_CHANGES, highlights: { b: 'statusChanged' } });

    expect(row('PO-b').classList).toContain('po-row--tinted');
    expect(row('PO-b').style.getPropertyValue('--po-row__tint')).toBe(
      'var(--color-status-confirmed-background)',
    );
  });

  it('should show no highlight once the page holds none', async () => {
    const row = await setup(NO_ROW_CHANGES);

    expect(row('PO-a').classList).not.toContain('po-row--highlighted');
    expect(row('PO-b').style.getPropertyValue('--po-row__tint')).toBe('');
  });
});
