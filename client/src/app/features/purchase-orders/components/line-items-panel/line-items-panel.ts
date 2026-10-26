import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from '../../../../common/components/icon/icon';
import { MoneyPipe } from '../../../../common/pipes/money.pipe';
import { LineItemsState } from '../../models/purchase-order-list';

/**
 * An expanded order's line items (Table/LineItems): a sub-table on wide screens, two-line rows on
 * cards. Lines load lazily; "Load more line items" asks for the next page and disappears once
 * everything is loaded. Every amount is the server's.
 */
@Component({
  selector: 'adapt-line-items-panel',
  imports: [Icon, MoneyPipe],
  templateUrl: './line-items-panel.html',
  styleUrl: './line-items-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.line-items-panel--card]': 'layout() === "card"' },
})
export class LineItemsPanel {
  /** The loaded lines and their state; undefined until the first request. */
  readonly state = input<LineItemsState | undefined>();
  /** The order's currency symbol. */
  readonly symbol = input.required<string>();
  /** "table" under a desktop row; "card" inside a mobile card. */
  readonly layout = input<'table' | 'card'>('table');
  /** Accessible name of the region, for example "Line items of PO-2026-024". */
  readonly label = input.required<string>();

  /** The user asked for the next page; carries how many lines are already loaded. */
  readonly loadMore = output<number>();

  protected readonly loaded = computed(() => this.state()?.items.length ?? 0);
  protected readonly hasMore = computed(() => this.loaded() < (this.state()?.totalCount ?? 0));
}
