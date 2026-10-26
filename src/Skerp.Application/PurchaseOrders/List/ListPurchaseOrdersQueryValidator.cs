using FluentValidation;
using Skerp.Application.Validation;
using Skerp.Domain.PurchaseOrders;
using Skerp.Domain.Shared;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Application.PurchaseOrders.List;

internal sealed class ListPurchaseOrdersQueryValidator : AbstractValidator<ListPurchaseOrdersQuery>
{
    public const int MaxCustomerIds = 10;
    public const int MaxPageSize = 100;

    public static readonly Error TooManyCustomers = Error.Validation(
        "PurchaseOrder.TooManyCustomerFilters",
        $"Filter by at most {MaxCustomerIds} customers.");

    public static readonly Error InvalidDateRange = Error.Validation(
        "PurchaseOrder.InvalidDateRange",
        "The start of the created-date range must not be after its end.");

    public static readonly Error InvalidSorting = Error.Validation(
        "PurchaseOrder.InvalidSorting",
        "Sort by reference, customer, total, status or createdAt, followed by asc or desc.");

    public static readonly Error InvalidSkipCount = Error.Validation(
        "General.InvalidSkipCount",
        "skipCount is required and must be 0 or more.");

    public static readonly Error InvalidMaxResultCount = Error.Validation(
        "General.InvalidMaxResultCount",
        $"maxResultCount must be from 1 to {MaxPageSize}.");

    public ListPurchaseOrdersQueryValidator()
    {
        RuleFor(q => q.Search)
            .SatisfiesDomainRule(ReferenceNormalizer.NormalizeSearch)
            .When(q => !string.IsNullOrWhiteSpace(q.Search));

        RuleFor(q => q.StatusId)
            .Must(id => Enum.IsDefined((StatusId)id!.Value))
            .When(q => q.StatusId.HasValue)
            .WithError(PurchaseOrderErrors.InvalidStatus);

        RuleFor(q => q.CustomerIds)
            .Must(ids => ids!.Count <= MaxCustomerIds)
            .When(q => q.CustomerIds is not null)
            .WithError(TooManyCustomers);

        RuleFor(q => q)
            .Must(q => q.CreatedMin <= q.CreatedMax)
            .When(q => q.CreatedMin.HasValue && q.CreatedMax.HasValue)
            .WithError(InvalidDateRange);

        RuleFor(q => q.Sorting)
            .Must(sorting => sorting!.Length <= PurchaseOrderSorting.MaxLength && PurchaseOrderSorting.TryParse(sorting, out _, out _))
            .When(q => !string.IsNullOrWhiteSpace(q.Sorting))
            .WithError(InvalidSorting);

        RuleFor(q => q.SkipCount)
            .Must(skip => skip is >= 0)
            .WithError(InvalidSkipCount);

        RuleFor(q => q.MaxResultCount)
            .Must(take => take is null or (>= 1 and <= MaxPageSize))
            .WithError(InvalidMaxResultCount);
    }
}
