import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  AnimationCallbackEvent,
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  input,
  output,
} from '@angular/core';

import { ActionMenu, ActionMenuItem } from '../../../../common/components/action-menu/action-menu';
import { Icon } from '../../../../common/components/icon/icon';
import { Pill } from '../../../../common/components/pill/pill';
import { StatusPill } from '../../../../common/components/status-pill/status-pill';
import { MoneyPipe } from '../../../../common/pipes/money.pipe';
import { currencySymbol, statusPill } from '../../models/purchase-order';
import {
  CreatedSort,
  LineItemsState,
  PurchaseOrderListItem,
} from '../../models/purchase-order-list';
import { NO_ROW_CHANGES, RowChanges, RowHighlightKind } from '../../models/purchase-order-monitor';
import { LineItemsPanel } from '../line-items-panel/line-items-panel';

/** A row action the user chose. */
export interface RowAction {
  readonly action: string;
  readonly order: PurchaseOrderListItem;
}

/** Skeleton rows shown while a page loads (Purchase Orders / Loading). */
const SKELETON_ROWS = 8;

/** What a `statusTemplate` receives for each row. */
export interface StatusTemplateContext {
  readonly $implicit: PurchaseOrderListItem;
  readonly size: 'sm' | 'lg';
}

/**
 * The purchase-order list (Table/Row, Table/HeaderRow): a table from lg up, cards below it. Shows
 * the loading skeleton, the empty placeholder and a retry state. Presentational: the page owns the
 * data and decides what each action does.
 */
@Component({
  selector: 'adapt-purchase-order-list',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    MoneyPipe,
    Icon,
    Pill,
    StatusPill,
    ActionMenu,
    LineItemsPanel,
  ],
  templateUrl: './purchase-order-list.html',
  styleUrl: './purchase-order-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderList {
  /** The page of orders to show. */
  readonly items = input.required<readonly PurchaseOrderListItem[]>();
  /** Ids of the expanded rows. */
  readonly expanded = input<readonly string[]>([]);
  /** Line items of expanded rows, by order id. */
  readonly lineItems = input<Readonly<Record<string, LineItemsState>>>({});
  readonly loading = input(false);
  readonly failed = input(false);
  /** The current sort, shown on the Created header. */
  readonly sorting = input<CreatedSort>('createdAt desc');
  /** True when a search or filter is set; changes the empty placeholder's message. */
  readonly hasFilters = input(false);
  /** True for the table (lg and up); false for cards. */
  readonly wide = input(true);
  /**
   * Renders a row's status; the context's `$implicit` is the order and `size` is `sm` in the table
   * and `lg` on cards. Without it, a status pill.
   */
  readonly statusTemplate = input<TemplateRef<StatusTemplateContext> | null>(null);
  /**
   * Monitor Mode: rows cannot be expanded and offer no actions (no expand column, no Actions
   * column, no card kebab or line-items toggle). The status template still renders.
   */
  readonly monitor = input(false);
  /**
   * What the last Monitor Mode refresh changed: arriving rows expand in, leaving rows shrink out,
   * and changed rows are outlined (and tinted for a status) while the page holds the highlight.
   */
  readonly rowChanges = input<RowChanges>(NO_ROW_CHANGES);
  /** The actions each row offers. */
  readonly rowActions = input<(order: PurchaseOrderListItem) => readonly ActionMenuItem[]>(
    () => [],
  );

  readonly toggleRow = output<string>();
  readonly loadMoreLines = output<{ id: string; skip: number }>();
  readonly toggleSort = output<void>();
  readonly action = output<RowAction>();
  readonly retry = output<void>();
  readonly clearFilters = output<void>();

  protected readonly skeletonRows = Array.from({ length: SKELETON_ROWS }, (_, i) => i);
  protected readonly symbol = (order: PurchaseOrderListItem) => currencySymbol(order.currency);
  protected readonly pill = (order: PurchaseOrderListItem) => statusPill(order.status.id);

  protected highlightOf(id: string): RowHighlightKind | null {
    return this.rowChanges().highlights[id] ?? null;
  }

  /** The new status's background, shown behind a row whose status just changed. */
  protected tint(order: PurchaseOrderListItem): string | null {
    return this.highlightOf(order.id) === 'statusChanged'
      ? `var(--color-status-${this.pill(order)}-background)`
      : null;
  }

  protected rowEntered(event: AnimationCallbackEvent, id: string): void {
    runRowAnimation(event, this.rowChanges().entering.includes(id) ? 'po-row--entering' : null);
  }

  protected rowLeft(event: AnimationCallbackEvent, id: string): void {
    runRowAnimation(event, this.rowChanges().leaving.includes(id) ? 'po-row--leaving' : null);
  }

  protected isExpanded(id: string): boolean {
    return this.expanded().includes(id);
  }

  protected lineCountLabel(order: PurchaseOrderListItem): string {
    return `${order.lineItemCount} line ${order.lineItemCount === 1 ? 'item' : 'items'}`;
  }
}

/**
 * Plays a row's enter or leave animation (a CSS animation on the row or its cells) and tells Angular
 * when it ends, so a leaving row stays in place until it has shrunk away. Rows that did not arrive or
 * leave through a Monitor Mode refresh, and reduced motion, finish at once.
 */
function runRowAnimation(event: AnimationCallbackEvent, className: string | null): void {
  const row = event.target as HTMLElement;
  if (className === null) {
    event.animationComplete();
    return;
  }

  row.classList.add(className);
  const animated = row.querySelector<HTMLElement>('.po-table__cell') ?? row;
  const name = getComputedStyle(animated).animationName;
  if (!name || name === 'none') {
    row.classList.remove(className);
    event.animationComplete();
    return;
  }

  // A page in a background tab may not run the animation until it is shown again; the timeout makes
  // sure the row still settles (and a leaving row still goes).
  let done = false;
  const finish = () => {
    if (!done) {
      done = true;
      row.classList.remove(className);
      event.animationComplete();
    }
  };
  row.addEventListener('animationend', finish, { once: true });
  setTimeout(finish, ROW_ANIMATION_TIMEOUT_MS);
}

/** Longer than the 300 ms row animation, so the timeout only settles a row whose animation never ran. */
const ROW_ANIMATION_TIMEOUT_MS = 1000;
