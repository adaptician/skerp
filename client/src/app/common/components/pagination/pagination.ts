import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from '../icon/icon';

/** A page number, or a gap in the sequence. */
type PageSlot = number | 'gap';

/**
 * Pagination below a list (Navigation/Pagination). Wide: "Showing x–y of z", previous/next and page
 * numbers with an ellipsis. Compact: previous/next at 44px around "Page n of m". Previous is
 * disabled on the first page and Next on the last.
 */
@Component({
  selector: 'a-pagination',
  imports: [Icon],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  /** The current page, 1-based. */
  readonly page = input.required<number>();
  /** Items per page. */
  readonly pageSize = input.required<number>();
  /** Items across all pages. */
  readonly totalCount = input.required<number>();
  /** Plural noun for the summary, for example "purchase orders". */
  readonly noun = input('items');
  /** True for the compact (mobile) layout. */
  readonly compact = input(false);

  /** The user asked for another page. */
  readonly pageChange = output<number>();

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / this.pageSize())),
  );
  protected readonly first = computed(() =>
    this.totalCount() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );
  protected readonly last = computed(() =>
    Math.min(this.page() * this.pageSize(), this.totalCount()),
  );

  /** First, last, the current page and its neighbours; gaps elsewhere. */
  protected readonly slots = computed<PageSlot[]>(() => {
    const count = this.pageCount();
    const current = this.page();
    const pages = new Set(
      [1, count, current - 1, current, current + 1].filter((p) => p >= 1 && p <= count),
    );
    if (current <= 3) {
      [2, 3].filter((p) => p <= count).forEach((p) => pages.add(p));
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const slots: PageSlot[] = [];
    sorted.forEach((p, index) => {
      if (index > 0 && p - sorted[index - 1] > 1) {
        slots.push('gap');
      }
      slots.push(p);
    });
    return slots;
  });

  protected go(page: number): void {
    if (page >= 1 && page <= this.pageCount() && page !== this.page()) {
      this.pageChange.emit(page);
    }
  }
}
