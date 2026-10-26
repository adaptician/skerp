import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { BrandLockup } from '../brand-lockup/brand-lockup';
import { Icon, IconName } from '../icon/icon';
import { Toggle } from '../toggle/toggle';

/** One menu entry: its label, icon and router link. */
export interface HeaderMenuItem {
  readonly label: string;
  readonly icon: IconName;
  readonly link: string;
  /** Match the link exactly when deciding the active item (true for the root route). */
  readonly exact?: boolean;
}

/**
 * The application header (Navigation/Header): the lock-up linking home, the menu with the active
 * route marked, and the Demo Mode toggle. Below md the menu collapses behind a menu button into a
 * panel over a scrim; the toggle stays in the bar. Sticky at the top of the viewport.
 *
 * Presentational for Demo Mode: it shows `demoMode` and emits `demoModeChange`; the shell owns
 * the state.
 */
@Component({
  selector: 'a-header',
  imports: [RouterLink, RouterLinkActive, BrandLockup, Icon, Toggle],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeMenu(true)',
  },
})
export class Header {
  /** The menu entries, in order. */
  readonly items = input.required<readonly HeaderMenuItem[]>();
  /** Whether Demo Mode is on. */
  readonly demoMode = input(false);
  /** The Demo Mode value the user asked for. */
  readonly demoModeChange = output<boolean>();

  /** True while the mobile menu panel is open. */
  protected readonly menuOpen = signal(false);

  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /** Closes the panel; returns focus to the menu button when the user dismissed it (Escape, ×, scrim). */
  protected closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) {
      return;
    }

    this.menuOpen.set(false);
    if (restoreFocus) {
      this.menuButton()?.nativeElement.focus();
    }
  }
}
