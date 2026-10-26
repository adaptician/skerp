using Skerp.Domain.Shared;

namespace Skerp.Domain.Customers;

public static class CustomerErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "Customer.NotFound",
        "The selected customer was not found.");

    public static readonly Error DuplicateName = Error.Conflict(
        "Customer.DuplicateName",
        "A customer with this name already exists. Select the existing customer instead.");

    public static readonly Error NameRequired = Error.Validation(
        "Customer.NameRequired",
        "A customer name is required.");

    public static readonly Error NameInvalidLength = Error.Validation(
        "Customer.NameInvalidLength",
        $"A customer name must be {Customer.NameMinLength} to {Customer.NameMaxLength} characters long.");

    public static readonly Error InvalidEmail = Error.Validation(
        "Customer.InvalidEmail",
        "The provided email format is invalid.");
}
