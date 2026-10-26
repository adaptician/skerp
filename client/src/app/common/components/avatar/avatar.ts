import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Icon } from '../icon/icon';

/**
 * A 96px circular profile picture (Media/Avatar). Without `src` it shows the placeholder user icon.
 */
@Component({
  selector: 'a-avatar',
  imports: [Icon],
  template: `
    @if (src(); as source) {
      <img class="avatar__photo" [src]="source" [alt]="alt()" width="96" height="96" />
    } @else {
      <a-icon class="avatar__placeholder" name="user" [label]="alt()" />
    }
  `,
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  /** Photo URL; null shows the placeholder. */
  readonly src = input<string | null>(null);
  /** Alternative text naming the person. */
  readonly alt = input.required<string>();
}
