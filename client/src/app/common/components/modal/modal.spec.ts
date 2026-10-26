import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { Modal } from './modal';

describe('Modal', () => {
  async function setup(busy = false) {
    const closes: number[] = [];
    await render(
      `<a-modal title="New purchase order" [busy]="busy" (closed)="closed()">
         <input aria-label="First field" /><input aria-label="Last field" />
         <button modalFooter type="button">Save</button>
       </a-modal>`,
      {
        imports: [Modal],
        componentProperties: { busy, closed: () => closes.push(1) },
      },
    );
    return { closes, user: userEvent.setup() };
  }

  it('should be a named modal dialog that focuses its first field', async () => {
    await setup();

    const dialog = screen.getByRole('dialog', { name: 'New purchase order' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'First field' }));
  });

  it('should ask to close on Escape and on the close button', async () => {
    const { closes, user } = await setup();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(closes).toHaveLength(2);
  });

  it('should not close while busy', async () => {
    const { closes, user } = await setup(true);

    await user.keyboard('{Escape}');

    expect(closes).toHaveLength(0);
  });
});
