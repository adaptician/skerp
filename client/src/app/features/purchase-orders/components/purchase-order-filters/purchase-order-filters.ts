import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, filter, map, of, switchMap } from 'rxjs';

import { Icon } from '../../../../common/components/icon/icon';
import { Modal } from '../../../../common/components/modal/modal';
import { STATUS } from '../../models/purchase-order';
import {
  CustomerFilter,
  PurchaseOrderListQuery,
  activeFilterCount,
  hasAnyFilter,
} from '../../models/purchase-order-list';
import { PurchaseOrdersApi } from '../../services/purchase-orders-api';
import { CustomerMultiSelect } from '../customer-multi-select/customer-multi-select';
import { DateRange, DateRangeField } from '../date-range-field/date-range-field';

/** The filter changes the list should apply (the list returns to page 1). */
export type FilterChanges = Partial<Omit<PurchaseOrderListQuery, 'page' | 'sorting'>>;

const SEARCH_DEBOUNCE_MS = 300;

export const STATUS_OPTIONS = [
  { id: STATUS.pending, label: 'Pending' },
  { id: STATUS.confirmed, label: 'Confirmed' },
  { id: STATUS.fulfilled, label: 'Fulfilled' },
  { id: STATUS.cancelled, label: 'Cancelled' },
] as const;

/**
 * Search and filters for the list. Wide (lg and up): the Filter Bar — reference search, customers,
 * status, created range and Clear filters, each applied as it changes. Narrow: a search field and a
 * Filters button (with the active count) that opens a sheet; the sheet edits a draft and applies it
 * with "Show N orders", where N comes from a count query for the draft.
 */
@Component({
  selector: 'adapt-purchase-order-filters',
  imports: [NgTemplateOutlet, Icon, Modal, CustomerMultiSelect, DateRangeField],
  templateUrl: './purchase-order-filters.html',
  styleUrl: './purchase-order-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderFilters {
  private readonly api = inject(PurchaseOrdersApi);
  private readonly destroyRef = inject(DestroyRef);

  /** The applied query. */
  readonly query = input.required<PurchaseOrderListQuery>();
  /** True for the Filter Bar; false for the search + sheet. */
  readonly wide = input(true);

  readonly changed = output<FilterChanges>();
  readonly cleared = output<void>();

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly search = signal('');
  protected readonly anyFilter = computed(() => hasAnyFilter(this.query()));
  protected readonly filterCount = computed(() => activeFilterCount(this.query()));

  // The mobile sheet's draft and its preview count.
  protected readonly sheetOpen = signal(false);
  protected readonly draft = signal<PurchaseOrderListQuery | null>(null);
  protected readonly draftCount = signal<number | null>(null);

  private readonly searches = new Subject<string>();
  private readonly draftCounts = new Subject<PurchaseOrderListQuery>();

  constructor() {
    // The field follows the applied search (for example after Clear filters).
    effect(() => {
      const applied = this.query().search;
      untracked(() => {
        if (this.search().trim() !== applied.trim()) {
          this.search.set(applied);
        }
      });
    });

    this.searches
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        // Compare with the applied search, not the last one sent: after Clear filters the same
        // text must apply again.
        filter((search) => search !== this.query().search.trim()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((search) => this.changed.emit({ search }));

    this.draftCounts
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        switchMap((draft) =>
          this.api.count(draft).pipe(
            map((page) => page.totalCount),
            catchError(() => of(null)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((count) => this.draftCount.set(count));
  }

  protected onSearch(text: string): void {
    this.search.set(text);
    this.searches.next(text.trim());
  }

  protected clearSearch(): void {
    this.onSearch('');
  }

  protected setCustomers(customers: readonly CustomerFilter[]): void {
    this.changed.emit({ customers });
  }

  protected setStatus(value: string): void {
    this.changed.emit({ statusId: value === '' ? null : Number(value) });
  }

  protected setCreated(range: DateRange): void {
    this.changed.emit({ createdFrom: range.from, createdTo: range.to });
  }

  // ── Mobile sheet ──

  protected openSheet(): void {
    this.draft.set(this.query());
    this.draftCount.set(null);
    this.draftCounts.next(this.query());
    this.sheetOpen.set(true);
  }

  protected closeSheet(): void {
    this.sheetOpen.set(false);
  }

  protected updateDraft(changes: FilterChanges): void {
    const next = { ...this.draft()!, ...changes };
    this.draft.set(next);
    this.draftCounts.next(next);
  }

  protected clearDraft(): void {
    this.updateDraft({ customers: [], statusId: null, createdFrom: null, createdTo: null });
  }

  protected applyDraft(): void {
    const draft = this.draft()!;
    this.changed.emit({
      customers: draft.customers,
      statusId: draft.statusId,
      createdFrom: draft.createdFrom,
      createdTo: draft.createdTo,
    });
    this.sheetOpen.set(false);
  }

  protected showLabel(): string {
    const count = this.draftCount();
    if (count === null) {
      return 'Show orders';
    }
    return `Show ${count} ${count === 1 ? 'order' : 'orders'}`;
  }
}
