import { TestBed } from '@angular/core/testing';

import { DemoModeStorageService } from './demo-mode-storage.service';

describe('DemoModeStorageService', () => {
  let storage: DemoModeStorageService;

  beforeEach(() => {
    localStorage.clear();
    storage = TestBed.inject(DemoModeStorageService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('should read off when nothing has been stored', () => {
    expect(storage.read()).toBe(false);
  });

  it('should read back what was written', () => {
    storage.write(true);
    expect(storage.read()).toBe(true);

    storage.write(false);
    expect(storage.read()).toBe(false);
  });

  it('should read an unexpected stored value as off', () => {
    localStorage.setItem(DemoModeStorageService.storageKey, 'yes please');

    expect(storage.read()).toBe(false);
  });

  it('should read off when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(storage.read()).toBe(false);
  });

  it('should not throw when storage refuses a write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => storage.write(true)).not.toThrow();
  });
});
