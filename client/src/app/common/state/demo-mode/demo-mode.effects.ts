import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, tap } from 'rxjs';

import { DemoModeStorageService } from '../../services/demo-mode-storage.service';
import { DemoModeActions } from './demo-mode.actions';

/** Reads the stored Demo Mode choice when restore is requested. */
export const restoreDemoMode = createEffect(
  (actions = inject(Actions), storage = inject(DemoModeStorageService)) =>
    actions.pipe(
      ofType(DemoModeActions.restoreRequested),
      map(() => DemoModeActions.restored({ enabled: storage.read() })),
    ),
  { functional: true },
);

/** Remembers every switch, so the choice survives a reload. */
export const persistDemoMode = createEffect(
  (actions = inject(Actions), storage = inject(DemoModeStorageService)) =>
    actions.pipe(
      ofType(DemoModeActions.switched),
      tap(({ enabled }) => storage.write(enabled)),
    ),
  { functional: true, dispatch: false },
);
