import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon } from '../icon/icon';

/**
 * A selected value shown as a removable pill (Feedback/PillRemovable), for example the chosen
 * customer. The whole pill is the remove control.
 */
@Component({
  selector: 'a-pill-removable',
  imports: [Icon],
  template: `
    <button type="button" class="pill-removable" [disabled]="disabled()" (click)="removed.emit()">
      {{ label() }}
      <a-icon name="close" size="sm" />
      <span class="visually-hidden">{{ removeLabel() }}</span>
    </button>
  `,
  styleUrl: './pill-removable.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PillRemovable {
  /** The value shown. */
  readonly label = input.required<string>();
  /** Accessible text for the remove action, for example "Remove Alpha Studios". */
  readonly removeLabel = input.required<string>();
  /** True while the form is busy; the pill cannot be removed. */
  readonly disabled = input(false);

  /** The user removed the value. */
  readonly removed = output<void>();
}
