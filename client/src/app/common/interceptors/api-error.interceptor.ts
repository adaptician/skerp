import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiError } from '../models/api-error';
import { isFailedApiResult } from '../models/api-result';
import { NotificationService } from '../services/notification.service';

/**
 * Set to true on a request whose caller shows the failure itself (for example a form that puts a
 * validation error beside its field), so the global popup does not repeat it.
 */
export const SUPPRESS_ERROR_POPUP = new HttpContextToken<boolean>(() => false);

/** Set on a request to give its error popup a title naming the operation that failed. */
export const ERROR_POPUP_TITLE = new HttpContextToken<string | null>(() => null);

const connectionFailedTitle = 'Could not reach Sharp ERP';
const connectionFailedDescription =
  'The Sharp ERP server did not respond. Check that it is running, then try again.';

/**
 * Turns every failed `/api/v1` response into an {@link ApiError} and, unless the request opts out,
 * shows it in the error popup: the server's description when it sent a Result body, a connection
 * message when it did not. Errors are re-thrown so callers can still react to them.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }

  const notifications = inject(NotificationService);

  return next(request).pipe(
    catchError((response: unknown) => {
      if (!(response instanceof HttpErrorResponse)) {
        return throwError(() => response);
      }

      const error = toApiError(response);
      if (!request.context.get(SUPPRESS_ERROR_POPUP)) {
        const title = error.isConnectionFailure
          ? connectionFailedTitle
          : (request.context.get(ERROR_POPUP_TITLE) ?? defaultTitle(error.status));
        notifications.showError(title, error.description);
      }

      return throwError(() => error);
    }),
  );
};

function toApiError(response: HttpErrorResponse): ApiError {
  if (isFailedApiResult(response.error)) {
    return new ApiError(
      response.error.error.code,
      response.error.error.description,
      response.status,
    );
  }

  return new ApiError(ApiError.connectionFailedCode, connectionFailedDescription, response.status);
}

function defaultTitle(status: number): string {
  switch (status) {
    case 400:
      return 'Check the details';
    case 404:
      return 'Not found';
    case 409:
      return 'Already exists';
    case 422:
      return 'Not allowed';
    default:
      return 'Something went wrong';
  }
}
