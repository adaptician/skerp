import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ActionMenu } from './action-menu';

describe('ActionMenu', () => {
  async function setup() {
    const chosen: string[] = [];
    await render(ActionMenu, {
      inputs: {
        label: 'Actions for PO-1',
        items: [
          { id: 'view', label: 'View', icon: 'view' },
          { id: 'delete', label: 'Delete', icon: 'trash', danger: true },
        ],
      },
      on: { selected: (id: string) => chosen.push(id) },
    });
    return { chosen, user: userEvent.setup() };
  }

  it('should open a menu with the danger item last and report the choice', async () => {
    const { chosen, user } = await setup();
    const trigger = screen.getByRole('button', { name: 'Actions for PO-1' });

    await user.click(trigger);
    const items = screen.getAllByRole('menuitem');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(items.map((i) => i.textContent?.trim())).toEqual(['View', 'Delete']);

    await user.click(items[0]);
    expect(chosen).toEqual(['view']);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('should move with the arrow keys and close on Escape, returning focus', async () => {
    const { user } = await setup();
    const trigger = screen.getByRole('button', { name: 'Actions for PO-1' });

    await user.click(trigger);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent?.trim()).toBe('Delete');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('should keep a disabled item reachable but inert, with its reason', async () => {
    const chosen: string[] = [];
    await render(ActionMenu, {
      inputs: {
        label: 'Actions for PO-2',
        items: [
          { id: 'view', label: 'View', icon: 'view' },
          {
            id: 'edit',
            label: 'Edit',
            icon: 'edit',
            disabled: true,
            disabledReason: 'Only Pending purchase orders can be edited.',
          },
        ],
      },
      on: { selected: (id: string) => chosen.push(id) },
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Actions for PO-2' }));
    await user.keyboard('{ArrowDown}');
    const edit = screen.getByRole('menuitem', { name: /Edit/ });
    expect(document.activeElement).toBe(edit);
    expect(edit.getAttribute('aria-disabled')).toBe('true');
    expect(edit.textContent).toContain('Only Pending purchase orders can be edited.');

    await user.keyboard('{Enter}');
    expect(chosen).toEqual([]);
    expect(screen.getByRole('menu')).toBeTruthy();
  });
});
