import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { NotificationService } from '../../services/notification.service';
import { PopupHost } from './popup-host';

describe('PopupHost', () => {
  it('should announce an error message as an alert with its title and description', async () => {
    await render(PopupHost);
    TestBed.inject(NotificationService).showError(
      'Could not save',
      'The reference already exists.',
    );

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Could not save');
    expect(alert.textContent).toContain('The reference already exists.');
  });

  it('should announce info messages politely rather than as alerts', async () => {
    await render(PopupHost);
    TestBed.inject(NotificationService).showInfo('Heads up', 'Something changed.');

    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('should remove a message when its dismiss button is pressed', async () => {
    const { fixture } = await render(PopupHost);
    TestBed.inject(NotificationService).showError('Could not save', 'Details.');
    fixture.detectChanges();

    const alert = await screen.findByRole('alert');
    await userEvent.click(alert.querySelector('button') as HTMLElement);
    fixture.detectChanges();

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
