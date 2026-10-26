import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The Sharp ERP emblem and wordmark (Brand/Lockup). Placeholder artwork until the final emblem is
 * supplied; replace `public/brand/emblem.svg` and keep this component. The emblem is decorative:
 * the wordmark text names the brand.
 */
@Component({
  selector: 'a-brand-lockup',
  template: `
    <img class="brand-lockup__emblem" src="/brand/emblem.svg" alt="" width="40" height="40" />
    <span class="brand-lockup__wordmark"
      ><span class="brand-lockup__sharp">Sharp</span>
      <span class="brand-lockup__erp">ERP</span></span
    >
  `,
  styleUrl: './brand-lockup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLockup {}
