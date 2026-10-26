import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { Header, HeaderMenuItem } from './header';

@Component({ template: '' })
class BlankPage {}

const items: HeaderMenuItem[] = [
  { label: 'Home', icon: 'home', link: '/', exact: true },
  { label: 'Purchase Orders', icon: 'orders', link: '/purchase-orders' },
];

async function renderHeader(
  demoMode = false,
  onDemoModeChange: (value: boolean) => void = () => undefined,
) {
  return render(Header, {
    inputs: { items, demoMode },
    on: { demoModeChange: onDemoModeChange },
    providers: [
      provideRouter([
        { path: '', component: BlankPage },
        { path: 'purchase-orders', component: BlankPage },
      ]),
    ],
    initialRoute: '/purchase-orders',
  });
}

/** The menu button, found by what it controls rather than by its label text. */
function menuButtonOf(): HTMLElement {
  return document.querySelector('button[aria-controls="header-menu-panel"]') as HTMLElement;
}

describe('Header', () => {
  // The desktop menu is display:none at jsdom's default width, so hidden elements are included.
  it('should mark the menu item of the current route as the current page', async () => {
    await renderHeader();

    const current = screen.getAllByRole('link', { current: 'page', hidden: true });
    expect(current.map((link) => link.textContent?.trim())).toEqual(['Purchase Orders']);
  });

  it('should pass Demo Mode switches up to its owner', async () => {
    const changes: boolean[] = [];
    await renderHeader(false, (value) => changes.push(value));

    await userEvent.click(screen.getByRole('switch'));

    expect(changes).toEqual([true]);
  });

  it('should open the menu panel from the menu button and close it with Escape', async () => {
    await renderHeader();
    const menuButton = menuButtonOf();

    await userEvent.click(menuButton);
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('header-menu-panel')).not.toBeNull();

    await userEvent.keyboard('{Escape}');
    expect(document.getElementById('header-menu-panel')).toBeNull();
    expect(document.activeElement).toBe(menuButton);
  });

  it('should close the menu panel when an item is chosen', async () => {
    await renderHeader();
    await userEvent.click(menuButtonOf());

    const panel = document.getElementById('header-menu-panel') as HTMLElement;
    await userEvent.click(panel.querySelector('a[href="/"]') as HTMLElement);

    expect(document.getElementById('header-menu-panel')).toBeNull();
  });
});
