import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** One suggestion: a stable id, the main line and an optional second line. */
export interface TypeaheadOption {
  readonly id: string;
  readonly primary: string;
  readonly secondary?: string;
}

/**
 * The suggestion list under a search field (Menu/Typeahead): a listbox of options with a primary
 * and a muted secondary line. Presentational: the field that owns it keeps `aria-controls`,
 * `aria-activedescendant` and the keyboard handling, and passes the active index in.
 */
@Component({
  selector: 'a-typeahead-menu',
  templateUrl: './typeahead-menu.html',
  styleUrl: './typeahead-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeaheadMenu {
  /** The listbox element id the field points `aria-controls` at; options get `<id>-<index>`. */
  readonly listId = input.required<string>();
  /** The suggestions to show. */
  readonly options = input.required<readonly TypeaheadOption[]>();
  /** Index of the highlighted option, or -1 for none. */
  readonly activeIndex = input(-1);
  /** Accessible name of the list, for example "Matching customers". */
  readonly label = input.required<string>();

  /** The user picked an option (click or tap). */
  readonly selected = output<TypeaheadOption>();

  /** Keeps focus in the field: a mousedown on an option must not blur it before the click lands. */
  protected keepFocus(event: MouseEvent): void {
    event.preventDefault();
  }
}
