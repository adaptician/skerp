import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { Icon } from '../icon/icon';

const TOOLTIP_WIDTH = 304;
const VIEWPORT_GUTTER = 16;
const ARROW_HALF_WIDTH = 8;

let nextTipId = 1;

/**
 * An info icon with a tooltip (Icon/Info + Overlay/Tooltip): the tooltip shows on hover and on
 * keyboard focus, and Escape hides it. It is positioned against the viewport, under the icon with
 * its arrow pointing up at it, and shifted to stay on screen on narrow viewports.
 */
@Component({
  selector: 'a-info-tip',
  imports: [Icon],
  templateUrl: './info-tip.html',
  styleUrl: './info-tip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusin)': 'show()',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'onEscape($event)',
    '(window:scroll)': 'hide()',
  },
})
export class InfoTip {
  /** The tooltip text. */
  readonly text = input.required<string>();
  /** Accessible name of the icon button, for example "About the Fulfilled option". */
  readonly label = input.required<string>();

  protected readonly tipId = `info-tip-${nextTipId++}`;
  protected readonly visible = signal(false);
  protected readonly position = signal({ top: 0, left: 0, width: TOOLTIP_WIDTH, arrowLeft: 0 });

  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');

  protected show(): void {
    const icon = this.button().nativeElement.getBoundingClientRect();
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - 2 * VIEWPORT_GUTTER);
    const centre = icon.left + icon.width / 2;
    const left = Math.max(
      VIEWPORT_GUTTER,
      Math.min(centre - 2 * ARROW_HALF_WIDTH, window.innerWidth - width - VIEWPORT_GUTTER),
    );
    this.position.set({
      top: icon.bottom + 4,
      left,
      width,
      arrowLeft: centre - left - ARROW_HALF_WIDTH,
    });
    this.visible.set(true);
  }

  protected hide(): void {
    this.visible.set(false);
  }

  protected onEscape(event: Event): void {
    if (this.visible()) {
      // Only the tooltip closes; the menu around it stays open.
      event.stopPropagation();
      this.hide();
    }
  }
}
