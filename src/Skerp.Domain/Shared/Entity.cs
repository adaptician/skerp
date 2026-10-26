namespace Skerp.Domain.Shared;

/// <summary>
/// Root base for every persisted entity: a typed primary key.
/// </summary>
public abstract class Entity<TPrimaryKey>
{
    public required TPrimaryKey Id { get; init; }
}
