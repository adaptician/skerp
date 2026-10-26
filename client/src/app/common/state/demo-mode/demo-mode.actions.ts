import { createActionGroup, emptyProps, props } from '@ngrx/store';

/** Things that happen to Demo Mode, named after the event (angular.md → State Management). */
export const DemoModeActions = createActionGroup({
  source: 'Demo Mode',
  events: {
    /** The app started and needs the reviewer's last choice. */
    'Restore Requested': emptyProps(),
    /** The stored choice was read (false when nothing was stored). */
    Restored: props<{ enabled: boolean }>(),
    /** A reviewer flipped a Demo Mode toggle. */
    Switched: props<{ enabled: boolean }>(),
  },
});
