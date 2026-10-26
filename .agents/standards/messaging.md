---
title: Messaging and Event-Driven Standards
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Introducing or changing in-process messaging, domain/integration events, or webhook ingestion.
disposition: >
  keep — pattern-selection judgement; outbox/webhook-signature rules are candidates for an integration
  test once a concrete messaging path exists.
last-reviewed: 2026-08-17
---
# Messaging and Event-Driven Standards

This document covers the conventions and patterns for in-process messaging (MediatR), domain and integration events, reliable event publishing, and webhook ingestion. It focuses on the patterns that are immediately relevant to this project's architecture. Event bus topology, saga and process manager patterns, event sourcing, and exactly-once delivery guarantees are intentionally deferred — they should be specified when a project's requirements make them concrete.

---

## The Mediator Pattern (MediatR)

MediatR is used in the Application layer to implement Commands, Queries, and Notifications. It decouples the caller from the handler and enables pipeline behaviors to be applied consistently across all operations.

### Request Types

| Type | Purpose | Returns |
|---|---|---|
| `IRequest<TResponse>` | Command or query with a result | `TResponse` (use `Result<T>` for fallible operations) |
| `IRequest` | Command with no meaningful return value | Nothing (use sparingly — prefer `Result` even for void commands) |
| `INotification` | Domain event notification — dispatched to zero or more handlers | Nothing |

Commands and queries both use `IRequest<TResponse>`. The distinction between them is structural and semantic — enforced by folder placement (`Commands/` vs `Queries/`) and naming (`PlaceOrderCommand`, `GetOrderByIdQuery`), not by a different MediatR interface.

`INotification` is for domain events dispatched within the same process. Do not use `INotification` for integration events that cross process boundaries — those are handled by the outbox pattern (see below).

### Pipeline Behaviors

Pipeline behaviors wrap every `IRequest` handler in a consistent cross-cutting concern. They are registered in order and execute as a nested pipeline — the first registered behavior is the outermost wrapper.

Standard behavior registration order (outermost to innermost):

```
LoggingBehavior
  → ValidationBehavior
    → TransactionBehavior
      → Handler
```

1. **LoggingBehavior** — logs the request name, execution duration, and outcome. Outermost so that every request is logged regardless of whether validation or the handler fails.

2. **ValidationBehavior** — runs FluentValidation validators registered for the request type. Returns a validation failure result before the handler is reached if validation fails. This is the fail-fast gate for input correctness.

3. **TransactionBehavior** — wraps the handler in a database transaction for commands. Commits on success; rolls back on exception. Applied to commands only — queries do not require transaction wrapping.

Behaviors live in `Application/Behaviors/`. Each behavior implements `IPipelineBehavior<TRequest, TResponse>`. Do not put business logic in behaviors — they are cross-cutting infrastructure, not domain logic.

---

## Domain Events vs Integration Events

These two event types are often confused. They have different purposes, different lifetimes, and different dispatch mechanisms. Using the wrong one for a given scenario creates reliability problems that are difficult to diagnose.

### Domain Events

A domain event is a fact that occurred within an aggregate, consumed within the same process and the same logical transaction. It is an internal signal — nothing outside the service boundary observes it directly.

- Raised by an aggregate root when a meaningful state change occurs.
- Named in the past tense after the domain concept: `InvoiceSubmitted`, `OrderPlaced`, `PaymentFailed`.
- Implemented as `INotification` and dispatched via MediatR.
- Consumed by `INotificationHandler<T>` implementations within the same Application layer.
- **Dispatched after the transaction commits** — not before, not during. Dispatching before commit means a handler may react to a state change that is later rolled back. The aggregate collects events during its operation; they are dispatched once `SaveChangesAsync` succeeds.

```csharp
// Aggregate raises the event during a state transition
public void Submit()
{
    // ... business logic and invariant checks ...
    Status = InvoiceStatus.Submitted;
    RaiseDomainEvent(new InvoiceSubmitted(Id, SubmittedAt));
}

// In ApplicationDbContext.SaveChangesAsync — dispatch after commit
var events = ChangeTracker.Entries<Entity>()
    .SelectMany(e => e.Entity.DomainEvents)
    .ToList();

await base.SaveChangesAsync(cancellationToken);

foreach (var domainEvent in events)
    await _mediator.Publish(domainEvent, cancellationToken);
```

### Integration Events

An integration event crosses a process or service boundary. It is published to an external message bus, queue, or broker and consumed by a different service, a background worker, or a third-party subscriber.

- Named in the past tense with enough context to be unambiguous outside the originating service: `Payments.InvoiceSubmitted`, `Orders.OrderPlaced`.
- **Never dispatched directly from domain logic.** The domain raises a domain event; an application-layer handler for that domain event writes the integration event to the outbox.
- Consumers of integration events must be idempotent — message buses guarantee at-least-once delivery, not exactly-once. A consumer that receives the same event twice must produce the same outcome both times.
- Integration event payloads carry only what consumers need — not the full domain entity. Include identifiers and the facts that changed. Do not include sensitive data that consumers have no business knowing.

---

## The Outbox Pattern

Publishing an integration event and persisting a state change are two separate operations. If the state change commits but the event dispatch fails, the system is silently inconsistent. The outbox pattern makes event publishing atomic with the database transaction, eliminating this class of reliability failure.

### How It Works

1. Within the same database transaction that persists the state change, write a serialised record of the integration event to an `OutboxMessage` table.
2. Commit. The state change and the outbox record either both persist or both do not.
3. A background processor (Hangfire, Quartz, or a hosted service) polls the outbox for unprocessed messages, dispatches them to the message bus, and marks them as processed.

```csharp
// OutboxMessage — persisted within the business transaction
public class OutboxMessage
{
    public Guid Id { get; init; }
    public string Type { get; init; }       // Fully qualified event type name
    public string Payload { get; init; }    // Serialised event (JSON)
    public DateTime CreatedAt { get; init; }
    public DateTime? ProcessedAt { get; set; }
    public string? Error { get; set; }
}
```

The outbox processor dispatches messages in order, retries on transient failure, and records errors for messages that repeatedly fail. Failed messages must not silently disappear — surface them for inspection.

### Idempotency

Because the outbox processor may deliver a message more than once (on retry after a partial failure), every integration event consumer must be idempotent. Track processed message IDs and ignore duplicates. This is the consumer's responsibility, not the publisher's.

### EF Core Integration

The most common implementation intercepts `SaveChangesAsync` to convert pending domain events into outbox records within the same transaction:

```csharp
// In ApplicationDbContext or via an EF Core interceptor
public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
{
    var outboxMessages = ChangeTracker.Entries<Entity>()
        .SelectMany(e => e.Entity.DomainEvents)
        .Select(domainEvent => new OutboxMessage
        {
            Id = Guid.NewGuid(),
            Type = domainEvent.GetType().AssemblyQualifiedName!,
            Payload = JsonSerializer.Serialize(domainEvent, domainEvent.GetType()),
            CreatedAt = DateTime.UtcNow
        })
        .ToList();

    if (outboxMessages.Any())
        OutboxMessages.AddRange(outboxMessages);

    return await base.SaveChangesAsync(cancellationToken);
}
```

Domain events are cleared from the aggregate after being converted to outbox records. The MediatR dispatch of domain event notifications to in-process handlers happens after this save, as described in the Domain Events section above.

### Database Placement

The outbox table lives in the **same database** as the application's business tables. This is not a preference — it is a correctness requirement. A separate database would require a distributed transaction to guarantee that the outbox write and the business state change commit atomically. Distributed transactions are complex, fragile, and defeat the purpose of the pattern. Same database, isolated table.

### Indexing

The outbox processor queries only unprocessed records. Without a partial index, that query scans the entire table, including the full history of processed records. With a partial index, it scans only the live queue — query cost is proportional to the unprocessed backlog, not total table size.

This index is required and must be present from the initial migration:

```sql
CREATE INDEX idx_outbox_unprocessed
    ON outbox_messages (created_at)
    WHERE processed_at IS NULL;
```

With this index in place and a healthy processor (backlog stays small), the outbox table scales well under normal to moderate throughput without further intervention.

### Long-Term Maintenance Considerations

The following are not decisions that need to be made now, but they should be understood and revisited as the application grows. The conventions enforced above determine what options are available later.

**Processed record accumulation.** If processed records are never removed, the table grows indefinitely. Index maintenance and VACUUM overhead increase over time. The right response depends on whether the audit trail has value:

- **Delete after processing** — keeps the table and its index compact. The audit trail is preserved elsewhere (the message bus log, an event store, or structured application logs) if needed. This is the recommended default.
- **Archive after processing** — processed records are moved to a cold table or exported to blob storage on a schedule. Preserves the full history without burdening the hot table. Appropriate when the raw event payload needs to be queryable for compliance, debugging, or replay.
- **Partition by date** — PostgreSQL table partitioning allows old partitions to be detached and dropped cheaply without full-table operations or row-by-row deletes. Appropriate at high throughput where delete overhead itself becomes a concern. Requires deliberate schema design from the start — retrofitting partitioning is possible but disruptive.

Whichever strategy is chosen, implement it before the table becomes a problem. Waiting until it is large makes all options more expensive.

**Payload size.** PostgreSQL handles values larger than roughly 2 KB transparently via TOAST — they are stored out-of-line without requiring any application changes. For moderate payload sizes this imposes no meaningful overhead. For consistently large payloads (verbose third-party webhook bodies, for example), consider storing a reference to blob storage and fetching the payload at dispatch time rather than embedding it in the outbox record. This adds complexity and should only be considered when payload size is measured and confirmed as a real constraint.

The more effective control is keeping integration event payloads lean by design — include what consumers need to act, not the full entity state. This is already required by the standard above and is the first line of defence against payload bloat.

**Processor concurrency.** A single outbox processor is sufficient for low to moderate throughput. If processing latency becomes a concern under load, multiple concurrent processors can be introduced, but they must coordinate to avoid processing the same record twice. This can be handled with a `SELECT ... FOR UPDATE SKIP LOCKED` query pattern when claiming records for processing.

---

## Event Naming

Both domain events and integration events are named in the past tense — they describe something that happened, not something being requested.

| Event Type | Convention | Examples |
|---|---|---|
| Domain event | `{Noun}{PastVerb}` | `InvoiceSubmitted`, `OrderPlaced`, `PaymentFailed` |
| Integration event | `{Domain}.{Noun}{PastVerb}` | `Payments.InvoiceSubmitted`, `Orders.OrderPlaced` |

The domain prefix on integration events (`Payments.InvoiceSubmitted`) prevents naming collisions across services and makes the origin unambiguous to consumers who subscribe to multiple event streams.

Event class names may append `DomainEvent` or `IntegrationEvent` as a suffix where the distinction needs to be explicit in code: `InvoiceSubmittedDomainEvent`, `InvoiceSubmittedIntegrationEvent`. Use this where both types coexist in the same namespace and the suffix aids clarity; omit it where the location (folder, namespace) already makes the type clear.

---

## Webhook Ingestion

Webhooks from third-party providers (payment gateways, messaging platforms, identity providers) arrive as inbound HTTP requests. They require careful handling on two dimensions: security and reliability.

### Signature Verification

Every webhook provider that supports request signing must have its signature verified before the payload is processed. Processing an unverified payload is a security vulnerability — a malicious caller can send arbitrary data to the endpoint and trigger application logic.

Signature verification must happen at the controller level, before the request body is deserialised or passed to any handler. If verification fails, return **400 Bad Request** and do not process the payload.

```csharp
[HttpPost("webhooks/payments")]
[AllowAnonymous] // Authenticated via provider signature, not bearer token
public async Task<IActionResult> ReceivePaymentWebhook()
{
    var payload = await ReadRawBodyAsync(); // Read raw bytes — signature is computed over the raw body
    var signature = Request.Headers["X-Provider-Signature"];

    if (!_webhookVerifier.IsValid(payload, signature))
        return BadRequest();

    // Enqueue for asynchronous processing — do not process inline
    await _mediator.Send(new EnqueueWebhookCommand(payload));
    return Ok();
}
```

Signature verification details vary by provider (HMAC-SHA256 is common). The verification secret must come from application configuration — never hardcoded.

### Acknowledge Immediately, Process Asynchronously

Return a 200 response to the provider as quickly as possible. Webhook providers impose short response timeouts (typically 5–30 seconds) and will retry if the endpoint does not respond in time. Retries can cause duplicate processing.

The controller's only job is to verify the signature and enqueue the payload. The actual processing happens in a background handler. This also means that failures in business logic do not cause the provider to retry unnecessarily — the webhook was received correctly; the processing failure is an internal concern.

### Idempotency

Webhook providers guarantee at-least-once delivery — the same event may arrive more than once, especially after retries. Webhook handlers must be idempotent. Use the provider's event ID (present in the payload or headers for most providers) to detect and skip duplicate deliveries.

### Security Posture for Webhook Endpoints

Webhook endpoints are `[AllowAnonymous]` at the bearer token level — the caller is a third-party service that cannot present a user token. Authentication is instead performed via signature verification. This must be documented clearly on the endpoint, and the `[AllowAnonymous]` attribute must not be applied without the corresponding signature verification in place.

---

## Deferred Topics

The following patterns are intentionally not specified here. They should be documented as ADRs and expanded in this file when a project's requirements make them concrete:

- **Event bus topology** — topics, subscriptions, consumer groups, fanout vs. point-to-point routing
- **Saga and process manager patterns** — long-running workflows coordinated across multiple services
- **Event sourcing** — using the event log as the primary store rather than current state
- **Exactly-once delivery guarantees** — transactional outbox variants, distributed transaction coordination
- **Dead letter queue handling** — policies and alerting for messages that exhaust retry attempts
- **Schema registry and event versioning** — managing backward and forward compatibility of event payloads across deployments
