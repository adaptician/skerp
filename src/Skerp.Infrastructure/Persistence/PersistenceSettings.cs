using Microsoft.Data.Sqlite;

namespace Skerp.Infrastructure.Persistence;

/// <summary>
/// The SQLite connection, read from <c>ConnectionStrings:Skerp</c>.
/// </summary>
internal static class PersistenceSettings
{
    public const string ConnectionStringName = "Skerp";

    /// <summary>
    /// Resolves a relative <c>Data Source</c> against the API's content root, so the database file
    /// lives in the same place whichever directory the API was started from.
    /// </summary>
    public static string ResolveConnectionString(string connectionString, string contentRootPath)
    {
        var builder = new SqliteConnectionStringBuilder(connectionString);
        var isFile = !string.IsNullOrWhiteSpace(builder.DataSource)
            && builder.DataSource != ":memory:"
            && builder.Mode != SqliteOpenMode.Memory;

        if (isFile && !Path.IsPathRooted(builder.DataSource))
        {
            builder.DataSource = Path.GetFullPath(Path.Combine(contentRootPath, builder.DataSource));
        }

        return builder.ToString();
    }
}
