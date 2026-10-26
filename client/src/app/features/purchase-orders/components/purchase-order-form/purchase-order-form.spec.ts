import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Observable, of, throwError } from 'rxjs';

import { ApiError } from '../../../../common/models/api-error';
import {
  CalculateTotalsRequest,
  CreatePurchaseOrderRequest,
  PurchaseOrder,
} from '../../models/purchase-order';
import { PurchaseOrdersApi } from '../../services/purchase-orders-api';
import {
  MAX_LINE_ITEMS,
  PurchaseOrderForm,
  priceError,
  quantityError,
} from './purchase-order-form';

/** A stand-in API: lookups answer from fixed data, calculate echoes server-style totals. */
class FakePurchaseOrdersApi {
  existingReferences = new Set(['PO-2026-001']);
  calculateRequests: CalculateTotalsRequest[] = [];
  createRequests: CreatePurchaseOrderRequest[] = [];
  createResult: Observable<PurchaseOrder> | null = null;

  checkReference(reference: string) {
    const normalised = reference.trim().toUpperCase();
    if (normalised.includes(' ')) {
      return throwError(
        () => new ApiError('PurchaseOrder.ReferenceInvalidCharacters', 'No spaces allowed.', 400),
      );
    }

    return of({ reference: normalised, isAvailable: !this.existingReferences.has(normalised) });
  }

  lookupCustomers(name: string) {
    return of({
      data: name.toLowerCase().startsWith('alpha')
        ? [{ id: 'c-1', name: 'Alpha Studios', email: 'orders@alphastudios.co.za' }]
        : [],
    });
  }

  lookupProducts(sku: string) {
    return of({
      data: 'SDA001'.startsWith(sku.toUpperCase())
        ? [{ id: 'p-1', sku: 'SDA001', name: 'Delicious Soda' }]
        : [],
    });
  }

  calculate(request: CalculateTotalsRequest) {
    this.calculateRequests.push(request);
    // The server's answer for the brief's example lines.
    const totals: Record<string, number> = {};
    request.lineItems.forEach((l) => (totals[l.id] = l.quantity === 5 ? 49.95 : 38.97));
    return of({
      lineItems: request.lineItems.map((l) => ({ id: l.id, total: totals[l.id] })),
      total: request.lineItems.length === 2 ? 88.92 : totals[request.lineItems[0].id],
    });
  }

  create(request: CreatePurchaseOrderRequest) {
    this.createRequests.push(request);
    return this.createResult ?? of({ reference: request.reference } as PurchaseOrder);
  }
}

async function setup(inputs: { demoMode?: boolean } = {}) {
  const api = new FakePurchaseOrdersApi();
  const saved: PurchaseOrder[] = [];
  const view = await render(PurchaseOrderForm, {
    inputs: { demoMode: inputs.demoMode ?? false },
    on: { saved: (order: PurchaseOrder) => saved.push(order) },
    providers: [{ provide: PurchaseOrdersApi, useValue: api }],
  });
  return { api, saved, view, user: userEvent.setup() };
}

const save = () => screen.getByRole('button', { name: /save/i });
const reference = () => screen.getByRole('textbox', { name: /reference number/i });

describe('PurchaseOrderForm', () => {
  it('should open with a read-only Pending status, ZAR and one empty line', async () => {
    await setup();

    expect(screen.getByRole('dialog', { name: 'New purchase order' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Status' }).textContent).toContain('Pending');
    expect(
      (screen.getByRole('combobox', { name: /currency/i }) as HTMLSelectElement).selectedOptions[0]
        .textContent,
    ).toContain('ZAR');
    expect(screen.getAllByRole('group', { name: /^Line \d+$/ })).toHaveLength(1);
  });

  it('should disable Add line item at 100 lines', async () => {
    const { user } = await setup();
    const add = screen.getByRole('button', { name: /add line item/i });

    for (let i = 1; i < MAX_LINE_ITEMS; i++) {
      add.click();
    }
    await user.tab();

    expect(screen.getAllByRole('group', { name: /^Line \d+$/ })).toHaveLength(MAX_LINE_ITEMS);
    expect((add as HTMLButtonElement).disabled).toBe(true);
  });

  it('should show the normalised reference and a check when it is free', async () => {
    const { user } = await setup();

    await user.type(reference(), ' po-new-0001 ');
    await user.tab();

    expect((reference() as HTMLInputElement).value).toBe('PO-NEW-0001');
    expect(screen.getByRole('img', { name: 'Reference available' })).toBeTruthy();
  });

  it('should show a stop sign and disable Save for an existing reference with Demo Mode off', async () => {
    const { user } = await setup();

    await user.type(reference(), 'po-2026-001');
    await user.tab();

    expect(screen.getByRole('img', { name: 'Reference already exists' })).toBeTruthy();
    expect((save() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('should keep Save enabled, danger-styled, with the demo note, in Demo Mode', async () => {
    const { user } = await setup({ demoMode: true });

    await user.type(reference(), 'po-2026-001');
    await user.tab();

    expect((save() as HTMLButtonElement).disabled).toBe(false);
    expect(save().classList).toContain('button--danger');
    expect(save().classList).toContain('button--danger-ring');
    expect(screen.getByRole('note').textContent).toContain(
      'does not rely on client-side validation',
    );
  });

  it('should show the server message for a reference the rule rejects', async () => {
    const { user } = await setup();

    await user.type(reference(), 'PO 1');
    await user.tab();

    expect(screen.getByText('No spaces allowed.')).toBeTruthy();
  });

  it('should list customers from five characters and lock the email of the one chosen', async () => {
    const { user } = await setup();
    const name = screen.getByRole('combobox', { name: /customer name/i });

    await user.type(name, 'Alph');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.queryByRole('listbox')).toBeNull();

    await user.type(name, 'a');
    const option = await screen.findByRole('option', { name: /Alpha Studios/ });
    await user.click(option);

    expect(screen.getByRole('button', { name: /remove alpha studios/i })).toBeTruthy();
    const email = screen.getByRole('textbox', { name: /customer email/i }) as HTMLInputElement;
    expect(email.value).toBe('orders@alphastudios.co.za');
    expect(email.disabled).toBe(true);
  });

  it('should fill and lock SKU and name when a product is chosen', async () => {
    const { user } = await setup();
    const sku = screen.getByRole('combobox', { name: 'SKU, line 1' }) as HTMLInputElement;

    await user.type(sku, 'sda');
    await user.click(await screen.findByRole('option', { name: /SDA001/ }));

    expect(sku.value).toBe('SDA001');
    expect(sku.disabled).toBe(true);
    const name = screen.getByRole('textbox', { name: 'Product name, line 1' }) as HTMLInputElement;
    expect(name.value).toBe('Delicious Soda');
    expect(name.disabled).toBe(true);
  });

  it('should show sub-totals and the grand total from the calculate endpoint, never its own', async () => {
    const { api, user } = await setup();

    await user.type(screen.getByRole('spinbutton', { name: 'Quantity, line 1' }), '5');
    await user.type(screen.getByRole('spinbutton', { name: 'Price, line 1' }), '9.99');
    await user.tab();
    await user.click(screen.getByRole('button', { name: /add line item/i }));
    await user.type(screen.getByRole('spinbutton', { name: 'Quantity, line 2' }), '3');
    await user.type(screen.getByRole('spinbutton', { name: 'Price, line 2' }), '12.99');
    await user.tab();

    await waitFor(() => expect(screen.getByText('R 88.92')).toBeTruthy());
    expect(screen.getByText('R 49.95')).toBeTruthy();
    expect(screen.getByText('R 38.97')).toBeTruthy();
    expect(api.calculateRequests.at(-1)!.lineItems).toHaveLength(2);
  });

  it('should recalculate when a line is removed', async () => {
    const { api, user } = await setup();
    await user.type(screen.getByRole('spinbutton', { name: 'Quantity, line 1' }), '5');
    await user.type(screen.getByRole('spinbutton', { name: 'Price, line 1' }), '9.99');
    await user.tab();
    await user.click(screen.getByRole('button', { name: /add line item/i }));
    await user.type(screen.getByRole('spinbutton', { name: 'Quantity, line 2' }), '3');
    await user.type(screen.getByRole('spinbutton', { name: 'Price, line 2' }), '12.99');
    await user.tab();

    await user.click(screen.getByRole('button', { name: 'Remove line 2' }));

    await waitFor(() => expect(api.calculateRequests.at(-1)!.lineItems).toHaveLength(1));
    expect(screen.getAllByText('R 49.95')).toHaveLength(2);
  });

  it('should list every problem and send nothing when Save is pressed on an empty form', async () => {
    const { api, user } = await setup();

    await user.click(save());

    expect(screen.getByText('Reference number is required.')).toBeTruthy();
    expect(screen.getByText('Customer name is required.')).toBeTruthy();
    expect(screen.getByText('Email is required for a new customer.')).toBeTruthy();
    expect(screen.getByText('Quantity should be 1 or more')).toBeTruthy();
    expect(screen.getByText('Price should be greater than 0')).toBeTruthy();
    expect(api.createRequests).toHaveLength(0);
  });

  it('should send a new customer and product by value, Pending, and no totals', async () => {
    const { api, saved, user } = await setup();

    await user.type(reference(), 'PO-NEW-0002');
    await user.type(
      screen.getByRole('combobox', { name: /customer name/i }),
      'Zenith Bakery{Enter}',
    );
    await user.type(screen.getByRole('textbox', { name: /customer email/i }), 'hello@zenith.co.za');
    await user.type(screen.getByRole('combobox', { name: 'SKU, line 1' }), 'ZEN-001');
    await user.type(screen.getByRole('textbox', { name: 'Product name, line 1' }), 'Rye Loaf');
    await user.type(screen.getByRole('spinbutton', { name: 'Quantity, line 1' }), '5');
    await user.type(screen.getByRole('spinbutton', { name: 'Price, line 1' }), '9.99');
    await user.click(save());

    expect(api.createRequests).toEqual([
      {
        reference: 'PO-NEW-0002',
        customer: { name: 'Zenith Bakery', email: 'hello@zenith.co.za' },
        currencyId: 1,
        statusId: 10,
        lineItems: [{ product: { sku: 'ZEN-001', name: 'Rye Loaf' }, quantity: 5, price: 9.99 }],
        notes: null,
      },
    ]);
    expect(JSON.stringify(api.createRequests[0])).not.toContain('total');
    expect(saved).toHaveLength(1);
  });

  it('should mark the reference taken when the server refuses a duplicate', async () => {
    const { api, user } = await setup({ demoMode: true });
    api.createResult = throwError(
      () =>
        new ApiError(
          'PurchaseOrder.DuplicateReferenceNumber',
          'The provided reference number already exists.',
          409,
        ),
    );

    await user.type(reference(), 'PO-RACE-0001');
    await user.type(
      screen.getByRole('combobox', { name: /customer name/i }),
      'Zenith Bakery{Enter}',
    );
    await user.type(screen.getByRole('textbox', { name: /customer email/i }), 'hello@zenith.co.za');
    await user.type(screen.getByRole('combobox', { name: 'SKU, line 1' }), 'ZEN-001');
    await user.type(screen.getByRole('textbox', { name: 'Product name, line 1' }), 'Rye Loaf');
    await user.type(screen.getByRole('spinbutton', { name: 'Quantity, line 1' }), '1');
    await user.type(screen.getByRole('spinbutton', { name: 'Price, line 1' }), '1');
    await user.click(save());

    expect(screen.getByRole('img', { name: 'Reference already exists' })).toBeTruthy();
    expect(save().classList).toContain('button--danger');
    expect(save().classList).toContain('button--danger-ring');
  });
});

describe('PurchaseOrderForm totals after a line becomes invalid', () => {
  it('should drop the line from the server totals instead of keeping its old total', async () => {
    const { api, user } = await setup();
    const quantity = screen.getByRole('spinbutton', { name: 'Quantity, line 1' });
    await user.type(quantity, '5');
    await user.type(screen.getByRole('spinbutton', { name: 'Price, line 1' }), '9.99');
    await user.tab();
    await waitFor(() => expect(screen.getAllByText('R 49.95')).toHaveLength(2));

    await user.clear(quantity);
    await user.tab();

    await waitFor(() => expect(screen.queryByText('R 49.95')).toBeNull());
    expect(api.calculateRequests).toHaveLength(1);
    expect(screen.getAllByText('R 0.00')).toHaveLength(2);
  });
});

describe('line amount rules', () => {
  it('should accept whole quantities from 1 to 1000', () => {
    expect(quantityError(1)).toBeNull();
    expect(quantityError(1000)).toBeNull();
    expect(quantityError(0)).not.toBeNull();
    expect(quantityError(-2)).not.toBeNull();
    expect(quantityError(1.5)).not.toBeNull();
    expect(quantityError(1001)).not.toBeNull();
    expect(quantityError(null)).not.toBeNull();
  });

  it('should accept prices above zero with at most four decimals', () => {
    expect(priceError(0.01)).toBeNull();
    expect(priceError(12.3456)).toBeNull();
    expect(priceError(0)).not.toBeNull();
    expect(priceError(-1)).not.toBeNull();
    expect(priceError(1.23456)).not.toBeNull();
    expect(priceError(null)).not.toBeNull();
  });
});
