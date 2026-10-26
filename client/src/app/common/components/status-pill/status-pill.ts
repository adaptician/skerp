import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The purchase-order statuses the pill can show; each has its own colour pair. */
export type StatusPillStatus = 'pending' | 'confirmed' | 'fulfilled' | 'cancelled';

/**
 * A status pill (Status/Pending, Confirmed, Fulfilled, Cancelled): a dot and the status name. The
 * text always carries the meaning; colour only reinforces it.
 */
@Component({
  selector: 'a-status-pill',
  template: `<span class="status-pill__dot" aria-hidden="true"></span>{{ label() }}`,
  styleUrl: './status-pill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"status-pill status-pill--" + status()',
  },
})
export class StatusPill {
  /** Which status colour pair to use. */
  readonly status = input.required<StatusPillStatus>();
  /** The status name shown, for example "Pending". */
  readonly label = input.required<string>();
}
