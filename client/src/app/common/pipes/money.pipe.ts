import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats an amount the server calculated for display: the currency symbol, a space, thousands
 * grouped with spaces and at least two decimals, keeping up to four when the amount has them
 * (`R 1 284.50`, `R 0.9999`). Display only: it never changes the value, so totals stay the
 * server's (brief: totals are never computed on the client).
 *
 * Input: the amount (number) and the currency symbol. Output: the formatted string.
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined, symbol: string): string {
    return formatMoney(amount ?? 0, symbol);
  }
}

export function formatMoney(amount: number, symbol: string): string {
  const fixed = amount
    .toFixed(4)
    .replace(/(\.\d\d\d?)0+$/, '$1')
    .replace(/(\.\d\d)0$/, '$1');
  const negative = fixed.startsWith('-');
  const [whole, decimals] = (negative ? fixed.slice(1) : fixed).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${negative ? '-' : ''}${symbol} ${grouped}.${decimals}`;
}
