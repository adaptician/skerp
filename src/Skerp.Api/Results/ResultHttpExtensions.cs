using Skerp.Domain.Shared;

namespace Skerp.Api.Results;

/// <summary>
/// Translates a <see cref="Result"/> into an HTTP response with the matching status code.
/// Endpoints stay thin: they send a command or query and return its result through these.
/// </summary>
internal static class ResultHttpExtensions
{
    /// <summary>A successful result becomes <paramref name="successStatusCode"/> with the value; a failure, its error status.</summary>
    public static IResult ToHttpResult<TValue>(this Result<TValue> result, int successStatusCode = StatusCodes.Status200OK) =>
        result.IsSuccess
            ? TypedResults.Json(Success(result.Value), statusCode: successStatusCode)
            : result.Error.ToHttpResult();

    /// <summary>A successful result without a value becomes <paramref name="successStatusCode"/>.</summary>
    public static IResult ToHttpResult(this Result result, int successStatusCode = StatusCodes.Status200OK) =>
        result.IsSuccess
            ? TypedResults.Json(Success<object>(value: null), statusCode: successStatusCode)
            : result.Error.ToHttpResult();

    /// <summary>A failure envelope for <paramref name="error"/>, with the status code its type maps to.</summary>
    public static IResult ToHttpResult(this Error error) =>
        TypedResults.Json(Failure(error), statusCode: error.ToStatusCode());

    public static ResultEnvelope<object> Failure(Error error) =>
        new(IsSuccess: false, IsFailure: true, new ErrorBody(error.Code, error.Description), Value: null);

    /// <summary>
    /// Validation → 400, not found → 404, conflict → 409, any other expected failure (a business
    /// rule the request breaks) → 422.
    /// </summary>
    public static int ToStatusCode(this Error error) => error.Type switch
    {
        ErrorType.Validation => StatusCodes.Status400BadRequest,
        ErrorType.NotFound => StatusCodes.Status404NotFound,
        ErrorType.Conflict => StatusCodes.Status409Conflict,
        ErrorType.Failure => StatusCodes.Status422UnprocessableEntity,
        _ => StatusCodes.Status500InternalServerError,
    };

    private static ResultEnvelope<TValue> Success<TValue>(TValue? value) =>
        new(IsSuccess: true, IsFailure: false, Error: null, value);
}
