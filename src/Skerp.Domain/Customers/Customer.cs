using System.Net.Mail;
using Skerp.Domain.Shared;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Domain.Customers;

/// <summary>
/// A customer orders are placed for. Created with the first order that names a new customer; its
/// name is unique case-insensitively and its email is never edited through an order.
/// </summary>
public sealed class Customer : MinimumAudit<Guid>
{
    public const int NameMinLength = 3;
    public const int NameMaxLength = 128;
    public const int EmailMinLength = 5;
    public const int EmailMaxLength = 128;

    private Customer()
    {
    }

    public required string Name { get; init; }

    public required string Email { get; init; }

    /// <summary>Normalises the name (rule 2) and validates the name and email.</summary>
    public static Result<Customer> Create(string? name, string? email)
    {
        var normalizedName = NormalizeName(name);
        if (normalizedName.IsFailure)
        {
            return normalizedName.Error;
        }

        var trimmedEmail = email?.Trim() ?? string.Empty;
        if (!IsValidEmail(trimmedEmail))
        {
            return CustomerErrors.InvalidEmail;
        }

        return new Customer { Id = Guid.NewGuid(), Name = normalizedName.Value, Email = trimmedEmail };
    }

    /// <summary>Normalises a customer name (rule 2) and checks it is 3–128 characters long.</summary>
    public static Result<string> NormalizeName(string? name)
    {
        var normalizedName = NameNormalizer.Normalize(name);
        if (normalizedName.Length == 0)
        {
            return CustomerErrors.NameRequired;
        }

        return normalizedName.Length is < NameMinLength or > NameMaxLength
            ? CustomerErrors.NameInvalidLength
            : normalizedName;
    }

    /// <summary>
    /// A single address with a local part, an <c>@</c> and a dotted domain, within the length limits.
    /// </summary>
    public static bool IsValidEmail(string email) =>
        email.Length is >= EmailMinLength and <= EmailMaxLength
        && !email.Any(char.IsWhiteSpace)
        && MailAddress.TryCreate(email, out var address)
        && address.Address == email
        && address.Host.Contains('.', StringComparison.Ordinal)
        && !address.Host.EndsWith('.');
}
