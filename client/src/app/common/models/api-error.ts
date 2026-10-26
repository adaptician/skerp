/**
 * A failed API call, as every caller of {@link ApiClient} receives it.
 *
 * `code` is the server's error code (for example `PurchaseOrder.NotFound`), or
 * {@link ApiError.connectionFailedCode} when the server could not be reached or answered without a
 * Result body. `status` is the HTTP status, or 0 when no response arrived.
 */
export class ApiError extends Error {
  static readonly connectionFailedCode = 'Client.ConnectionFailed';

  constructor(
    readonly code: string,
    readonly description: string,
    readonly status: number,
  ) {
    super(description);
    this.name = 'ApiError';
  }

  /** True when the server never produced a Result body (network failure, proxy error, crash). */
  get isConnectionFailure(): boolean {
    return this.code === ApiError.connectionFailedCode;
  }
}
