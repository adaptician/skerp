using Skerp.Domain.Customers;
using Skerp.Domain.Products;
using Skerp.Domain.Shared;
using Skerp.Domain.Shared.Normalization;

namespace Skerp.Domain.PurchaseOrders;

/// <summary>
/// A customer's purchase order: the aggregate root for its line items and status history. Its
/// reference and customer never change after creation, and its total always comes from
/// <see cref="PurchaseOrderCalculator"/>.
/// </summary>
public sealed class PurchaseOrder : MinimumAudit<Guid>
{
    public const int MinLineItems = 1;
    public const int MaxLineItems = 100;
    public const int NotesMaxLength = 512;

    private readonly List<PurchaseOrderLineItem> _lineItems = [];
    private readonly List<PurchaseOrderStatusChange> _statusChanges = [];

    private PurchaseOrder()
    {
    }

    public required string Reference { get; init; }

    public required Guid CustomerId { get; init; }

    public Customer? Customer { get; private set; }

    public CurrencyId CurrencyId { get; private set; }

    public StatusId CurrentStatusId { get; private set; }

    public decimal Total { get; private set; }

    public string? Notes { get; private set; }

    public IReadOnlyList<PurchaseOrderLineItem> LineItems => _lineItems;

    public IReadOnlyList<PurchaseOrderStatusChange> StatusChanges => _statusChanges;

    /// <summary>
    /// A new Pending order for <paramref name="customer"/>. The reference is normalised (rule 1), the
    /// lines are validated and totalled, and the initial status is recorded at <paramref name="utcNow"/>.
    /// </summary>
    public static Result<PurchaseOrder> Create(
        string? reference,
        Customer customer,
        CurrencyId currencyId,
        string? notes,
        IReadOnlyList<NewLineItem> lines,
        DateTimeOffset utcNow)
    {
        var normalizedReference = ReferenceNormalizer.Normalize(reference);
        if (normalizedReference.IsFailure)
        {
            return normalizedReference.Error;
        }

        if (!Enum.IsDefined(currencyId))
        {
            return PurchaseOrderErrors.InvalidCurrency;
        }

        var normalizedNotes = NormalizeNotes(notes);
        if (normalizedNotes.IsFailure)
        {
            return normalizedNotes.Error;
        }

        if (lines.Count is < MinLineItems or > MaxLineItems)
        {
            return PurchaseOrderErrors.InvalidLineItemCount;
        }

        var order = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            Reference = normalizedReference.Value,
            CustomerId = customer.Id,
            Customer = customer,
            CurrencyId = currencyId,
            Notes = normalizedNotes.Value,
        };

        foreach (var line in lines)
        {
            var lineItem = PurchaseOrderLineItem.Create(order.Id, line.Product, line.Quantity, line.Price);
            if (lineItem.IsFailure)
            {
                return lineItem.Error;
            }

            order._lineItems.Add(lineItem.Value);
        }

        order.Total = PurchaseOrderCalculator.GrandTotal(order._lineItems.Select(l => l.Total));
        PurchaseOrderStatusContext.Start(order, utcNow);

        return order;
    }

    /// <summary>
    /// Edits a Pending order (brief → Purchase Order Edit): the currency, the notes and the lines.
    /// A revision with a line id changes that line's quantity and price; one without adds a line; the
    /// order's lines absent from <paramref name="lines"/> are removed. The added and removed lines are
    /// returned so persistence can insert the one and soft-delete the other. Unchanged values are not
    /// reassigned, and the total is recalculated only when a line changed.
    /// </summary>
    public Result<Revision> Revise(
        CurrencyId currencyId,
        string? notes,
        IReadOnlyList<LineRevision> lines)
    {
        var editable = PurchaseOrderStatusContext.For(this).EnsureEditable();
        if (editable.IsFailure)
        {
            return editable.Error;
        }

        if (!Enum.IsDefined(currencyId))
        {
            return PurchaseOrderErrors.InvalidCurrency;
        }

        var normalizedNotes = NormalizeNotes(notes);
        if (normalizedNotes.IsFailure)
        {
            return normalizedNotes.Error;
        }

        if (lines.Count is < MinLineItems or > MaxLineItems)
        {
            return PurchaseOrderErrors.InvalidLineItemCount;
        }

        var keptIds = lines.Where(l => l.LineItemId.HasValue).Select(l => l.LineItemId!.Value).ToList();
        if (keptIds.Distinct().Count() != keptIds.Count)
        {
            return PurchaseOrderErrors.DuplicateLineItem;
        }

        var existing = _lineItems.ToDictionary(l => l.Id);
        if (keptIds.Any(id => !existing.ContainsKey(id)))
        {
            return PurchaseOrderErrors.UnknownLineItem;
        }

        // Every line is validated before anything changes, so a refusal leaves the order as it was.
        var additions = new List<PurchaseOrderLineItem>();
        foreach (var line in lines)
        {
            if (line.LineItemId is null)
            {
                var added = PurchaseOrderLineItem.Create(Id, line.Product!, line.Quantity, line.Price);
                if (added.IsFailure)
                {
                    return added.Error;
                }

                additions.Add(added.Value);
            }
            else if (!PurchaseOrderLineItem.IsValidQuantity(line.Quantity))
            {
                return PurchaseOrderErrors.InvalidQuantity;
            }
            else if (!PurchaseOrderLineItem.IsValidPrice(line.Price))
            {
                return PurchaseOrderErrors.InvalidPrice;
            }
        }

        var linesChanged = additions.Count > 0;
        foreach (var line in lines.Where(l => l.LineItemId.HasValue))
        {
            linesChanged |= existing[line.LineItemId!.Value].Revise(line.Quantity, line.Price).Value;
        }

        var removed = _lineItems.Where(l => !keptIds.Contains(l.Id)).ToList();
        foreach (var line in removed)
        {
            _lineItems.Remove(line);
        }

        _lineItems.AddRange(additions);
        linesChanged |= removed.Count > 0;

        if (CurrencyId != currencyId)
        {
            CurrencyId = currencyId;
        }

        if (Notes != normalizedNotes.Value)
        {
            Notes = normalizedNotes.Value;
        }

        if (linesChanged)
        {
            var total = PurchaseOrderCalculator.GrandTotal(_lineItems.Select(l => l.Total));
            if (Total != total)
            {
                Total = total;
            }
        }

        return new Revision(additions, removed);
    }

    /// <summary>
    /// Sets the current status and appends it to the audit history. Only
    /// <see cref="PurchaseOrderStatusContext"/> holds the ticket this requires.
    /// </summary>
    internal void RecordStatus(PurchaseOrderStatusContext.StatusTicket ticket)
    {
        CurrentStatusId = ticket.StatusId;
        _statusChanges.Add(PurchaseOrderStatusChange.Create(Id, ticket.StatusId, ticket.UtcNow));
    }

    private static Result<string?> NormalizeNotes(string? notes)
    {
        var trimmed = notes?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return Result.Success<string?>(null);
        }

        return trimmed.Length > NotesMaxLength
            ? Result.Failure<string?>(PurchaseOrderErrors.NotesTooLong)
            : Result.Success<string?>(trimmed);
    }

    /// <summary>
    /// A line on an edit: an existing line by <see cref="LineItemId"/> (its product unchanged), or a new
    /// line for <see cref="Product"/>.
    /// </summary>
    public sealed record LineRevision(Guid? LineItemId, Product? Product, int Quantity, decimal Price);

    /// <summary>The lines an edit added and removed.</summary>
    public sealed record Revision(IReadOnlyList<PurchaseOrderLineItem> Added, IReadOnlyList<PurchaseOrderLineItem> Removed);

    /// <summary>A line to add: the product (existing or new), the quantity and the unit price.</summary>
    public sealed record NewLineItem(Product Product, int Quantity, decimal Price);
}
