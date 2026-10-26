import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Card } from '../../../../common/components/card/card';

/**
 * Stand-in for the purchase order list until AB#1466 builds it, so the Purchase Orders menu item
 * has somewhere to go (Feature plan AB#1432).
 */
@Component({
  selector: 'adapt-purchase-orders-placeholder-page',
  imports: [Card, RouterLink],
  template: `
    <div class="page-column">
      <a-card eyebrow="Purchase orders" title="Coming soon">
        <p>
          The purchase order list is on its way. Soon you will search, filter and manage every order
          from here.
        </p>
        <a class="button button--secondary button--md" routerLink="/">Back to home</a>
      </a-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrdersPlaceholderPage {}
