import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { apiErrorInterceptor } from '../../../common/interceptors/api-error.interceptor';
import { NotificationService } from '../../../common/services/notification.service';
import { PurchaseOrdersApi } from './purchase-orders-api';

describe('PurchaseOrdersApi', () => {
  let api: PurchaseOrdersApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(PurchaseOrdersApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('should show a refused status change as "Status change not allowed" with the server reason', async () => {
    const request = firstValueFrom(api.updateStatus('o1', 60));
    const call = backend.expectOne((req) => req.url.endsWith('/purchase-orders/o1/status'));
    expect(call.request.method).toBe('PUT');
    expect(call.request.body).toEqual({ statusId: 60 });

    call.flush(
      {
        isSuccess: false,
        isFailure: true,
        error: {
          code: 'PurchaseOrder.InvalidStatusTransition',
          description:
            'This status change is not allowed. A Pending order can only be Confirmed or Cancelled.',
        },
        value: null,
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await expect(request).rejects.toBeTruthy();

    expect(TestBed.inject(NotificationService).notifications()).toEqual([
      expect.objectContaining({
        kind: 'error',
        title: 'Status change not allowed',
        description:
          'This status change is not allowed. A Pending order can only be Confirmed or Cancelled.',
      }),
    ]);
  });
});
