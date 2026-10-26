/**
 * The Result envelope every `/api/v1` response uses (Purchase Order Management Epic, api.md).
 * `error` is null on success; `value` is null on failure.
 */
export interface ApiResult<T> {
  isSuccess: boolean;
  isFailure: boolean;
  error: ApiErrorBody | null;
  value: T | null;
}

/** The public part of a server error: a stable dotted code and a description safe to show users. */
export interface ApiErrorBody {
  code: string;
  description: string;
}

/** Returns true when an unknown response body has the shape of a failed {@link ApiResult}. */
export function isFailedApiResult(
  body: unknown,
): body is ApiResult<unknown> & { error: ApiErrorBody } {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const candidate = body as Partial<ApiResult<unknown>>;
  return (
    candidate.isFailure === true &&
    typeof candidate.error?.code === 'string' &&
    typeof candidate.error?.description === 'string'
  );
}
