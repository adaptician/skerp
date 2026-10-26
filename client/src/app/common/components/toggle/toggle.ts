import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * A labelled on/off switch (Control/Toggle). The whole row — track and label — is one 44px
 * `role="switch"` button, so Space, Enter and a tap anywhere on it toggle it. Presentational: it
 * shows `checked` and emits the requested value; the owner decides.
 */
@Component({
  selector: 'a-toggle',
  templateUrl: './toggle.html',
  styleUrl: './toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toggle {
  /** Visible label, also the switch's accessible name. */
  readonly label = input.required<string>();
  /** Whether the switch is on. */
  readonly checked = input(false);
  /** Disables the switch (Control/Toggle State=Disabled). */
  readonly disabled = input(false);

  /** The value the user asked for: the opposite of `checked`. */
  readonly checkedChange = output<boolean>();

  protected toggle(): void {
    this.checkedChange.emit(!this.checked());
  }
}
