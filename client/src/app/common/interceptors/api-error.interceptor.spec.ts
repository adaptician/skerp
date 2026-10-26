import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../models/api-error';
import { NotificationService } from '../services/notification.service';
import {
  ERROR_POPUP_TITLE,
  SUPPRESS_ERROR_POPUP,
  apiErrorInterceptor,
} from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let notifications: NotificationService;

  const failureBody = {
    isSuccess: false,
    isFailure: true,
    error: { code: 'Sample.NotAllowed', description: 'Server says no.' },
    value: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => backend.verify());

  async function failWith(
    body: string | object,
    status: number,
    context = new HttpContext(),
  ): Promise<ApiError> {
    const request = firstValueFrom(http.get('/api/v1/samples', { context }));
    backend.expectOne('/api/v1/samples').flush(body, { status, statusText: 'Error' });
    return request.then(
      () => {
        throw new Error('expected the request to fail');
      },
      (error: unknown) => error as ApiError,
    );
  }

  it('should rethrow a failure Result as an ApiError carrying the server code and description', async () => {
    const error = await failWith(failureBody, 422);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('Sample.NotAllowed');
    expect(error.description).toBe('Server says no.');
    expect(error.status).toBe(422);
  });

  it('should show the server description in an error popup', async () => {
    await failWith(failureBody, 422);

    const [shown] = notifications.notifications();
    expect(shown.kind).toBe('error');
    expect(shown.description).toBe('Server says no.');
  });

  it('should use the title the caller named for the operation', async () => {
    await failWith(
      failureBody,
      422,
      new HttpContext().set(ERROR_POPUP_TITLE, 'Could not change the status'),
    );

    expect(notifications.notifications()[0].title).toBe('Could not change the status');
  });

  it('should report a connection failure when the response has no Result body', async () => {
    const error = await failWith('Bad gateway', 502);

    expect(error.isConnectionFailure).toBe(true);
    expect(notifications.notifications()[0].title).toContain('Could not reach');
  });

  it('should not show a popup when the caller suppresses it', async () => {
    await failWith(failureBody, 400, new HttpContext().set(SUPPRESS_ERROR_POPUP, true));

    expect(notifications.notifications()).toHaveLength(0);
  });

  it('should leave requests outside the API untouched', async () => {
    const request = firstValueFrom(http.get('/assets/data.json'));
    backend.expectOne('/assets/data.json').flush('nope', { status: 500, statusText: 'Error' });

    await expect(request).rejects.not.toBeInstanceOf(ApiError);
    expect(notifications.notifications()).toHaveLength(0);
  });
});
