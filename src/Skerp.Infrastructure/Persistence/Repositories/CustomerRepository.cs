using Microsoft.EntityFrameworkCore;
using Skerp.Domain.Customers;

namespace Skerp.Infrastructure.Persistence.Repositories;

internal sealed class CustomerRepository(ApplicationDbContext dbContext) : ICustomerRepository
{
    public Task<Customer?> FindByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Set<Customer>().FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    // The Name column uses NOCASE, so equality ignores case in the database.
    public Task<bool> NameExistsAsync(string name, CancellationToken cancellationToken) =>
        dbContext.Set<Customer>().AnyAsync(c => c.Name == name, cancellationToken);

    public async Task<IReadOnlyList<Customer>> FindByNameFragmentAsync(
        string fragment,
        int maxResults,
        CancellationToken cancellationToken)
    {
        var pattern = $"%{LikePattern.Escape(fragment)}%";

        return await dbContext.Set<Customer>()
            .AsNoTracking()
            // Like function is called prior to query execution.
            .Where(c => EF.Functions.Like(c.Name, pattern, LikePattern.EscapeCharacter))
            .OrderBy(c => c.Name)
            .Take(maxResults)
            .ToListAsync(cancellationToken);
    }

    public void Add(Customer customer) => dbContext.Set<Customer>().Add(customer);
}
