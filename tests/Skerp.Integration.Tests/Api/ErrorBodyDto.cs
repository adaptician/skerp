namespace Skerp.Integration.Tests.Api;

/// <summary>The error part of a Result envelope, as a client reads it.</summary>
public sealed record ErrorBodyDto(string Code, string Description);
