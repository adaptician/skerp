import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NotificationService } from '../../services/notification.service';
import { Popup } from '../popup/popup';

/**
 * Places the application's popup messages: top-right, 24px below the header, on desktop; full
 * width above the bottom edge on mobile (Feedback/ErrorPopup usage note). Rendered once, in the
 * root layout.
 */
@Component({
  selector: 'a-popup-host',
  imports: [Popup],
  templateUrl: './popup-host.html',
  styleUrl: './popup-host.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupHost {
  protected readonly notifications = inject(NotificationService);
}
