import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ConfirmModal } from './confirm-modal';

async function setup(busy = false) {
  const events: string[] = [];
  await render(ConfirmModal, {
    inputs: {
      title: 'Delete purchase order?',
      message: 'PO-2026-024 for Alpha Studios will be deleted. This cannot be undone.',
      confirmLabel: 'Delete',
      busy,
    },
    on: {
      confirmed: () => events.push('confirmed'),
      cancelled: () => events.push('cancelled'),
    },
  });
  return { events, user: userEvent.setup() };
}

describe('ConfirmModal', () => {
  it('should name and describe the dialog and focus Cancel first', async () => {
    await setup();

    const dialog = screen.getByRole('alertdialog', { name: 'Delete purchase order?' });
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByText(/will be deleted\. This cannot be undone\./)).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('should report Cancel, Escape and Delete', async () => {
    const { events, user } = await setup();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(events).toEqual(['cancelled', 'cancelled', 'confirmed']);
  });

  it('should keep Tab inside the dialog', async () => {
    const { user } = await setup();
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    cancel.focus();

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete' }));
    await user.tab();
    expect(document.activeElement).toBe(cancel);
  });

  it('should ignore every action while busy', async () => {
    const { events, user } = await setup(true);

    await user.keyboard('{Escape}');

    expect(events).toEqual([]);
    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
