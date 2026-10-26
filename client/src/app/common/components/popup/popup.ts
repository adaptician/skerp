import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { NotificationKind } from '../../services/notification.service';
import { Icon, IconName } from '../icon/icon';

const kindIcons: Record<NotificationKind, IconName> = {
  error: 'error',
  info: 'info',
  success: 'success',
};

/**
 * A non-blocking popup message: Feedback/ErrorPopup, Feedback/InfoPopup and Feedback/SuccessPopup
 * as one component with a `kind` input. Presentational: it renders its inputs and emits
 * `dismissed` when the × is pressed. Errors are announced assertively (`role="alert"`).
 */
@Component({
  selector: 'a-popup',
  imports: [Icon],
  templateUrl: './popup.html',
  styleUrl: './popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"popup popup--" + kind()',
    '[attr.role]': 'kind() === "error" ? "alert" : "status"',
  },
})
export class Popup {
  /** Which message type to show; sets the accent colour, icon and live-region politeness. */
  readonly kind = input<NotificationKind>('error');
  /** Short heading naming what happened. */
  readonly title = input.required<string>();
  /** Detail, usually the server's description. */
  readonly description = input.required<string>();
  /** Whether the × dismiss button is shown. */
  readonly dismissible = input(true);

  /** Emitted when the user presses the dismiss button. */
  readonly dismissed = output<void>();

  protected readonly icon = computed(() => kindIcons[this.kind()]);
}
