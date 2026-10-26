import { formatMoney } from './money.pipe';

describe('formatMoney', () => {
  it('should group thousands with spaces and show two decimals', () => {
    expect(formatMoney(1284.5, 'R')).toBe('R 1 284.50');
    expect(formatMoney(12450, 'R')).toBe('R 12 450.00');
    expect(formatMoney(0, '$')).toBe('$ 0.00');
  });

  it('should keep up to four decimals the server sent, without rounding them away', () => {
    expect(formatMoney(0.9999, 'R')).toBe('R 0.9999');
    expect(formatMoney(8.6415, 'R')).toBe('R 8.6415');
    expect(formatMoney(1.234, '€')).toBe('€ 1.234');
  });
});
