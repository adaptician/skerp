import { Injectable } from '@angular/core';

/**
 * Remembers whether Monitor Mode is on, so the refresh the disconnected indicator asks for comes back
 * in Monitor Mode. Reading never throws: a missing, unreadable or unexpected value means off.
 */
@Injectable({ providedIn: 'root' })
export class MonitorModeStorageService {
  static readonly storageKey = 'skerp.purchaseOrders.monitorMode';

  read(): boolean {
    try {
      return localStorage.getItem(MonitorModeStorageService.storageKey) === 'true';
    } catch {
      return false;
    }
  }

  write(enabled: boolean): void {
    try {
      localStorage.setItem(MonitorModeStorageService.storageKey, String(enabled));
    } catch {
      // Storage can be unavailable (private mode, quota). Monitor Mode then lasts for this visit only.
    }
  }
}
