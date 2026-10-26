namespace Skerp.Domain.Shared;

/// <summary>
/// An expected failure: a stable, dotted <see cref="Code"/> (for example
/// <c>PurchaseOrder.NotFound</c>) and a description that is safe to show a user.
/// </summary>
public sealed record Error(string Code, string Description, ErrorType Type)
{
    /// <summary>The absence of an error, carried by a successful <see cref="Result"/>.</summary>
    public static readonly Error None = new(string.Empty, string.Empty, ErrorType.Failure);

    public static Error Failure(string code, string description) => new(code, description, ErrorType.Failure);

    public static Error Validation(string code, string description) => new(code, description, ErrorType.Validation);

    public static Error NotFound(string code, string description) => new(code, description, ErrorType.NotFound);

    public static Error Conflict(string code, string description) => new(code, description, ErrorType.Conflict);
}
