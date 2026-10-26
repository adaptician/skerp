using FluentValidation;
using MediatR;
using Skerp.Domain.Shared;

namespace Skerp.Application.Behaviors;

/// <summary>
/// Runs every FluentValidation validator for a request before its handler. When any rule fails,
/// the handler is skipped and a validation <see cref="Error"/> is returned as a failed result.
/// Only requests whose response is a <see cref="Result"/> are validated this way.
/// </summary>
internal sealed class ValidationBehavior<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
    where TResponse : Result
{
    public const string ErrorCode = "General.Validation";

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!validators.Any())
        {
            return await next(cancellationToken);
        }

        var context = new ValidationContext<TRequest>(request);
        var results = await Task.WhenAll(validators.Select(v => v.ValidateAsync(context, cancellationToken)));
        var failures = results
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count == 0)
        {
            return await next(cancellationToken);
        }

        var description = string.Join(" ", failures.Select(f => f.ErrorMessage).Distinct());
        var error = Error.Validation(SingleDomainCode(failures) ?? ErrorCode, description);

        return (TResponse)CreateFailure(typeof(TResponse), error);
    }

    /// <summary>
    /// When every failure carries the same domain error code (a dotted code such as
    /// <c>PurchaseOrder.InvalidQuantity</c>, set with <c>WithErrorCode</c>), that code; otherwise null,
    /// and the failure is reported as <see cref="ErrorCode"/>.
    /// </summary>
    private static string? SingleDomainCode(IReadOnlyCollection<FluentValidation.Results.ValidationFailure> failures)
    {
        var codes = failures.Select(f => f.ErrorCode).Distinct().ToList();
        return codes is [var code] && code.Contains('.', StringComparison.Ordinal) ? code : null;
    }

    private static Result CreateFailure(Type responseType, Error error)
    {
        if (responseType == typeof(Result))
        {
            return Result.Failure(error);
        }

        var valueType = responseType.GetGenericArguments()[0];
        var failure = typeof(Result)
            .GetMethods()
            .Single(m => m.Name == nameof(Result.Failure) && m.IsGenericMethodDefinition)
            .MakeGenericMethod(valueType);

        return (Result)failure.Invoke(obj: null, [error])!; // Result.Failure<T> never returns null.
    }
}
