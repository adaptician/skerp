using FluentValidation;
using FluentValidation.Results;
using Skerp.Domain.Shared;

namespace Skerp.Application.Validation;

/// <summary>
/// Bridges Domain rules into FluentValidation, so a request is rejected with the Domain's own error
/// code and description instead of a second, drifting copy of the rule.
/// </summary>
internal static class DomainRuleExtensions
{
    /// <summary>Reports <paramref name="error"/> (its code and description) when the rule fails.</summary>
    public static IRuleBuilderOptions<T, TProperty> WithError<T, TProperty>(
        this IRuleBuilderOptions<T, TProperty> rule,
        Error error) =>
        rule.WithErrorCode(error.Code).WithMessage(error.Description);

    /// <summary>Fails with the Domain error when <paramref name="check"/> returns a failed result.</summary>
    public static IRuleBuilderOptionsConditions<T, TProperty> SatisfiesDomainRule<T, TProperty>(
        this IRuleBuilder<T, TProperty> rule,
        Func<TProperty, Result> check) =>
        rule.Custom((value, context) =>
        {
            var result = check(value);
            if (result.IsFailure)
            {
                context.AddFailure(new ValidationFailure(context.PropertyPath, result.Error.Description)
                {
                    ErrorCode = result.Error.Code,
                });
            }
        });
}
