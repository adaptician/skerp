import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon } from '../../../../common/components/icon/icon';
import { MonitorConnectionState } from '../../models/purchase-order-monitor';

/**
 * Monitor Mode's connection health: Connecting…, Live, or Disconnected with a prompt to refresh.
 * Shaped like a status pill so it sits with the screen's other chips. Presentational: the page
 * decides what Refresh does.
 */
@Component({
  selector: 'adapt-monitor-health',
  imports: [Icon],
  templateUrl: './monitor-health.html',
  styleUrl: './monitor-health.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitorHealth {
  /** The live connection's state. */
  readonly connection = input.required<MonitorConnectionState>();

  /** The user asked to refresh the page to reconnect. */
  readonly refresh = output<void>();
}
