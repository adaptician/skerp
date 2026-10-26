import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
  catchError,
  map,
  startWith,
} from 'rxjs';

import { DemoNote } from '../../../../common/components/demo-note/demo-note';
import { Icon } from '../../../../common/components/icon/icon';
import { Modal } from '../../../../common/components/modal/modal';
import { Pill } from '../../../../common/components/pill/pill';
import { PillRemovable } from '../../../../common/components/pill-removable/pill-removable';
import { StatusPill } from '../../../../common/components/status-pill/status-pill';
import {
  TypeaheadMenu,
  TypeaheadOption,
} from '../../../../common/components/typeahead-menu/typeahead-menu';
import { ApiError } from '../../../../common/models/api-error';
import { MoneyPipe } from '../../../../common/pipes/money.pipe';
import { NotificationService } from '../../../../common/services/notification.service';
import {
  CURRENCIES,
  CreatePurchaseOrderRequest,
  CustomerLookupItem,
  DEFAULT_CURRENCY_ID,
  EditPurchaseOrderRequest,
  LineItemRequest,
  ProductLookupItem,
  PurchaseOrder,
  PurchaseOrderErrorCodes,
  ReferenceAvailability,
  STATUS,
  currencySymbol,
  statusPill,
} from '../../models/purchase-order';
import { PurchaseOrderListItem } from '../../models/purchase-order-list';
import { PurchaseOrdersApi } from '../../services/purchase-orders-api';

/** Line-item limits (asmp-1434-line-item-limit) and field limits mirrored for client hints. */
export const MIN_LINE_ITEMS = 1;
export const MAX_LINE_ITEMS = 100;
const MAX_QUANTITY = 1000;
const MIN_PRICE = 0.01;
const MAX_PRICE = 999_999_999.9999;
const NOTES_MAX_LENGTH = 512;
/** Customer suggestions start at five characters (brief). */
export const CUSTOMER_SEARCH_MIN_LENGTH = 5;
const LOOKUP_DEBOUNCE_MS = 250;

/** The brief's Demo Mode note under Save, verbatim. */
export const DEMO_SAVE_NOTE =
  "To improve a user's experience, asserting reference availability is performed proactively. " +
  "Disabling the 'Save' button provides a more interactive user experience. However, the button " +
  'has been left enabled during demo mode to demonstrate that the backend does not rely on ' +
  'client-side validation to enforce data integrity.';

type ReferenceState = 'idle' | 'checking' | 'available' | 'exists' | 'invalid';

type LineGroup = FormGroup<{
  key: FormControl<string>;
  /** The persisted line's id when editing; null for a line added in this form. */
  lineItemId: FormControl<string | null>;
  productId: FormControl<string | null>;
  sku: FormControl<string>;
  name: FormControl<string>;
  quantity: FormControl<number | null>;
  price: FormControl<number | null>;
}>;

let nextLineKey = 1;

/**
 * The purchase-order form in its modal (Overlay/Modal with the create- and edit-modal frames). Every
 * total shown comes from the server; the form never adds or multiplies an amount. Lookups help the
 * user, but the server decides: in Demo Mode a known duplicate can still be saved, so a reviewer sees
 * the API refuse it. Given an `order`, the form edits it: reference, customer and status are locked,
 * existing lines keep their product, and "Save changes" waits for a change.
 */
@Component({
  selector: 'adapt-purchase-order-form',
  imports: [
    ReactiveFormsModule,
    Modal,
    Icon,
    StatusPill,
    Pill,
    PillRemovable,
    TypeaheadMenu,
    DemoNote,
    MoneyPipe,
  ],
  templateUrl: './purchase-order-form.html',
  styleUrl: './purchase-order-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderForm implements OnInit {
  private readonly api = inject(PurchaseOrdersApi);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  /** True while Demo Mode is on: Save stays enabled for a known duplicate reference. */
  readonly demoMode = input(false);
  /** The order to edit, with every line; null to create one. */
  readonly order = input<PurchaseOrder | null>(null);

  /** The user closed the form without saving. */
  readonly closed = output<void>();
  /** The order was created; carries the server's copy. */
  readonly saved = output<PurchaseOrder>();
  /** The edit was saved; carries the updated list row. */
  readonly edited = output<PurchaseOrderListItem>();

  protected readonly editing = computed(() => this.order() !== null);
  protected readonly orderPill = computed(() =>
    statusPill(this.order()?.status.id ?? STATUS.pending),
  );
  /** Editing: true while the form still matches the order as loaded. */
  protected readonly unchanged = signal(true);
  private initialEdit = '';

  protected readonly currencies = CURRENCIES;
  protected readonly maxLineItems = MAX_LINE_ITEMS;
  protected readonly pendingStatus = STATUS.pending;
  protected readonly demoSaveNote = DEMO_SAVE_NOTE;

  protected readonly form = this.fb.group({
    reference: ['', Validators.required],
    customerName: [''],
    customerEmail: [''],
    currencyId: this.fb.control<number>(DEFAULT_CURRENCY_ID),
    notes: ['', Validators.maxLength(NOTES_MAX_LENGTH)],
    lineItems: this.fb.array<LineGroup>(
      [],
      [Validators.minLength(MIN_LINE_ITEMS), Validators.maxLength(MAX_LINE_ITEMS)],
    ),
  });

  protected get lineItems(): FormArray<LineGroup> {
    return this.form.controls.lineItems;
  }

  // Reference availability (brief: lookup on blur; green check or red stop sign).
  protected readonly referenceState = signal<ReferenceState>('idle');
  protected readonly referenceMessage = signal<string | null>(null);

  // Customer typeahead.
  protected readonly selectedCustomer = signal<CustomerLookupItem | null>(null);
  protected readonly customerConfirmedNew = signal(false);
  protected readonly customerOptions = signal<readonly CustomerLookupItem[]>([]);
  protected readonly customerMenuOpen = signal(false);
  protected readonly customerActiveIndex = signal(-1);
  protected readonly customerMenuOptions = computed<TypeaheadOption[]>(() =>
    this.customerOptions().map((c) => ({ id: c.id, primary: c.name, secondary: c.email })),
  );
  private readonly customerSearch = new Subject<string>();
  /** Reference checks; a newer check cancels an older one still in flight. */
  private readonly referenceChecks = new Subject<string>();

  // SKU typeahead: one search at a time, for the line being typed in.
  protected readonly skuSearchKey = signal<string | null>(null);
  protected readonly skuOptions = signal<readonly ProductLookupItem[]>([]);
  protected readonly skuActiveIndex = signal(-1);
  protected readonly skuMenuOptions = computed<TypeaheadOption[]>(() =>
    this.skuOptions().map((p) => ({ id: p.id, primary: p.sku, secondary: p.name })),
  );
  private readonly skuSearch = new Subject<{ key: string; text: string }>();

  // Server totals, keyed by each line's client key.
  protected readonly lineTotals = signal<ReadonlyMap<string, number>>(new Map());
  protected readonly grandTotal = signal(0);
  protected readonly calculatingKeys = signal<ReadonlySet<string>>(new Set());
  protected readonly calculating = computed(() => this.calculatingKeys().size > 0);
  private readonly calculateRequests = new Subject<readonly string[]>();

  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);

  private readonly currencyId = toSignal(
    this.form.controls.currencyId.valueChanges.pipe(startWith(this.form.controls.currencyId.value)),
    { requireSync: true },
  );
  protected readonly symbol = computed(() => currencySymbol(this.currencyId()));

  /** Line count, re-read on every add and remove. */
  protected readonly lineCount = signal(0);

  protected readonly referenceExists = computed(() => this.referenceState() === 'exists');
  /** Demo Mode off: a reference known to exist disables Save (brief). Editing: nothing changed yet. */
  protected readonly saveDisabled = computed(
    () =>
      this.saving() ||
      (this.editing() ? this.unchanged() : this.referenceExists() && !this.demoMode()),
  );
  /** Demo Mode on with a known duplicate: Save stays enabled but is danger-styled. */
  protected readonly saveWarns = computed(
    () => !this.editing() && this.referenceExists() && this.demoMode(),
  );

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.editing()) {
        this.unchanged.set(JSON.stringify(this.toEditRequest()) === this.initialEdit);
      }
    });

    this.referenceChecks
      .pipe(
        switchMap((raw) =>
          this.api
            .checkReference(raw)
            .pipe(catchError((error: unknown) => of(error instanceof ApiError ? error : null))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((outcome) => this.onReferenceChecked(outcome));

    this.customerSearch
      .pipe(
        debounceTime(LOOKUP_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((text) =>
          text.length < CUSTOMER_SEARCH_MIN_LENGTH
            ? of([] as readonly CustomerLookupItem[])
            : this.api.lookupCustomers(text).pipe(
                map((response) => response.data),
                catchError(() => of([] as readonly CustomerLookupItem[])),
              ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((options) => {
        this.customerOptions.set(options);
        this.customerActiveIndex.set(-1);
        this.customerMenuOpen.set(options.length > 0 && this.selectedCustomer() === null);
      });

    this.skuSearch
      .pipe(
        debounceTime(LOOKUP_DEBOUNCE_MS),
        switchMap(({ key, text }) =>
          (text.length === 0
            ? of([] as readonly ProductLookupItem[])
            : this.api.lookupProducts(text).pipe(
                map((response) => response.data),
                catchError(() => of([] as readonly ProductLookupItem[])),
              )
          ).pipe(map((options) => ({ key, options }))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ key, options }) => {
        if (this.skuSearchKey() === key) {
          this.skuOptions.set(options);
          this.skuActiveIndex.set(-1);
        }
      });

    this.calculateRequests
      .pipe(
        switchMap((keys) => {
          const lines = this.lineItems.controls
            .filter((line) => this.hasValidAmounts(line))
            .map((line) => ({
              id: line.controls.key.value,
              quantity: line.controls.quantity.value as number,
              price: line.controls.price.value as number,
            }));

          if (lines.length === 0) {
            return of({ keys, totals: { lineItems: [], total: 0 } });
          }

          return this.api.calculate({ lineItems: lines }).pipe(
            map((totals) => ({ keys, totals })),
            catchError(() => of({ keys, totals: null })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ totals }) => {
        this.calculatingKeys.set(new Set());
        if (totals) {
          this.lineTotals.set(new Map(totals.lineItems.map((l) => [l.id, l.total])));
          this.grandTotal.set(totals.total);
        }
      });
  }

  ngOnInit(): void {
    const order = this.order();
    if (order) {
      this.fill(order);
    } else {
      this.addLine();
    }
  }

  /** Loads the order into the form: its lines with their server totals, product locked. */
  private fill(order: PurchaseOrder): void {
    this.selectedCustomer.set(order.customer);
    this.form.patchValue({
      reference: order.reference,
      currencyId: order.currency.id,
      notes: order.notes ?? '',
    });

    const totals = new Map<string, number>();
    for (const item of order.lineItems) {
      const line = this.newLine();
      line.patchValue({
        lineItemId: item.id,
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      });
      line.controls.sku.disable();
      line.controls.name.disable();
      this.lineItems.push(line, { emitEvent: false });
      totals.set(line.controls.key.value, item.total);
    }

    this.lineCount.set(this.lineItems.length);
    this.lineTotals.set(totals);
    this.grandTotal.set(order.total);
    this.initialEdit = JSON.stringify(this.toEditRequest());
    this.unchanged.set(true);
  }

  // ── Reference ────────────────────────────────────────────────────────────

  protected onReferenceInput(): void {
    this.referenceState.set('idle');
    this.referenceMessage.set(null);
  }

  /** Checks availability on blur; the server normalises the value and the field shows its result. */
  protected checkReference(): void {
    const raw = this.form.controls.reference.value;
    if (raw.trim().length === 0) {
      this.referenceState.set('idle');
      return;
    }

    this.referenceState.set('checking');
    this.referenceChecks.next(raw);
  }

  private onReferenceChecked(outcome: ReferenceAvailability | ApiError | null): void {
    if (outcome instanceof ApiError || outcome === null) {
      const invalid = outcome instanceof ApiError && outcome.status === 400;
      this.referenceState.set(invalid ? 'invalid' : 'idle');
      this.referenceMessage.set(invalid ? outcome.description : null);
      return;
    }

    this.form.controls.reference.setValue(outcome.reference);
    this.referenceState.set(outcome.isAvailable ? 'available' : 'exists');
    this.referenceMessage.set(
      outcome.isAvailable
        ? `${outcome.reference} is available.`
        : `${outcome.reference} already exists. Choose a different reference number.`,
    );
  }

  // ── Customer ─────────────────────────────────────────────────────────────

  protected onCustomerInput(): void {
    this.customerConfirmedNew.set(false);
    this.customerSearch.next(this.form.controls.customerName.value.trim());
    if (this.form.controls.customerName.value.trim().length < CUSTOMER_SEARCH_MIN_LENGTH) {
      this.customerMenuOpen.set(false);
    }
  }

  protected onCustomerKeydown(event: KeyboardEvent): void {
    const options = this.customerOptions();
    const open = this.customerMenuOpen() && options.length > 0;

    switch (event.key) {
      case 'ArrowDown':
        if (open) {
          event.preventDefault();
          this.customerActiveIndex.update((i) => (i + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        if (open) {
          event.preventDefault();
          this.customerActiveIndex.update((i) => (i <= 0 ? options.length - 1 : i - 1));
        }
        break;
      case 'Enter':
        // Enter picks the highlighted customer, or confirms a new one (brief).
        event.preventDefault();
        if (open && this.customerActiveIndex() >= 0) {
          this.selectCustomer(options[this.customerActiveIndex()]);
        } else if (this.form.controls.customerName.value.trim().length > 0) {
          this.customerConfirmedNew.set(true);
          this.customerMenuOpen.set(false);
        }
        break;
      case 'Escape':
        if (open) {
          // Closes the suggestions only; the modal stays open.
          event.preventDefault();
          this.customerMenuOpen.set(false);
        }
        break;
    }
  }

  protected onCustomerBlur(): void {
    this.customerMenuOpen.set(false);
    if (
      this.selectedCustomer() === null &&
      this.form.controls.customerName.value.trim().length > 0
    ) {
      this.customerConfirmedNew.set(true);
    }
  }

  protected selectCustomerOption(option: TypeaheadOption): void {
    const customer = this.customerOptions().find((c) => c.id === option.id);
    if (customer) {
      this.selectCustomer(customer);
    }
  }

  private selectCustomer(customer: CustomerLookupItem): void {
    // An existing customer's email is shown read-only; editing it is not supported (brief).
    this.selectedCustomer.set(customer);
    this.customerConfirmedNew.set(false);
    this.customerMenuOpen.set(false);
    this.form.controls.customerName.setValue(customer.name);
    this.form.controls.customerEmail.setValue(customer.email);
    this.form.controls.customerEmail.disable();
  }

  protected removeCustomer(): void {
    this.selectedCustomer.set(null);
    this.form.controls.customerName.setValue('');
    this.form.controls.customerEmail.setValue('');
    this.form.controls.customerEmail.enable();
    this.customerOptions.set([]);
  }

  // ── Line items ───────────────────────────────────────────────────────────

  protected addLine(): void {
    if (this.lineItems.length >= MAX_LINE_ITEMS) {
      return;
    }

    this.lineItems.push(this.newLine());
    this.lineCount.set(this.lineItems.length);
  }

  private newLine(): LineGroup {
    return this.fb.group({
      key: this.fb.control(`line-${nextLineKey++}`),
      lineItemId: this.fb.control<string | null>(null),
      productId: this.fb.control<string | null>(null),
      sku: this.fb.control(''),
      name: this.fb.control(''),
      quantity: this.fb.control<number | null>(null),
      price: this.fb.control<number | null>(null),
    }) as LineGroup;
  }

  protected removeLine(index: number): void {
    if (this.lineItems.length <= MIN_LINE_ITEMS) {
      return;
    }

    const removed = this.lineItems.at(index);
    this.lineItems.removeAt(index);
    this.lineCount.set(this.lineItems.length);
    // Totals for the remaining lines come back from the server (brief: recalculate on remove).
    if (this.hasValidAmounts(removed)) {
      this.requestCalculation([]);
    }
  }

  /** Recalculates on blur of quantity or price, when the line now has valid amounts. */
  protected onAmountBlur(line: LineGroup): void {
    line.controls.quantity.markAsTouched();
    line.controls.price.markAsTouched();
    const key = line.controls.key.value;
    if (this.hasValidAmounts(line)) {
      this.requestCalculation([key]);
    } else if (this.lineTotals().has(key)) {
      // The line no longer counts: its old total must not stay in the grand total.
      this.requestCalculation([key]);
    }
  }

  protected onSkuInput(line: LineGroup): void {
    const key = line.controls.key.value;
    this.skuSearchKey.set(key);
    this.skuOptions.set([]);
    this.skuSearch.next({ key, text: line.controls.sku.value.trim() });
  }

  protected onSkuKeydown(event: KeyboardEvent, line: LineGroup): void {
    const options = this.skuOptions();
    const open = this.skuSearchKey() === line.controls.key.value && options.length > 0;

    switch (event.key) {
      case 'ArrowDown':
        if (open) {
          event.preventDefault();
          this.skuActiveIndex.update((i) => (i + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        if (open) {
          event.preventDefault();
          this.skuActiveIndex.update((i) => (i <= 0 ? options.length - 1 : i - 1));
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (open && this.skuActiveIndex() >= 0) {
          this.selectProduct(line, options[this.skuActiveIndex()]);
        } else {
          this.closeSkuMenu();
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          this.closeSkuMenu();
        }
        break;
    }
  }

  protected closeSkuMenu(): void {
    this.skuSearchKey.set(null);
    this.skuOptions.set([]);
  }

  protected selectProductOption(line: LineGroup, option: TypeaheadOption): void {
    const product = this.skuOptions().find((p) => p.id === option.id);
    if (product) {
      this.selectProduct(line, product);
    }
  }

  private selectProduct(line: LineGroup, product: ProductLookupItem): void {
    // A chosen product's SKU and name are filled and locked (brief).
    line.controls.productId.setValue(product.id);
    line.controls.sku.setValue(product.sku);
    line.controls.name.setValue(product.name);
    line.controls.sku.disable();
    line.controls.name.disable();
    this.closeSkuMenu();
  }

  protected lineTotal(line: LineGroup): number {
    return this.lineTotals().get(line.controls.key.value) ?? 0;
  }

  protected isCalculating(line: LineGroup): boolean {
    return this.calculatingKeys().has(line.controls.key.value);
  }

  private requestCalculation(changedKeys: readonly string[]): void {
    this.calculatingKeys.set(new Set(changedKeys.length > 0 ? changedKeys : ['grand-total']));
    this.calculateRequests.next(changedKeys);
  }

  private hasValidAmounts(line: LineGroup): boolean {
    return (
      quantityError(line.controls.quantity.value) === null &&
      priceError(line.controls.price.value) === null
    );
  }

  // ── Validation messages ──────────────────────────────────────────────────

  protected showErrors(control: AbstractControl): boolean {
    return this.submitted() || control.touched;
  }

  protected referenceError(): string | null {
    const control = this.form.controls.reference;
    if (this.showErrors(control) && control.value.trim().length === 0) {
      return 'Reference number is required.';
    }

    return this.referenceState() === 'invalid' || this.referenceState() === 'exists'
      ? this.referenceMessage()
      : null;
  }

  protected customerNameError(): string | null {
    const control = this.form.controls.customerName;
    return this.showErrors(control) &&
      this.selectedCustomer() === null &&
      control.value.trim().length === 0
      ? 'Customer name is required.'
      : null;
  }

  protected customerEmailError(): string | null {
    const control = this.form.controls.customerEmail;
    if (this.selectedCustomer() !== null || !this.showErrors(control)) {
      return null;
    }

    if (control.value.trim().length === 0) {
      return 'Email is required for a new customer.';
    }

    return Validators.email(control) === null && control.value.includes('.')
      ? null
      : 'Enter a valid email address.';
  }

  protected lineErrors(line: LineGroup): string[] {
    const errors: string[] = [];
    const show = (control: AbstractControl) => this.showErrors(control);

    if (line.controls.productId.value === null) {
      if (show(line.controls.sku) && line.controls.sku.value.trim().length === 0) {
        errors.push('SKU is required');
      }
      if (show(line.controls.name) && line.controls.name.value.trim().length === 0) {
        errors.push('Product name is required');
      }
    }

    if (show(line.controls.quantity)) {
      const message = quantityError(line.controls.quantity.value);
      if (message) {
        errors.push(message);
      }
    }

    if (show(line.controls.price)) {
      const message = priceError(line.controls.price.value);
      if (message) {
        errors.push(message);
      }
    }

    return errors;
  }

  protected fieldInvalid(line: LineGroup, field: 'sku' | 'name' | 'quantity' | 'price'): boolean {
    const control = line.controls[field];
    if (!this.showErrors(control)) {
      return false;
    }

    switch (field) {
      case 'sku':
      case 'name':
        return (
          line.controls.productId.value === null && String(control.value ?? '').trim().length === 0
        );
      case 'quantity':
        return quantityError(line.controls.quantity.value) !== null;
      case 'price':
        return priceError(line.controls.price.value) !== null;
    }
  }

  protected notesError(): string | null {
    return this.form.controls.notes.hasError('maxlength')
      ? `Notes may be at most ${NOTES_MAX_LENGTH} characters long.`
      : null;
  }

  protected notesLength(): number {
    return this.form.controls.notes.value.length;
  }

  private hasClientErrors(): boolean {
    return (
      (this.referenceError() !== null && this.referenceState() !== 'exists') ||
      this.customerNameError() !== null ||
      this.customerEmailError() !== null ||
      this.notesError() !== null ||
      this.lineItems.controls.some((line) => this.lineErrors(line).length > 0)
    );
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  protected cancel(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  protected save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.saveDisabled() || this.hasClientErrors()) {
      return;
    }

    this.saving.set(true);
    const order = this.order();
    if (order) {
      this.saveEdit(order);
      return;
    }

    this.api
      .create(this.toRequest())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.saving.set(false);
          this.notifications.showSuccess(
            'Purchase order created',
            `${order.reference} was saved as Pending.`,
          );
          this.saved.emit(order);
        },
        error: (error: unknown) => {
          // The error popup already shows the server's message (apiErrorInterceptor).
          this.saving.set(false);
          if (
            error instanceof ApiError &&
            error.code === PurchaseOrderErrorCodes.duplicateReference
          ) {
            this.referenceState.set('exists');
            const reference = this.form.controls.reference.value;
            this.referenceMessage.set(
              `${reference} already exists. Choose a different reference number.`,
            );
          }
        },
      });
  }

  private saveEdit(order: PurchaseOrder): void {
    this.api
      .edit(order.id, this.toEditRequest())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (row) => {
          this.saving.set(false);
          this.notifications.showSuccess('Purchase order updated', `${row.reference} was saved.`);
          this.edited.emit(row);
        },
        // The error popup shows the server's message (apiErrorInterceptor); the form stays open.
        error: () => this.saving.set(false),
      });
  }

  private toEditRequest(): EditPurchaseOrderRequest {
    const value = this.form.getRawValue();
    const notes = value.notes.trim();

    return {
      currencyId: value.currencyId,
      lineItems: value.lineItems.map((line): LineItemRequest => ({
        ...(line.lineItemId ? { id: line.lineItemId } : {}),
        product: line.productId ? { id: line.productId } : { sku: line.sku, name: line.name },
        quantity: line.quantity as number,
        price: line.price as number,
      })),
      notes: notes.length > 0 ? notes : null,
    };
  }

  private toRequest(): CreatePurchaseOrderRequest {
    const value = this.form.getRawValue();
    const customer = this.selectedCustomer();
    const notes = value.notes.trim();

    return {
      reference: value.reference,
      customer: customer
        ? { id: customer.id }
        : { name: value.customerName, email: value.customerEmail.trim() },
      currencyId: value.currencyId,
      statusId: STATUS.pending,
      lineItems: value.lineItems.map((line): LineItemRequest => ({
        product: line.productId ? { id: line.productId } : { sku: line.sku, name: line.name },
        quantity: line.quantity as number,
        price: line.price as number,
      })),
      notes: notes.length > 0 ? notes : null,
    };
  }
}

/** Quantity: a whole number from 1 to 1 000. Null when valid. */
export function quantityError(quantity: number | null): string | null {
  if (quantity === null || !Number.isInteger(quantity) || quantity < 1) {
    return 'Quantity should be 1 or more';
  }

  return quantity > MAX_QUANTITY ? `Quantity should be at most ${MAX_QUANTITY}` : null;
}

/** Price: greater than 0, at most four decimals. Null when valid. */
export function priceError(price: number | null): string | null {
  if (price === null || !(price > 0)) {
    return 'Price should be greater than 0';
  }

  if (price < MIN_PRICE) {
    return 'Price should be at least 0.01';
  }

  if (price > MAX_PRICE) {
    return 'Price should be at most 999 999 999.9999';
  }

  return Math.round(price * 10_000) / 10_000 === price ? null : 'Price can have at most 4 decimals';
}
