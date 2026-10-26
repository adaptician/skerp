import { TestBed } from '@angular/core/testing';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => vi.useRealTimers());

  it('should keep an error until it is dismissed', () => {
    const id = service.showError('Title', 'Description');

    vi.advanceTimersByTime(service.autoDismissMs * 10);
    expect(service.notifications().map((n) => n.id)).toEqual([id]);

    service.dismiss(id);
    expect(service.notifications()).toHaveLength(0);
  });

  it('should close info and success messages on their own', () => {
    service.showInfo('Info', 'Description');
    service.showSuccess('Saved', 'Description');

    vi.advanceTimersByTime(service.autoDismissMs);

    expect(service.notifications()).toHaveLength(0);
  });

  it('should show messages oldest first', () => {
    service.showError('First', 'a');
    service.showError('Second', 'b');

    expect(service.notifications().map((n) => n.title)).toEqual(['First', 'Second']);
  });
});
