import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { Icon } from '../../../../common/components/icon/icon';

/** A created-date range in the user's calendar dates (`yyyy-mm-dd`); either end may be open. */
export interface DateRange {
  readonly from: string | null;
  readonly to: string | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-22" → "22 Oct 2026" (Field/DateRange display format). */
export function formatDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

let nextId = 1;

/**
 * The created-date filter (Field/DateRange): "Any date" until set, then "D Mon YYYY – D Mon YYYY".
 * The panel has From and To date inputs; a start after the end is flagged and cannot be applied.
 * `inline` shows the inputs in the page flow (the mobile filter sheet).
 */
@Component({
  selector: 'adapt-date-range-field',
  imports: [Icon, NgTemplateOutlet],
  templateUrl: './date-range-field.html',
  styleUrl: './date-range-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class DateRangeField {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The applied range. */
  readonly value = input<DateRange>({ from: null, to: null });
  /** True inside the mobile sheet. */
  readonly inline = input(false);

  /** A valid range the user applied (or cleared). */
  readonly valueChange = output<DateRange>();

  protected readonly id = `created-range-${nextId++}`;
  protected readonly open = signal(false);
  // Undefined until the user touches an input; then the typed value (null when emptied).
  private readonly touchedFrom = signal<string | null | undefined>(undefined);
  private readonly touchedTo = signal<string | null | undefined>(undefined);
  protected readonly draftFrom = computed(() =>
    this.touchedFrom() === undefined ? this.value().from : (this.touchedFrom() ?? null),
  );
  protected readonly draftTo = computed(() =>
    this.touchedTo() === undefined ? this.value().to : (this.touchedTo() ?? null),
  );
  protected readonly invalid = computed(() => {
    const from = this.draftFrom();
    const to = this.draftTo();
    return from !== null && to !== null && from > to;
  });

  protected readonly display = computed(() => {
    const { from, to } = this.value();
    if (from && to) {
      return `${formatDay(from)} – ${formatDay(to)}`;
    }
    if (from) {
      return `From ${formatDay(from)}`;
    }
    return to ? `Until ${formatDay(to)}` : null;
  });

  constructor() {
    // A new applied value (from outside, or just applied) replaces anything typed.
    effect(() => {
      this.value();
      untracked(() => {
        this.touchedFrom.set(undefined);
        this.touchedTo.set(undefined);
      });
    });
  }

  protected toggleOpen(): void {
    if (!this.open()) {
      this.touchedFrom.set(undefined);
      this.touchedTo.set(undefined);
    }
    this.open.update((open) => !open);
  }

  protected setFrom(value: string): void {
    this.touchedFrom.set(value || null);
    this.applyInline();
  }

  protected setTo(value: string): void {
    this.touchedTo.set(value || null);
    this.applyInline();
  }

  protected apply(): void {
    if (this.invalid()) {
      return;
    }
    this.valueChange.emit({ from: this.draftFrom(), to: this.draftTo() });
    this.open.set(false);
  }

  protected clear(): void {
    this.touchedFrom.set(null);
    this.touchedTo.set(null);
    this.valueChange.emit({ from: null, to: null });
    this.open.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open() && !this.inline()) {
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

  /** In the sheet the dates apply as they change (the sheet's own button commits the filters). */
  private applyInline(): void {
    if (this.inline() && !this.invalid()) {
      this.valueChange.emit({ from: this.draftFrom(), to: this.draftTo() });
    }
  }
}
