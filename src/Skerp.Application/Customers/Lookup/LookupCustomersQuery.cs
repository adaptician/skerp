using MediatR;
using Skerp.Application.Common;
using Skerp.Domain.Customers;
using Skerp.Domain.Shared;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Application.Customers.Lookup;

/// <summary>
/// Customers whose name contains the typed text, ignoring case (api.md → Customer Lookup). The
/// email is returned so the form can show it, read-only, for a selected customer.
/// </summary>
public sealed record LookupCustomersQuery(string? Name) : IRequest<Result<LookupResponse<CustomerLookupItem>>>;

public sealed record CustomerLookupItem(Guid Id, string Name, string Email);

internal sealed class LookupCustomersQueryHandler(ICustomerRepository customers)
    : IRequestHandler<LookupCustomersQuery, Result<LookupResponse<CustomerLookupItem>>>
{
    private const int MaxResults = 10;

    private static readonly Error SearchTextInvalid = Error.Validation(
        "Customer.LookupInvalid",
        $"Enter 1 to {Customer.NameMaxLength} characters of a customer name to search.");

    public async Task<Result<LookupResponse<CustomerLookupItem>>> Handle(
        LookupCustomersQuery query,
        CancellationToken cancellationToken)
    {
        var text = NameNormalizer.Normalize(query.Name);
        if (text.Length is 0 or > Customer.NameMaxLength)
        {
            return SearchTextInvalid;
        }

        var matches = await customers.FindByNameFragmentAsync(text, MaxResults, cancellationToken);
        return new LookupResponse<CustomerLookupItem>(
            matches.Select(c => new CustomerLookupItem(c.Id, c.Name, c.Email)).ToList());
    }
}
