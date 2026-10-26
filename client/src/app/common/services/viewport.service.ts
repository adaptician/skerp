import { Injectable, signal } from '@angular/core';

/** The lg breakpoint (styling.md → Responsive Breakpoints), where tables replace cards. */
export const LG_MIN_WIDTH = 992;

/**
 * Whether the viewport is at least the lg breakpoint, as a signal. For layouts whose markup — not
 * only their styles — differs by breakpoint (a table versus cards), so only one is in the DOM and
 * assistive technology never reads both. Without `matchMedia` (tests) it reports wide.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly wideSignal = signal(true);

  /** True at lg (992px) and wider. */
  readonly isWide = this.wideSignal.asReadonly();

  constructor() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia(`(min-width: ${LG_MIN_WIDTH}px)`);
    this.wideSignal.set(query.matches);
    const update = () => this.wideSignal.set(query.matches);
    query.addEventListener('change', update);
    // Some environments (device emulation) resize without a media-query change event.
    window.addEventListener('resize', update, { passive: true });
  }
}
