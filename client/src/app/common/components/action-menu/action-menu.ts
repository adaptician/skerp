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

import { Icon, IconName } from '../icon/icon';

/**
 * One entry in a row's actions menu. `danger` styles destructive actions (Delete); `disabled` shows an
 * action the row does not allow now, muted and inert, with `disabledReason` saying why.
 */
export interface ActionMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
}

let nextMenuId = 1;

/**
 * A row's actions (Button/Actions + Menu/Actions): a compact "Actions ▾" trigger, or a 44px kebab
 * on cards; the menu opens under the trigger, aligned to its right edge. Arrow keys move between
 * items, Escape or a click elsewhere closes it, and focus returns to the trigger. Danger items sit
 * after a divider. A disabled item stays focusable (`aria-disabled`, WAI-ARIA menu practice), so
 * keyboard and screen-reader users learn it exists and why it is unavailable; choosing it does nothing.
 */
@Component({
  selector: 'a-action-menu',
  imports: [Icon],
  templateUrl: './action-menu.html',
  styleUrl: './action-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class ActionMenu {
  /** The actions offered. */
  readonly items = input.required<readonly ActionMenuItem[]>();
  /** Accessible name of the trigger, for example "Actions for PO-2026-024". */
  readonly label = input.required<string>();
  /** "button": the compact table trigger; "kebab": the card's icon button. */
  readonly variant = input<'button' | 'kebab'>('button');

  /** The user chose an action. */
  readonly selected = output<string>();

  protected readonly open = signal(false);
  protected readonly menuId = `action-menu-${nextMenuId++}`;
  protected readonly regularItems = computed(() => this.items().filter((item) => !item.danger));
  protected readonly dangerItems = computed(() => this.items().filter((item) => item.danger));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly menuItems = viewChildren<ElementRef<HTMLButtonElement>>('menuItem');

  protected toggle(): void {
    this.open.update((open) => !open);
    if (this.open()) {
      queueMicrotask(() => this.menuItems()[0]?.nativeElement.focus());
    }
  }

  protected choose(item: ActionMenuItem): void {
    if (item.disabled) {
      return;
    }

    this.close();
    this.selected.emit(item.id);
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    const buttons = this.menuItems().map((item) => item.nativeElement);
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
      case 'Tab':
        this.open.set(false);
        break;
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  private close(): void {
    this.open.set(false);
    this.host.nativeElement.querySelector<HTMLButtonElement>('.action-menu__trigger')?.focus();
  }
}
