import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { Store, provideState } from '@ngrx/store';

import { DemoModeActions } from './demo-mode.actions';
import * as demoModeEffects from './demo-mode.effects';
import { demoModeFeature } from './demo-mode.feature';

/**
 * Registers the app-wide Demo Mode state: the feature slice, its effects, and the restore of the
 * stored choice before the first render, so a reload never flashes the wrong state. Requires
 * `provideStore()` to be registered first.
 */
export function provideDemoMode(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideState(demoModeFeature),
    provideEffects(demoModeEffects),
    provideAppInitializer(() => inject(Store).dispatch(DemoModeActions.restoreRequested())),
  ]);
}
