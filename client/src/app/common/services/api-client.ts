import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ERROR_POPUP_TITLE, SUPPRESS_ERROR_POPUP } from '../interceptors/api-error.interceptor';
import { ApiError } from '../models/api-error';
import { ApiResult } from '../models/api-result';

/** Per-request options for {@link ApiClient}. */
export interface ApiRequestOptions {
  /** Query-string parameters. */
  params?:
    HttpParams | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
  /** Title of the error popup if this call fails, naming the operation (for example "Could not save the order"). */
  errorTitle?: string;
  /** True when the caller shows failures itself, so the global error popup stays hidden. */
  suppressErrorPopup?: boolean;
}

/**
 * Typed access to the versioned API. Every method resolves to the Result's `value` on success and
 * errors with an {@link ApiError} on failure, so callers never handle the envelope themselves.
 * Failures are also shown in the error popup unless `suppressErrorPopup` is set.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.unwrap(this.http.get<ApiResult<T>>(this.url(path), this.httpOptions(options)));
  }

  post<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.unwrap(
      this.http.post<ApiResult<T>>(this.url(path), body, this.httpOptions(options)),
    );
  }

  put<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.unwrap(
      this.http.put<ApiResult<T>>(this.url(path), body, this.httpOptions(options)),
    );
  }

  patch<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.unwrap(
      this.http.patch<ApiResult<T>>(this.url(path), body, this.httpOptions(options)),
    );
  }

  /** A delete may answer 204 No Content: an empty success body is a success with no value. */
  delete<T = void>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.unwrap(
      this.http.delete<ApiResult<T>>(this.url(path), this.httpOptions(options)),
      true,
    );
  }

  private url(path: string): string {
    return `${environment.apiBaseUrl}/${path.replace(/^\/+/, '')}`;
  }

  private httpOptions(options: ApiRequestOptions): {
    params?: ApiRequestOptions['params'];
    context: HttpContext;
  } {
    const context = new HttpContext()
      .set(SUPPRESS_ERROR_POPUP, options.suppressErrorPopup ?? false)
      .set(ERROR_POPUP_TITLE, options.errorTitle ?? null);

    return { params: options.params, context };
  }

  private unwrap<T>(response: Observable<ApiResult<T>>, allowEmpty = false): Observable<T> {
    return response.pipe(
      map((result) => {
        if (allowEmpty && result === null) {
          return undefined as T;
        }

        // A 2xx response always carries a successful Result; anything else is a broken contract.
        if (!result?.isSuccess) {
          throw new ApiError(
            result?.error?.code ?? ApiError.connectionFailedCode,
            result?.error?.description ?? 'The server sent a response Sharp ERP could not read.',
            200,
          );
        }

        return result.value as T;
      }),
    );
  }
}
