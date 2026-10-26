import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { Icon, IconName } from '../icon/icon';

let nextConfirmId = 1;

/**
 * A destructive-action confirmation (Overlay/ConfirmModal): an icon disc, a title, a message and
 * Cancel / confirm over the scrim. From lg up, a 440px centred dialog; below it, a bottom sheet with a
 * handle and the buttons stacked, confirm first. Cancel takes focus on open (the safe choice), Tab
 * stays inside, Escape cancels, and focus returns to where it was on close. Like `a-modal`, it is not
 * a native `<dialog>`, so a failure popup stays readable above it.
 *
 * The host decides when it exists (`@if`).
 */
@Component({
  selector: 'a-confirm-modal',
  imports: [Icon],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // On the host, so Escape and Tab still work if focus drifted off the dialog onto the scrim.
  host: {
    '(keydown)': 'onKeydown($event)',
    '(mousedown)': 'keepFocus($event)',
  },
})
export class ConfirmModal {
  /** The question, also the dialog's accessible name, for example "Delete purchase order?". */
  readonly title = input.required<string>();
  /** What will happen, also the dialog's description. */
  readonly message = input.required<string>();
  /** The confirm button's label, for example "Delete". */
  readonly confirmLabel = input.required<string>();
  readonly icon = input<IconName>('trash');
  /** While true (the request is with the server), both buttons and Escape do nothing. */
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly id = `confirm-modal-${nextConfirmId++}`;

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private readonly cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancelButton');

  constructor() {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    afterNextRender(() => this.cancelButton().nativeElement.focus());

    inject(DestroyRef).onDestroy(() => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    });
  }

  protected cancel(): void {
    if (!this.busy()) {
      this.cancelled.emit();
    }
  }

  protected confirm(): void {
    if (!this.busy()) {
      // The buttons disable while the request runs; focus stays in the dialog meanwhile.
      this.dialog().nativeElement.focus();
      this.confirmed.emit();
    }
  }

  /** A click on the scrim or the dialog's padding would drop focus to the page; keep it inside. */
  protected keepFocus(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('button')) {
      event.preventDefault();
      this.dialog().nativeElement.focus();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    } else if (event.key === 'Tab') {
      const buttons = Array.from(
        this.dialog().nativeElement.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
      );
      if (buttons.length === 0) {
        // Busy: both buttons are disabled, so focus rests on the dialog itself.
        event.preventDefault();
        this.dialog().nativeElement.focus();
        return;
      }

      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }
}
