using Microsoft.FeatureManagement;
using Skerp.Api.Results;
using Skerp.Domain.Shared;

namespace Skerp.Api.Features;

/// <summary>
/// <c>GET /api/v1/features</c>: the release toggles that are on, so the client can mirror the server's
/// feature gates in its routes (angular.md → Guards). It reveals nothing a gated endpoint would not.
/// </summary>
internal static class FeatureEndpoints
{
    public static RouteGroupBuilder MapFeatureEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/features", GetEnabledFeaturesAsync)
            .WithName("GetEnabledFeatures")
            .WithTags("Features");

        return api;
    }

    private static async Task<IResult> GetEnabledFeaturesAsync(IFeatureManager featureManager)
    {
        var enabled = new List<string>();
        foreach (var feature in FeatureFlags.All)
        {
            if (await featureManager.IsEnabledAsync(feature))
            {
                enabled.Add(feature);
            }
        }

        return Result.Success(new EnabledFeaturesResponse(enabled)).ToHttpResult();
    }

    internal sealed record EnabledFeaturesResponse(IReadOnlyList<string> Enabled);
}
