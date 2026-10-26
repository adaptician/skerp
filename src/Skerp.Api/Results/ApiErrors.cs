using Skerp.Domain.Shared;

namespace Skerp.Api.Results;

/// <summary>Errors the API itself raises, independent of any domain concept.</summary>
internal static class ApiErrors
{
    public static readonly Error Unexpected = Error.Failure(
        "General.Unexpected",
        "Something went wrong on our side and the request could not be completed. Please try again.");

    public static readonly Error NotFound = Error.NotFound(
        "General.NotFound",
        "The requested resource does not exist.");

    public static readonly Error BadRequest = Error.Validation(
        "General.BadRequest",
        "The request could not be read. Check the values sent and try again.");
}
