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

import { Icon } from '../icon/icon';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The form modal shell (Overlay/Modal): a header with the title and a close button, a scrolling
 * body, and a footer for the actions, over the scrim. Desktop: an 800px centred dialog at most 90vh
 * tall; below the lg breakpoint, a full-screen sheet. Focus moves in on open, Tab stays inside, and
 * Escape or the close button ask the host to close; focus returns to where it was on close.
 *
 * Deliberately not a native modal `<dialog>`: that would make the popup messages inert, and a Save
 * failure must stay readable and dismissible above the modal (popup host z-index).
 *
 * Project the body as default content and the actions with the `modalFooter` attribute. The host
 * decides when the modal exists (`@if`).
 */
@Component({
  selector: 'a-modal',
  imports: [Icon],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  /** The dialog's heading, also its accessible name. */
  readonly title = input.required<string>();
  /** Accessible name of the close button. */
  readonly closeLabel = input('Close');
  /** "dialog": the form modal; "sheet": a bottom sheet with a handle (Overlay/Sheet, mobile filters). */
  readonly variant = input<'dialog' | 'sheet'>('dialog');
  /** While true, Escape and the close button do nothing (for example while saving). */
  readonly busy = input(false);

  /** The user asked to close the modal (close button or Escape). */
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');

  constructor() {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    afterNextRender(() => {
      const first = this.dialog().nativeElement.querySelector<HTMLElement>(
        '.modal__body ' + FOCUSABLE.split(', ').join(', .modal__body '),
      );
      (first ?? this.dialog().nativeElement).focus();
    });

    inject(DestroyRef).onDestroy(() => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    });
  }

  protected requestClose(): void {
    if (!this.busy()) {
      this.closed.emit();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      this.requestClose();
      return;
    }

    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  /** Keeps Tab and Shift+Tab cycling inside the dialog. */
  private trapFocus(event: KeyboardEvent): void {
    const focusable = Array.from(
      this.dialog().nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
