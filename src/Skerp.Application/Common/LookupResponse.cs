namespace Skerp.Application.Common;

/// <summary>The <c>{ data: [...] }</c> shape every lookup returns (api.md → Customer and Product API).</summary>
public sealed record LookupResponse<TItem>(IReadOnlyList<TItem> Data);
