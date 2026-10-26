import { Routes } from '@angular/router';

import { featureEnabled } from './common/guards/feature-enabled.guard';
import { Features } from './common/services/feature.service';
import { providePurchaseOrdersState } from './features/purchase-orders/state';

/** Every feature is a lazy-loaded route (angular.md → Routing and Lazy Loading). */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Sharp ERP',
    loadComponent: () =>
      import('./features/welcome/pages/welcome-page/welcome-page').then((m) => m.WelcomePage),
  },
  {
    path: 'purchase-orders',
    title: 'Purchase orders · Sharp ERP',
    canMatch: [featureEnabled(Features.purchaseOrders)],
    providers: [providePurchaseOrdersState()],
    loadComponent: () =>
      import('./features/purchase-orders/pages/purchase-orders-page/purchase-orders-page').then(
        (m) => m.PurchaseOrdersPage,
      ),
  },
  {
    // Shown while the Feature_PurchaseOrders release toggle is off.
    path: 'purchase-orders',
    title: 'Purchase orders · Sharp ERP',
    loadComponent: () =>
      import('./features/purchase-orders/pages/purchase-orders-placeholder-page/purchase-orders-placeholder-page').then(
        (m) => m.PurchaseOrdersPlaceholderPage,
      ),
  },
  { path: '**', redirectTo: '' },
];
