import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';

import { Icon } from '../../../../common/components/icon/icon';
import { InfoTip } from '../../../../common/components/info-tip/info-tip';
import { StatusPill } from '../../../../common/components/status-pill/status-pill';
import { NamedValue, STATUS_OPTIONS, statusPill } from '../../models/purchase-order';
import { PurchaseOrderListItem } from '../../models/purchase-order-list';

/** The brief's Demo Mode note, shown in each option's tooltip. */
export const DEMO_STATUS_NOTE =
  "To improve a user's experience, statuses are proactively removed from status dropdowns until " +
  'only valid options remain. This helps users learn and understand how the system works. ' +
  'However, all options have been included during demo mode to demonstrate that the backend does ' +
  'not rely on client-side exclusions to enforce state integrity.';

let nextPanelId = 1;

/**
 * A row's status (Field/StatusSelect + Menu/SelectPanel). With Demo Mode off it offers only the
 * statuses the server allows next (`allowedStatusIds`), and an order with none (Fulfilled or
 * Cancelled) shows a plain pill. With Demo Mode on it offers all four, the current one ticked, each
 * with an info tooltip, so a reviewer can see the server refuse an invalid change.
 * `sm` is the 32px table control; `lg` the 44px card control.
 */
@Component({
  selector: 'adapt-status-control',
  imports: [Icon, InfoTip, StatusPill],
  templateUrl: './status-control.html',
  styleUrl: './status-control.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class StatusControl {
  readonly order = input.required<PurchaseOrderListItem>();
  readonly demoMode = input(false);
  readonly size = input<'sm' | 'lg'>('sm');
  /** True while a change for this order is with the server. */
  readonly busy = input(false);

  /** The status the user picked. */
  readonly statusSelected = output<number>();

  protected readonly note = DEMO_STATUS_NOTE;
  protected readonly panelId = `status-panel-${nextPanelId++}`;
  protected readonly open = signal(false);
  protected readonly pill = computed(() => statusPill(this.order().status.id));
  protected readonly options = computed<readonly NamedValue[]>(() =>
    this.demoMode()
      ? STATUS_OPTIONS
      : STATUS_OPTIONS.filter((status) => this.order().allowedStatusIds.includes(status.id)),
  );

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly optionButtons = viewChildren<ElementRef<HTMLButtonElement>>('option');

  protected isCurrent(status: NamedValue): boolean {
    return status.id === this.order().status.id;
  }

  protected toggle(): void {
    this.open.update((open) => !open);
    if (this.open()) {
      queueMicrotask(() => this.optionButtons()[0]?.nativeElement.focus());
    }
  }

  protected choose(status: NamedValue): void {
    this.close();
    this.statusSelected.emit(status.id);
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    const buttons = this.optionButtons().map((option) => option.nativeElement);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        buttons[(index + 1) % buttons.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close();
        break;
    }
  }

  protected onPanelFocusout(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && !this.host.nativeElement.contains(next)) {
      this.open.set(false);
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  private close(): void {
    this.open.set(false);
    this.host.nativeElement.querySelector<HTMLButtonElement>('.status-control__trigger')?.focus();
  }
}
