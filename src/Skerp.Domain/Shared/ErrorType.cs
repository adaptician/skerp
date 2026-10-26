namespace Skerp.Domain.Shared;

/// <summary>
/// The category of an expected failure. The API maps each category to an HTTP status code.
/// </summary>
public enum ErrorType
{
    Failure = 0,
    Validation = 1,
    NotFound = 2,
    Conflict = 3,
}
