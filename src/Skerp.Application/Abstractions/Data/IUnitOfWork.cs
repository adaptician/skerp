namespace Skerp.Application.Abstractions.Data;

/// <summary>
/// Commits the changes a command made as one transaction.
/// </summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
