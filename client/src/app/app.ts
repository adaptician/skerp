import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';

import { Header, HeaderMenuItem } from './common/components/header/header';
import { PopupHost } from './common/components/popup-host/popup-host';
import { DemoModeActions, selectDemoModeEnabled } from './common/state/demo-mode';

/**
 * The application shell, around every route: the page backdrop, the sticky header with the Demo
 * Mode toggle, the routed screen and the popup messages. It owns the wiring between the header
 * and the app-wide Demo Mode state.
 */
@Component({
  selector: 'adapt-root',
  imports: [RouterOutlet, Header, PopupHost],
  template: `
    <a-header
      [items]="menuItems"
      [demoMode]="demoMode()"
      (demoModeChange)="switchDemoMode($event)"
    />
    <main class="shell__main">
      <router-outlet />
    </main>
    <a-popup-host />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly store = inject(Store);

  protected readonly demoMode = this.store.selectSignal(selectDemoModeEnabled);

  protected readonly menuItems: readonly HeaderMenuItem[] = [
    { label: 'Home', icon: 'home', link: '/', exact: true },
    { label: 'Purchase Orders', icon: 'orders', link: '/purchase-orders' },
  ];

  protected switchDemoMode(enabled: boolean): void {
    this.store.dispatch(DemoModeActions.switched({ enabled }));
  }
}
