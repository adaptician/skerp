import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A neutral tag pill (Feedback/Pill): purchase-order references, the "+N more" overflow of a
 * multi-select. Not interactive; project the text.
 */
@Component({
  selector: 'a-pill',
  template: '<ng-content />',
  styles: `
    @use 'typography' as *;

    :host {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      padding: var(--spacing-1) var(--spacing-2);
      border-radius: var(--border-radius-pill);
      background: var(--color-surface-hover);
      color: var(--color-text);
      white-space: nowrap;
      @include caption-strong;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pill {}
