import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';

import { Icon } from '../../../../common/components/icon/icon';
import { Pill } from '../../../../common/components/pill/pill';
import { PillRemovable } from '../../../../common/components/pill-removable/pill-removable';
import { CustomerFilter, MAX_CUSTOMER_FILTERS } from '../../models/purchase-order-list';
import { PurchaseOrdersApi } from '../../services/purchase-orders-api';

const SEARCH_DEBOUNCE_MS = 250;

let nextId = 1;

/**
 * The customer filter (Field/MultiSelect with Menu/SelectPanel): selected customers as a removable
 * pill and a "+N more" pill; the panel searches customers by name and lists them with checkboxes,
 * at most ten selected. With an empty search the panel lists the selected customers, so they can be
 * unticked. `inline` renders the panel in the page flow (the mobile filter sheet).
 */
@Component({
  selector: 'adapt-customer-multi-select',
  imports: [Icon, Pill, PillRemovable],
  templateUrl: './customer-multi-select.html',
  styleUrl: './customer-multi-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class CustomerMultiSelect {
  private readonly api = inject(PurchaseOrdersApi);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The customers currently chosen. */
  readonly selected = input<readonly CustomerFilter[]>([]);
  /** True inside the mobile sheet: the panel opens in the flow and the helper is shown. */
  readonly inline = input(false);

  /** The new selection after a tick, an untick or a pill removal. */
  readonly selectedChange = output<readonly CustomerFilter[]>();

  protected readonly max = MAX_CUSTOMER_FILTERS;
  protected readonly id = `customer-filter-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly search = signal('');
  protected readonly results = signal<readonly CustomerFilter[]>([]);
  protected readonly searching = signal(false);
  protected readonly atLimit = computed(() => this.selected().length >= MAX_CUSTOMER_FILTERS);
  /** What the panel lists: search results, or the selection when nothing is typed. */
  protected readonly options = computed(() =>
    this.search().trim().length > 0 ? this.results() : this.selected(),
  );

  private readonly searches = new Subject<string>();

  constructor() {
    this.searches
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        switchMap((text) =>
          text.length === 0
            ? of([] as readonly CustomerFilter[])
            : this.api.lookupCustomers(text).pipe(
                map((response) => response.data.map(({ id, name }) => ({ id, name }))),
                catchError(() => of([] as readonly CustomerFilter[])),
              ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((results) => {
        this.results.set(results);
        this.searching.set(false);
      });
  }

  protected isSelected(id: string): boolean {
    return this.selected().some((customer) => customer.id === id);
  }

  protected toggleOpen(): void {
    this.open.update((open) => !open);
  }

  protected onSearch(text: string): void {
    this.search.set(text);
    this.searching.set(text.trim().length > 0);
    this.searches.next(text.trim());
  }

  protected clearSearch(): void {
    this.onSearch('');
  }

  protected toggle(customer: CustomerFilter): void {
    if (this.isSelected(customer.id)) {
      this.remove(customer.id);
    } else if (!this.atLimit()) {
      this.selectedChange.emit([...this.selected(), customer]);
    }
  }

  protected remove(id: string): void {
    this.selectedChange.emit(this.selected().filter((customer) => customer.id !== id));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      event.stopPropagation();
      this.open.set(false);
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.inline() && this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
