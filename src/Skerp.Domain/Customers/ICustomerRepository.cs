namespace Skerp.Domain.Customers;

/// <summary>Persistence operations on customers. Soft-deleted customers are never returned.</summary>
public interface ICustomerRepository
{
    Task<Customer?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>True when a customer with <paramref name="name"/> exists, ignoring case.</summary>
    Task<bool> NameExistsAsync(string name, CancellationToken cancellationToken);

    /// <summary>Customers whose name contains <paramref name="fragment"/>, ignoring case, in name order.</summary>
    Task<IReadOnlyList<Customer>> FindByNameFragmentAsync(string fragment, int maxResults, CancellationToken cancellationToken);

    void Add(Customer customer);
}
