import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { DemoModeActions, selectDemoModeEnabled } from '../../../../common/state/demo-mode';
import { WelcomePage } from './welcome-page';

describe('WelcomePage', () => {
  async function renderPage(demoMode = false) {
    const view = await render(WelcomePage, {
      providers: [
        provideRouter([]),
        provideMockStore({ selectors: [{ selector: selectDemoModeEnabled, value: demoMode }] }),
      ],
    });
    return { ...view, store: view.fixture.debugElement.injector.get(MockStore) };
  }

  it('should show the three cards in order', async () => {
    await renderPage();

    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim());
    expect(titles).toHaveLength(3);
  });

  it('should link to the purchase orders screen', async () => {
    await renderPage();

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/purchase-orders');
  });

  it('should open both developer links in a new tab without handing over the opener', async () => {
    await renderPage();

    const external = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('http'));
    expect(external).toHaveLength(2);
    for (const link of external) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });

  it('should reflect the app-wide Demo Mode in the reviewer card toggle', async () => {
    await renderPage(true);

    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('should switch the app-wide Demo Mode from the reviewer card', async () => {
    const { store } = await renderPage(false);
    const dispatch = vi.spyOn(store, 'dispatch');

    await userEvent.click(screen.getByRole('switch'));

    expect(dispatch).toHaveBeenCalledWith(DemoModeActions.switched({ enabled: true }));
  });
});
