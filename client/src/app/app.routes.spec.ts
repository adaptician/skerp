import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideStore } from '@ngrx/store';
import { of } from 'rxjs';

import { routes } from './app.routes';
import { FeatureService } from './common/services/feature.service';
import { provideDemoMode } from './common/state/demo-mode';
import { PurchaseOrdersPage } from './features/purchase-orders/pages/purchase-orders-page/purchase-orders-page';
import { PurchaseOrdersPlaceholderPage } from './features/purchase-orders/pages/purchase-orders-placeholder-page/purchase-orders-placeholder-page';

describe('purchase-orders route', () => {
  async function navigate(enabled: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideStore(),
        provideDemoMode(),
        { provide: FeatureService, useValue: { isEnabled: () => of(enabled) } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    return harness.navigateByUrl('/purchase-orders');
  }

  it('should show the purchase orders screen while Feature_PurchaseOrders is on', async () => {
    expect(await navigate(true)).toBeInstanceOf(PurchaseOrdersPage);
  });

  it('should fall back to the placeholder while the toggle is off', async () => {
    expect(await navigate(false)).toBeInstanceOf(PurchaseOrdersPlaceholderPage);
  });
});
