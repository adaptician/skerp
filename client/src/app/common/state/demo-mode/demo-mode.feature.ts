import { createFeature, createReducer, on } from '@ngrx/store';

import { DemoModeActions } from './demo-mode.actions';

export interface DemoModeState {
  /** True while Demo Mode is on. Off until the reviewer turns it on. */
  enabled: boolean;
}

export const initialDemoModeState: DemoModeState = { enabled: false };

/**
 * The one app-wide Demo Mode state. Features read it with `selectEnabled` to relax their
 * client-side guard rails; it never changes what the server allows.
 */
export const demoModeFeature = createFeature({
  name: 'demoMode',
  reducer: createReducer(
    initialDemoModeState,
    on(DemoModeActions.restored, DemoModeActions.switched, (_, { enabled }): DemoModeState => ({
      enabled,
    })),
  ),
});

export const { selectEnabled: selectDemoModeEnabled } = demoModeFeature;
