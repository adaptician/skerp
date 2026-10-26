import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';

import { ApiClient } from './api-client';

/** Release toggles the client mirrors (api.md → Feature Toggle Taxonomy). */
export const Features = {
  purchaseOrders: 'Feature_PurchaseOrders',
} as const;

export type FeatureId = (typeof Features)[keyof typeof Features];

interface EnabledFeaturesResponse {
  enabled: string[];
}

/**
 * Which release toggles the server has on, read from `GET /api/v1/features` and cached once read.
 * While the server cannot be reached every feature reads as off, so the client never offers a
 * screen the server would refuse; the next check asks again.
 */
@Injectable({ providedIn: 'root' })
export class FeatureService {
  private readonly api = inject(ApiClient);

  private enabled$: Observable<ReadonlySet<string>> | null = null;

  isEnabled(feature: FeatureId): Observable<boolean> {
    return this.loadEnabled().pipe(map((enabled) => enabled.has(feature)));
  }

  /** Cached after a successful read; a failed read is not cached, so the next navigation retries. */
  private loadEnabled(): Observable<ReadonlySet<string>> {
    this.enabled$ ??= this.api
      .get<EnabledFeaturesResponse>('features', { suppressErrorPopup: true })
      .pipe(
        map((response): ReadonlySet<string> => new Set(response.enabled)),
        catchError(() => {
          this.enabled$ = null;
          return of(new Set<string>());
        }),
        shareReplay(1),
      );

    return this.enabled$;
  }
}
