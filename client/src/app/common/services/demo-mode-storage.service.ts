import { Injectable } from '@angular/core';

/**
 * Remembers the reviewer's Demo Mode choice in local storage. Reading never throws: a missing,
 * unreadable or unexpected value means off, so a first visit (or blocked storage) starts with
 * Demo Mode off.
 */
@Injectable({ providedIn: 'root' })
export class DemoModeStorageService {
  static readonly storageKey = 'skerp.demoMode';

  read(): boolean {
    try {
      return localStorage.getItem(DemoModeStorageService.storageKey) === 'true';
    } catch {
      return false;
    }
  }

  write(enabled: boolean): void {
    try {
      localStorage.setItem(DemoModeStorageService.storageKey, String(enabled));
    } catch {
      // Storage can be unavailable (private mode, quota). Demo Mode then lasts for this visit only.
    }
  }
}
