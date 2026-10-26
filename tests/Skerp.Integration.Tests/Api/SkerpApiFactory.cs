using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Skerp.Integration.Tests.Api;

/// <summary>
/// Hosts the real API pipeline against its own SQLite file in a temporary folder, so every
/// fixture starts from an empty database and never touches the developer's App_Data file.
/// </summary>
public class SkerpApiFactory : WebApplicationFactory<Program>
{
    /// <summary>A path outside /api/v1 whose request throws after the API pipeline has run.</summary>
    public const string ThrowingPath = "/test-only/throw";

    /// <summary>The exception message the throwing path raises; it must never reach a response.</summary>
    public const string SecretExceptionMessage = "Connection to db-prod-01 failed for user sa";

    private readonly string _databaseDirectory = Path.Combine(Path.GetTempPath(), "skerp-tests", Guid.NewGuid().ToString("N"));

    public string DatabasePath => Path.Combine(_databaseDirectory, "skerp.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:Skerp", $"Data Source={DatabasePath};Pooling=False");
        builder.ConfigureServices(services => services.AddSingleton<IStartupFilter, ThrowingEndpointStartupFilter>());
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && Directory.Exists(_databaseDirectory))
        {
            Directory.Delete(_databaseDirectory, recursive: true);
        }
    }

    /// <summary>
    /// Appends middleware after the API's own pipeline, so the exception it throws passes through
    /// the real exception handler exactly as an endpoint failure would.
    /// </summary>
    private sealed class ThrowingEndpointStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            next(app);
            app.Use((context, nextMiddleware) => context.Request.Path == ThrowingPath
                ? throw new InvalidOperationException(SecretExceptionMessage)
                : nextMiddleware(context));
        };
    }
}
