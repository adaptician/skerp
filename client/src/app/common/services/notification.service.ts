import { Injectable, signal } from '@angular/core';

/** The popup variants: Feedback/ErrorPopup, Feedback/InfoPopup and Feedback/SuccessPopup. */
export type NotificationKind = 'error' | 'info' | 'success';

export interface AppNotification {
  readonly id: number;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly description: string;
}

/**
 * Application-wide popup messages. Errors stay until the user dismisses them (the design's rule for
 * Feedback/ErrorPopup); info and success messages also close on their own after
 * {@link NotificationService.autoDismissMs}.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly autoDismissMs = 6000;

  private readonly notificationsSignal = signal<readonly AppNotification[]>([]);
  private nextId = 1;

  /** The messages currently shown, oldest first. */
  readonly notifications = this.notificationsSignal.asReadonly();

  showError(title: string, description: string): number {
    return this.show('error', title, description);
  }

  showInfo(title: string, description: string): number {
    return this.show('info', title, description);
  }

  showSuccess(title: string, description: string): number {
    return this.show('success', title, description);
  }

  dismiss(id: number): void {
    this.notificationsSignal.update((all) => all.filter((n) => n.id !== id));
  }

  private show(kind: NotificationKind, title: string, description: string): number {
    const id = this.nextId++;
    this.notificationsSignal.update((all) => [...all, { id, kind, title, description }]);

    if (kind !== 'error') {
      setTimeout(() => this.dismiss(id), this.autoDismissMs);
    }

    return id;
  }
}
