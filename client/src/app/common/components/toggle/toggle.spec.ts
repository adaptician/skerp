import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { Toggle } from './toggle';

describe('Toggle', () => {
  it('should expose its state as a named switch', async () => {
    await render(Toggle, { inputs: { label: 'Demo Mode', checked: true } });

    const toggle = screen.getByRole('switch', { name: 'Demo Mode' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('should ask for the opposite value when pressed', async () => {
    const changes: boolean[] = [];
    await render(Toggle, {
      inputs: { label: 'Demo Mode', checked: false },
      on: { checkedChange: (value: boolean) => changes.push(value) },
    });

    await userEvent.click(screen.getByRole('switch', { name: 'Demo Mode' }));

    expect(changes).toEqual([true]);
  });

  it('should toggle from the keyboard', async () => {
    const changes: boolean[] = [];
    await render(Toggle, {
      inputs: { label: 'Demo Mode', checked: true },
      on: { checkedChange: (value: boolean) => changes.push(value) },
    });

    screen.getByRole('switch').focus();
    await userEvent.keyboard(' ');

    expect(changes).toEqual([false]);
  });

  it('should not emit while disabled', async () => {
    const changes: boolean[] = [];
    await render(Toggle, {
      inputs: { label: 'Demo Mode', disabled: true },
      on: { checkedChange: (value: boolean) => changes.push(value) },
    });

    await userEvent.click(screen.getByRole('switch'));

    expect(changes).toEqual([]);
  });
});
