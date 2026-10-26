import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Observable, of, throwError } from 'rxjs';

import { ApiError } from '../../../../common/models/api-error';
import {
  CalculateTotalsRequest,
  EditPurchaseOrderRequest,
  PurchaseOrder,
} from '../../models/purchase-order';
import { PurchaseOrderListItem } from '../../models/purchase-order-list';
import { PurchaseOrdersApi } from '../../services/purchase-orders-api';
import { MAX_LINE_ITEMS, PurchaseOrderForm } from './purchase-order-form';

function line(n: number, quantity = 2, price = 24.5) {
  return {
    id: `l-${n}`,
    productId: `p-${n}`,
    sku: `SKU${String(n).padStart(3, '0')}`,
    name: `Product ${n}`,
    quantity,
    price,
    total: quantity * price,
  };
}

function order(lineCount = 2): PurchaseOrder {
  const lineItems = Array.from({ length: lineCount }, (_, i) => line(i + 1));
  return {
    id: 'o-1',
    reference: 'PO-2026-024',
    createdAt: '2026-10-22T10:00:00Z',
    customer: { id: 'c-1', name: 'Alpha Studios', email: 'orders@alphastudios.co.za' },
    currency: { id: 1, name: 'ZAR' },
    status: { id: 10, name: 'Pending' },
    lineItems,
    lineItemCount: lineCount,
    total: lineItems.reduce((sum, l) => sum + l.total, 0),
    notes: 'Deliver to the side entrance before 10:00.',
    allowedStatusIds: [20, 90],
    isEditable: true,
    isDeletable: true,
  };
}

class FakeApi {
  editRequests: EditPurchaseOrderRequest[] = [];
  editResult: Observable<PurchaseOrderListItem> | null = null;

  calculate(request: CalculateTotalsRequest) {
    return of({
      lineItems: request.lineItems.map((l) => ({ id: l.id, total: l.quantity * l.price })),
      total: request.lineItems.reduce((sum, l) => sum + l.quantity * l.price, 0),
    });
  }

  lookupProducts() {
    return of({ data: [] });
  }

  edit(_id: string, request: EditPurchaseOrderRequest) {
    this.editRequests.push(request);
    return this.editResult ?? of({ id: 'o-1', reference: 'PO-2026-024' } as PurchaseOrderListItem);
  }
}

async function setup(value = order()) {
  const api = new FakeApi();
  const edited: PurchaseOrderListItem[] = [];
  await render(PurchaseOrderForm, {
    inputs: { order: value },
    on: { edited: (row: PurchaseOrderListItem) => edited.push(row) },
    providers: [{ provide: PurchaseOrdersApi, useValue: api }],
  });
  return { api, edited, user: userEvent.setup() };
}

const saveChanges = () => screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement;

describe('PurchaseOrderForm (edit)', () => {
  it('should show the order with reference, customer and status locked', async () => {
    await setup();

    expect(screen.getByRole('dialog', { name: 'Edit purchase order' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Reference number' }).textContent).toContain(
      'PO-2026-024',
    );
    expect(screen.getByRole('group', { name: 'Customer' }).textContent).toContain('Alpha Studios');
    expect(
      screen.getByText(/orders@alphastudios\.co\.za · customer cannot be changed/),
    ).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: /reference number/i })).toBeNull();
    expect(screen.getByText('Change the status from the purchase-order list.')).toBeTruthy();
    expect(screen.getByText('2 of 100')).toBeTruthy();
    const sku = screen.getByRole('combobox', { name: 'SKU, line 1' }) as HTMLInputElement;
    expect(sku.value).toBe('SKU001');
    expect(sku.disabled).toBe(true);
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveProperty(
      'value',
      'Deliver to the side entrance before 10:00.',
    );
  });

  it('should keep Save changes disabled until something changes', async () => {
    const { user } = await setup();
    expect(saveChanges().disabled).toBe(true);

    const notes = screen.getByRole('textbox', { name: 'Notes' });
    await user.type(notes, '!');
    expect(saveChanges().disabled).toBe(false);

    await user.type(notes, '{Backspace}');
    expect(saveChanges().disabled).toBe(true);
  });

  it('should send existing lines by id, new lines by product, and drop removed lines', async () => {
    const { api, edited, user } = await setup(order(3));

    const quantity = screen.getByRole('spinbutton', { name: 'Quantity, line 1' });
    await user.clear(quantity);
    await user.type(quantity, '7');
    await user.click(screen.getByRole('button', { name: 'Remove line 2' }));
    await user.click(screen.getByRole('button', { name: /add line item/i }));
    const newLine = screen.getByRole('group', { name: 'Line 3' });
    await user.type(within(newLine).getByRole('combobox', { name: 'SKU, line 3' }), 'NEW001');
    await user.type(
      within(newLine).getByRole('textbox', { name: 'Product name, line 3' }),
      'Chips',
    );
    await user.type(within(newLine).getByRole('spinbutton', { name: 'Quantity, line 3' }), '1');
    await user.type(within(newLine).getByRole('spinbutton', { name: 'Price, line 3' }), '5');
    await user.click(saveChanges());

    expect(api.editRequests).toEqual([
      {
        currencyId: 1,
        lineItems: [
          { id: 'l-1', product: { id: 'p-1' }, quantity: 7, price: 24.5 },
          { id: 'l-3', product: { id: 'p-3' }, quantity: 2, price: 24.5 },
          { product: { sku: 'NEW001', name: 'Chips' }, quantity: 1, price: 5 },
        ],
        notes: 'Deliver to the side entrance before 10:00.',
      },
    ]);
    expect(edited).toHaveLength(1);
  });

  it('should keep the form open when the server refuses the edit', async () => {
    const { api, edited, user } = await setup();
    api.editResult = throwError(
      () => new ApiError('PurchaseOrder.NotEditable', 'Only Pending orders can be edited.', 422),
    );

    await user.type(screen.getByRole('textbox', { name: 'Notes' }), '!');
    await user.click(saveChanges());

    await waitFor(() => expect(saveChanges().disabled).toBe(false));
    expect(edited).toHaveLength(0);
    expect(screen.getByRole('dialog', { name: 'Edit purchase order' })).toBeTruthy();
  });

  it('should disable Add line item at the 100-line limit', async () => {
    await setup(order(MAX_LINE_ITEMS));

    expect(
      (screen.getByRole('button', { name: /add line item/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  }, 30_000);

  it('should not show the Demo Mode save note when editing', async () => {
    await render(PurchaseOrderForm, {
      inputs: { order: order(), demoMode: true },
      providers: [{ provide: PurchaseOrdersApi, useValue: new FakeApi() }],
    });

    expect(screen.queryByRole('note')).toBeNull();
  });
});
