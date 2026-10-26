import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import * as purchaseOrdersEffects from './purchase-orders.effects';
import { purchaseOrdersFeature } from './purchase-orders.feature';

export { PurchaseOrdersActions } from './purchase-orders.actions';
export {
  purchaseOrdersFeature,
  selectExpanded,
  selectFailed,
  selectHasFilters,
  selectItems,
  selectLineItems,
  selectLoading,
  selectMonitor,
  selectQuery,
  selectRowChanges,
  selectStatusChanging,
  selectTotalCount,
} from './purchase-orders.feature';
export type { MonitorState, PurchaseOrdersState } from './purchase-orders.feature';

/** Registers the Purchase Orders slice and its effects on the feature's lazy route. */
export function providePurchaseOrdersState(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideState(purchaseOrdersFeature),
    provideEffects(purchaseOrdersEffects),
  ]);
}
