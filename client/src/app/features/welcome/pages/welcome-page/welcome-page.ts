import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';

import { environment } from '../../../../../environments/environment';
import { Avatar } from '../../../../common/components/avatar/avatar';
import { Card } from '../../../../common/components/card/card';
import { Icon } from '../../../../common/components/icon/icon';
import { Toggle } from '../../../../common/components/toggle/toggle';
import { DemoModeActions, selectDemoModeEnabled } from '../../../../common/state/demo-mode';

/**
 * The default route (Sales / Welcome / Default): three stacked cards — what Sharp ERP is, how
 * Demo Mode works (with a live toggle bound to the app-wide state), and the developer's thank-you.
 */
@Component({
  selector: 'adapt-welcome-page',
  imports: [RouterLink, Avatar, Card, Icon, Toggle],
  templateUrl: './welcome-page.html',
  styleUrl: './welcome-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomePage {
  private readonly store = inject(Store);

  protected readonly demoMode = this.store.selectSignal(selectDemoModeEnabled);
  protected readonly developer = environment.developer;

  protected readonly demoModePoints = [
    'Turn it on with the Demo Mode toggle at the top of every page. It stays on until you turn it off.',
    'Status dropdowns list every status, with an info icon that explains why, so you can try a change the server will reject.',
    'Save stays enabled when a reference number already exists, so you can watch the server refuse the duplicate.',
    'Notes marked "Demo note" explain each behaviour. Everything else works exactly as it does normally.',
  ];

  protected switchDemoMode(enabled: boolean): void {
    this.store.dispatch(DemoModeActions.switched({ enabled }));
  }
}
