import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A content card (Card/Default): an optional eyebrow, a title, and projected body content.
 * Surface fill, border, large radius and card elevation keep it readable over the page backdrop.
 */
@Component({
  selector: 'a-card',
  templateUrl: './card.html',
  styleUrl: './card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  /** Short overline above the title, for example "For reviewers". */
  readonly eyebrow = input<string | null>(null);
  /** The card's heading (an h2). */
  readonly title = input.required<string>();
}
