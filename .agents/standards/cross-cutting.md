---
title: Cross-Cutting Concerns
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Writing concurrent code, or adding/changing logging.
disposition: >
  keep — judgement-dependent concurrency and logging discipline; not naturally expressible as a single
  mechanical check.
last-reviewed: 2026-08-17
---
# Cross-Cutting Concerns

## Concurrency Rules

- Use optimistic concurrency by default.
- Use transactional boundaries for financial operations.

---

## Logging Rules

Logging is a tool for increasing visibility where it matters — not a habit to apply indiscriminately. Log storage is not free. A log full of noise is harder to use than a sparse log with high-signal entries. Every log statement should answer the question: "Does someone need to know this happened?"

**Use structured logging.** Prefer named properties over interpolated strings:

```csharp
// Correct — queryable, parseable
_logger.LogInformation("Order {OrderId} placed by customer {CustomerId}", orderId, customerId);

// Avoid — produces a flat string, cannot be filtered or aggregated by field
_logger.LogInformation($"Order {orderId} placed by customer {customerId}");
```

Structured logs can be queried, aggregated, and alerted on by field. Interpolated strings cannot.

**Use the appropriate log level.** Log levels are not decoration — they determine routing, storage cost, and alerting thresholds:

| Level | Use for |
|---|---|
| `Trace` | Extremely fine-grained diagnostics; disabled in all but local debugging. |
| `Debug` | Diagnostic detail useful during development or targeted investigation; disabled in production by default. |
| `Information` | Significant business events and state transitions: an order placed, a payment processed, a user authenticated. |
| `Warning` | Recoverable unexpected conditions: a retry was needed, a fallback was used, a configuration value was missing but has a safe default. |
| `Error` | Failures that require attention and cannot be self-corrected: an unhandled exception, a failed integration call that has exhausted retries, a required resource that is unavailable. |
| `Critical` | Imminent system failure or unrecoverable state requiring immediate intervention. |

**Do not log expected failures as errors.** A validation failure, a not-found result, or a business rule rejection is expected behavior — part of the domain model. Logging it as an error fills the error log with noise and makes genuine errors harder to find. Log expected failures at `Debug` or `Information` if they need to be logged at all. If the same failure is happening at unexpected rates, that is surfaced by metrics, not by log level inflation.

**Log at the boundary, not throughout the call stack.** When an operation fails, log it once — at the point where it crosses a system boundary or produces a visible outcome. Do not log the same failure at every level of the call stack. Repeated log entries for the same event waste storage and confuse incident investigation.

**Do not log sensitive data.** Structured logging makes it easy to accidentally capture sensitive values as named properties. Never log passwords, authentication tokens, API keys, payment card information, or personally identifiable information. If a request body needs to be logged for diagnostics, scrub it before logging or log only the fields that are safe.

**Log integrations and significant external interactions.** Calls to external APIs, message queue publishes, background job completions, and webhook receipts are valuable to have in the log — they cross a trust boundary and are not always reproducible. Log them with enough context (correlation ID, relevant identifiers, outcome) to reconstruct what happened.
