namespace Skerp.Application.Common;

/// <summary>The <c>{ data: [...], totalCount }</c> shape of a paged list (api.md → Response).</summary>
public sealed record PagedResponse<TItem>(IReadOnlyList<TItem> Data, int TotalCount);
