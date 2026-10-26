import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { Pagination } from './pagination';

describe('Pagination', () => {
  async function setup(page: number, totalCount: number, compact = false) {
    const pages: number[] = [];
    await render(Pagination, {
      inputs: { page, pageSize: 10, totalCount, noun: 'purchase orders', compact },
      on: { pageChange: (p: number) => pages.push(p) },
    });
    return { pages, user: userEvent.setup() };
  }

  it('should summarise the range and mark the current page', async () => {
    await setup(1, 57);

    expect(screen.getByRole('navigation').textContent).toContain(
      'Showing 1–10 of 57 purchase orders',
    );
    expect(screen.getByRole('button', { name: 'Page 1' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.getByRole('button', { name: 'Page 6' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Page 5' })).toBeNull();
  });

  it('should disable Previous on the first page and Next on the last', async () => {
    await setup(1, 15);
    expect(
      (screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('should ask for the next page', async () => {
    const { pages, user } = await setup(2, 57);

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.click(screen.getByRole('button', { name: 'Page 6' }));

    expect(pages).toEqual([3, 6]);
  });

  it('should show "Page n of m" when compact', async () => {
    await setup(2, 57, true);

    expect(screen.getByRole('navigation').textContent).toContain('Page 2 of 6');
    expect(screen.getByRole('navigation').textContent).toContain('11–20 of 57');
  });
});
