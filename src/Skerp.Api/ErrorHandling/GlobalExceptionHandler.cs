using Microsoft.AspNetCore.Diagnostics;
using Skerp.Api.Results;

namespace Skerp.Api.ErrorHandling;

/// <summary>
/// The application boundary for unexpected failures (backend.md): logs the exception with its
/// stack trace and returns a generic, redacted Result body. A request the framework could not
/// bind is reported as a 400 instead, still without internal detail.
/// </summary>
internal sealed partial class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, error) = exception is BadHttpRequestException badRequest
            ? (badRequest.StatusCode, ApiErrors.BadRequest)
            : (StatusCodes.Status500InternalServerError, ApiErrors.Unexpected);

        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            LogUnhandledException(logger, exception, httpContext.Request.Method, httpContext.Request.Path);
        }
        else
        {
            LogBadRequest(logger, httpContext.Request.Method, httpContext.Request.Path, exception.Message);
        }

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(ResultHttpExtensions.Failure(error), cancellationToken);

        return true;
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Unhandled exception while processing {Method} {Path}")]
    private static partial void LogUnhandledException(ILogger logger, Exception exception, string method, string path);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Rejected malformed request {Method} {Path}: {Reason}")]
    private static partial void LogBadRequest(ILogger logger, string method, string path, string reason);
}
