namespace Skerp.Integration.Tests.Api;

/// <summary>The Result envelope as a client reads it; deliberately independent of the API's own types.</summary>
public sealed record ResultBody(bool IsSuccess, bool IsFailure, ErrorBodyDto? Error);

/// <summary>A Result envelope that carries a <typeparamref name="TValue"/> on success.</summary>
public sealed record ResultBody<TValue>(bool IsSuccess, bool IsFailure, ErrorBodyDto? Error, TValue? Value);
