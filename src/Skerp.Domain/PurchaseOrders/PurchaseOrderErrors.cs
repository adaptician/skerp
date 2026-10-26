using Skerp.Domain.PurchaseOrders.States;
using Skerp.Domain.Shared;

namespace Skerp.Domain.PurchaseOrders;

public static class PurchaseOrderErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "PurchaseOrder.NotFound",
        "The requested purchase order was not found.");

    public static readonly Error DuplicateReferenceNumber = Error.Conflict(
        "PurchaseOrder.DuplicateReferenceNumber",
        "The provided reference number already exists.");

    public static readonly Error InvalidCurrency = Error.Validation(
        "PurchaseOrder.InvalidCurrency",
        "The selected currency is not supported.");

    public static readonly Error InitialStatusMustBePending = Error.Validation(
        "PurchaseOrder.InitialStatusMustBePending",
        "A new purchase order always starts as Pending.");

    public static readonly Error InvalidLineItemCount = Error.Validation(
        "PurchaseOrder.InvalidLineItemCount",
        $"A purchase order needs {PurchaseOrder.MinLineItems} to {PurchaseOrder.MaxLineItems} line items.");

    public static readonly Error InvalidQuantity = Error.Validation(
        "PurchaseOrder.InvalidQuantity",
        $"A line item quantity must be a whole number from {PurchaseOrderLineItem.MinQuantity} to {PurchaseOrderLineItem.MaxQuantity}.");

    public static readonly Error InvalidPrice = Error.Validation(
        "PurchaseOrder.InvalidPrice",
        "A line item price must be from 0.01 to 999 999 999.9999 with at most 4 decimals.");

    public static readonly Error NotesTooLong = Error.Validation(
        "PurchaseOrder.NotesTooLong",
        $"Notes may be at most {PurchaseOrder.NotesMaxLength} characters long.");

    public static readonly Error InvalidStatus = Error.Validation(
        "PurchaseOrder.InvalidStatus",
        "The selected status does not exist.");

    /// <summary>A refused status change, explaining what the current status allows.</summary>
    public static Error InvalidStatusTransition(IPurchaseOrderState from, StatusId to) => Error.Failure(
        "PurchaseOrder.InvalidStatusTransition",
        from.IsTerminal
            ? $"This status change is not allowed. A {from.Id} order is final and its status cannot change."
            : from.Id == to
                ? $"This status change is not allowed. The order is already {from.Id}."
                : $"This status change is not allowed. A {from.Id} order can only be {string.Join(" or ", from.NextStatuses)}.");

    public static readonly Error UnknownLineItem = Error.Validation(
        "PurchaseOrder.UnknownLineItem",
        "A line item id does not belong to this purchase order, or the line was removed.");

    public static readonly Error DuplicateLineItem = Error.Validation(
        "PurchaseOrder.DuplicateLineItem",
        "The same line item id appears more than once.");

    public static readonly Error LineItemProductChanged = Error.Validation(
        "PurchaseOrder.LineItemProductChanged",
        "An existing line item's product cannot change. Remove the line and add a new one instead.");

    public static Error NotEditable(StatusId current) => Error.Failure(
        "PurchaseOrder.NotEditable",
        $"Only Pending purchase orders can be edited. This order is {current}.");

    public static Error NotDeletable(StatusId current) => Error.Failure(
        "PurchaseOrder.NotDeletable",
        $"Only Pending purchase orders can be deleted. This order is {current}.");
}
