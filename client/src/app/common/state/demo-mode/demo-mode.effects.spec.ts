import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, firstValueFrom, of } from 'rxjs';

import { DemoModeStorageService } from '../../services/demo-mode-storage.service';
import { DemoModeActions } from './demo-mode.actions';
import { persistDemoMode, restoreDemoMode } from './demo-mode.effects';

describe('Demo Mode effects', () => {
  let actions: Observable<Action>;
  const storage = { read: vi.fn<() => boolean>(), write: vi.fn<(enabled: boolean) => void>() };

  beforeEach(() => {
    storage.read.mockReset();
    storage.write.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions),
        { provide: DemoModeStorageService, useValue: storage },
      ],
    });
  });

  it('should restore the stored choice', async () => {
    storage.read.mockReturnValue(true);
    actions = of(DemoModeActions.restoreRequested());

    const result = await firstValueFrom(TestBed.runInInjectionContext(() => restoreDemoMode()));

    expect(result).toEqual(DemoModeActions.restored({ enabled: true }));
  });

  it('should remember every switch', async () => {
    actions = of(DemoModeActions.switched({ enabled: true }));

    await firstValueFrom(TestBed.runInInjectionContext(() => persistDemoMode()));

    expect(storage.write).toHaveBeenCalledWith(true);
  });
});
