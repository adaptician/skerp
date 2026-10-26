import { DemoModeActions } from './demo-mode.actions';
import { demoModeFeature, initialDemoModeState, selectDemoModeEnabled } from './demo-mode.feature';

describe('demoModeFeature', () => {
  const { reducer } = demoModeFeature;

  it('should start with Demo Mode off', () => {
    const state = reducer(undefined, { type: '@@init' });

    expect(state.enabled).toBe(false);
  });

  it('should take the restored value', () => {
    const state = reducer(initialDemoModeState, DemoModeActions.restored({ enabled: true }));

    expect(selectDemoModeEnabled.projector(state)).toBe(true);
  });

  it('should follow the latest switch', () => {
    const on = reducer(initialDemoModeState, DemoModeActions.switched({ enabled: true }));
    const off = reducer(on, DemoModeActions.switched({ enabled: false }));

    expect(on.enabled).toBe(true);
    expect(off.enabled).toBe(false);
  });
});
