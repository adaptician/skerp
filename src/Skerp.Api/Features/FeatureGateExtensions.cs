using Microsoft.FeatureManagement;
using Skerp.Api.Results;

namespace Skerp.Api.Features;

internal static class FeatureGateExtensions
{
    /// <summary>
    /// Marks every endpoint in the group (or hub) as belonging to <paramref name="feature"/>. While it is
    /// off, <see cref="UseFeatureGates"/> answers 404, as if the endpoint did not exist (api.md → Feature Gates).
    /// </summary>
    public static TBuilder RequireFeature<TBuilder>(this TBuilder builder, string feature)
        where TBuilder : IEndpointConventionBuilder
    {
        builder.WithMetadata(new RequiredFeature(feature));
        return builder;
    }

    /// <summary>
    /// Enforces <see cref="RequireFeature"/> after routing and before the endpoint runs, so a disabled
    /// feature answers 404 even to a request its endpoint could not bind (a 400 would reveal the endpoint).
    /// </summary>
    public static IApplicationBuilder UseFeatureGates(this IApplicationBuilder app) =>
        app.Use(async (context, next) =>
        {
            var required = context.GetEndpoint()?.Metadata.GetMetadata<RequiredFeature>();
            if (required is not null)
            {
                var featureManager = context.RequestServices.GetRequiredService<IFeatureManager>();
                if (!await featureManager.IsEnabledAsync(required.Feature))
                {
                    await ApiErrors.NotFound.ToHttpResult().ExecuteAsync(context);
                    return;
                }
            }

            await next(context);
        });

    private sealed record RequiredFeature(string Feature);
}
