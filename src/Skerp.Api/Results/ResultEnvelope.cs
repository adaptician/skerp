namespace Skerp.Api.Results;

/// <summary>
/// The JSON shape of every <c>/api/v1</c> response (api.md in the Purchase Order Management Epic):
/// <c>isSuccess</c>, <c>isFailure</c>, <c>error</c> (null on success) and <c>value</c> (null on failure).
/// </summary>
internal sealed record ResultEnvelope<TValue>(bool IsSuccess, bool IsFailure, ErrorBody? Error, TValue? Value);
