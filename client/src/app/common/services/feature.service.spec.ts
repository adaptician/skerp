import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { ApiError } from '../models/api-error';
import { ApiClient } from './api-client';
import { FeatureService, Features } from './feature.service';

describe('FeatureService', () => {
  function setup(responses: (() => unknown)[]) {
    const calls: string[] = [];
    const api = {
      get: (path: string) => {
        calls.push(path);
        const next = responses.shift()!;
        return next();
      },
    };
    TestBed.configureTestingModule({ providers: [{ provide: ApiClient, useValue: api }] });
    return { service: TestBed.inject(FeatureService), calls };
  }

  it('should read the toggles once and cache them', async () => {
    const { service, calls } = setup([() => of({ enabled: [Features.purchaseOrders] })]);

    expect(await firstValueFrom(service.isEnabled(Features.purchaseOrders))).toBe(true);
    expect(await firstValueFrom(service.isEnabled(Features.purchaseOrders))).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('should read a failure as off and ask again next time', async () => {
    const { service, calls } = setup([
      () => throwError(() => new ApiError(ApiError.connectionFailedCode, 'down', 0)),
      () => of({ enabled: [Features.purchaseOrders] }),
    ]);

    expect(await firstValueFrom(service.isEnabled(Features.purchaseOrders))).toBe(false);
    expect(await firstValueFrom(service.isEnabled(Features.purchaseOrders))).toBe(true);
    expect(calls).toHaveLength(2);
  });
});
