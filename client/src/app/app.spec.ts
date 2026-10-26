import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { App } from './app';
import { routes } from './app.routes';
import { DemoModeStorageService } from './common/services/demo-mode-storage.service';
import { provideDemoMode } from './common/state/demo-mode';

describe('App shell', () => {
  beforeEach(() => localStorage.clear());

  async function renderShell() {
    return render(App, {
      providers: [provideRouter(routes), provideStore(), provideDemoMode()],
      initialRoute: '/',
    });
  }

  it('should keep the header and the reviewer card toggles in step', async () => {
    await renderShell();
    const toggles = await screen.findAllByRole('switch');
    expect(toggles).toHaveLength(2);

    await userEvent.click(toggles[0]);

    expect(toggles.map((t) => t.getAttribute('aria-checked'))).toEqual(['true', 'true']);
  });

  it('should remember Demo Mode for the next visit', async () => {
    await renderShell();

    await userEvent.click((await screen.findAllByRole('switch'))[0]);

    expect(new DemoModeStorageService().read()).toBe(true);
  });

  it('should start with Demo Mode on when the last visit left it on', async () => {
    new DemoModeStorageService().write(true);

    await renderShell();

    const toggles = await screen.findAllByRole('switch');
    expect(toggles.map((t) => t.getAttribute('aria-checked'))).toEqual(['true', 'true']);
  });

  it('should start with Demo Mode off on a first visit', async () => {
    await renderShell();

    const toggles = await screen.findAllByRole('switch');
    expect(toggles.map((t) => t.getAttribute('aria-checked'))).toEqual(['false', 'false']);
  });
});
