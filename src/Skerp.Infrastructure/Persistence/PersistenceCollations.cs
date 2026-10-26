namespace Skerp.Infrastructure.Persistence;

/// <summary>SQLite-specific names the entity configurations share.</summary>
internal static class PersistenceCollations
{
    /// <summary>SQLite's built-in case-insensitive (ASCII) collation, for names and SKUs (api.md).</summary>
    public const string NoCase = "NOCASE";

    /// <summary>The filter that limits a unique index to rows that are not soft-deleted.</summary>
    public const string NotDeletedFilter = "\"IsDeleted\" = 0";
}
