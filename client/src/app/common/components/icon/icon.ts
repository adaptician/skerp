import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** The icon set exported from the Figma Icons page (`Icon/<Name>`), stored in public/icons. */
export type IconName =
  | 'calendar'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'close'
  | 'edit'
  | 'error'
  | 'external-link'
  | 'filter'
  | 'flask'
  | 'globe'
  | 'home'
  | 'info'
  | 'linkedin'
  | 'loader'
  | 'lock'
  | 'menu'
  | 'minus'
  | 'more-vertical'
  | 'orders'
  | 'package'
  | 'plus'
  | 'search'
  | 'search-x'
  | 'sort-asc'
  | 'sort-desc'
  | 'sort-none'
  | 'stop-sign'
  | 'success'
  | 'trash'
  | 'user'
  | 'view'
  | 'warning';

/** Icon sizes: size/icon-sm (16), size/icon-md (20) and size/icon-lg (24). */
export type IconSize = 'sm' | 'md' | 'lg';

/**
 * Renders a design-system icon in the current text colour, so the host decides its colour
 * (the Figma icons bind one default colour and hosts override it). Decorative by default; pass
 * `label` when the icon alone carries meaning.
 */
@Component({
  selector: 'a-icon',
  template: '',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"icon icon--" + size()',
    '[style.--icon-url]': 'url()',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label()',
    '[attr.aria-hidden]': 'label() ? null : "true"',
  },
})
export class Icon {
  /** Which icon to draw. */
  readonly name = input.required<IconName>();
  /** Rendered size; defaults to md (20px). */
  readonly size = input<IconSize>('md');
  /** Accessible name. Omit for decorative icons beside visible text. */
  readonly label = input<string | null>(null);

  protected readonly url = computed(() => `url('/icons/${this.name()}.svg')`);
}
