import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { apiErrorInterceptor } from '../interceptors/api-error.interceptor';
import { ApiError } from '../models/api-error';
import { ApiClient } from './api-client';
import { NotificationService } from './notification.service';

describe('ApiClient', () => {
  let client: ApiClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(ApiClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('should send requests under the versioned API base path', () => {
    void firstValueFrom(client.post('purchase-orders/search', { skipCount: 0 }));

    const request = backend.expectOne('/api/v1/purchase-orders/search');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ skipCount: 0 });
    request.flush({ isSuccess: true, isFailure: false, error: null, value: [] });
  });

  it('should resolve to the value of a successful Result', async () => {
    const result = firstValueFrom(client.get<{ id: string }>('samples/1'));

    backend
      .expectOne('/api/v1/samples/1')
      .flush({ isSuccess: true, isFailure: false, error: null, value: { id: '1' } });

    await expect(result).resolves.toEqual({ id: '1' });
  });

  it('should treat a 204 No Content delete as a success', async () => {
    const result = firstValueFrom(client.delete('samples/1'));

    backend.expectOne('/api/v1/samples/1').flush(null, { status: 204, statusText: 'No Content' });

    await expect(result).resolves.toBeUndefined();
  });

  it('should still refuse an empty body from any other request', async () => {
    const result = firstValueFrom(client.get('samples/1'));

    backend.expectOne('/api/v1/samples/1').flush(null);

    await expect(result).rejects.toBeTruthy();
  });

  it('should reject with an ApiError when the API answers with a failure Result', async () => {
    const result = firstValueFrom(client.delete('samples/1'));

    backend.expectOne('/api/v1/samples/1').flush(
      {
        isSuccess: false,
        isFailure: true,
        error: { code: 'Sample.NotFound', description: 'Gone.' },
        value: null,
      },
      { status: 404, statusText: 'Not Found' },
    );

    await expect(result).rejects.toMatchObject({ code: 'Sample.NotFound', status: 404 });
  });

  it('should keep the error popup hidden when the caller handles the failure itself', async () => {
    const notifications = TestBed.inject(NotificationService);
    const result = firstValueFrom(client.put('samples/1', {}, { suppressErrorPopup: true }));

    backend.expectOne('/api/v1/samples/1').flush(
      {
        isSuccess: false,
        isFailure: true,
        error: { code: 'General.Validation', description: 'Bad.' },
        value: null,
      },
      { status: 400, statusText: 'Bad Request' },
    );

    await expect(result).rejects.toBeInstanceOf(ApiError);
    expect(notifications.notifications()).toHaveLength(0);
  });
});
