import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Icon } from '../icon/icon';

/**
 * A Demo Mode explanation (Feedback/DemoNote): an info-tinted note with a flask eyebrow. Shown only
 * while Demo Mode is on, beside the control whose guard rail Demo Mode relaxed. Project the text.
 */
@Component({
  selector: 'a-demo-note',
  imports: [Icon],
  template: `
    <p class="demo-note__eyebrow"><a-icon name="flask" size="sm" />Demo note</p>
    <p class="demo-note__text"><ng-content /></p>
  `,
  styleUrl: './demo-note.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'note' },
})
export class DemoNote {}
