namespace Skerp.Api.Results;

/// <summary>The public part of a domain error: never the exception, the stack or internal detail.</summary>
internal sealed record ErrorBody(string Code, string Description);
