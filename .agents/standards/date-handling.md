---
title: Date and Time Handling
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Representing, transmitting, or persisting a date or time value, in any layer.
disposition: >
  mechanise — an analyzer/lint rule banning ambient-clock calls (e.g. bare `DateTime.Now`) in favour of
  an injected clock is a strong candidate once the stack is chosen.
last-reviewed: 2026-08-17
---
# Date and Time Handling

This standard defines how dates and times are represented, transmitted, and persisted across the stack. Inconsistent timezone handling is a common source of subtle, hard-to-reproduce bugs — this document eliminates ambiguity by establishing a single rule for each layer.

The principle underlying all rules here: **UTC is the canonical representation for storage and logic; local time is a presentation concern, applied as late as possible and only on the client.**

---

## Core Rules

1. **Persist in UTC.** Every timestamp written to the database is UTC. No exceptions.
2. **Execute domain logic in UTC.** All comparisons, calculations, and business rules operate on UTC values.
3. **Normalize at the API boundary on ingress.** When a request carries a timezone offset, the API normalizes to UTC before the value enters application or domain logic. The client must not be relied upon to do this.
4. **Convert to local time on the client, for display only.** The client converts UTC to the user's local timezone at the point of rendering. This conversion is never sent back to the API.

---

## Backend (C#)

### Use `DateTimeOffset`, Not `DateTime`

Always use `DateTimeOffset` for date/time values. `DateTime` carries no timezone information and its `Kind` property (`Unspecified`, `Local`, `Utc`) is not enforced — it relies on convention, not the type system. `DateTimeOffset` embeds the UTC offset, making the intent unambiguous and preventing silent timezone errors when values cross process or serialization boundaries.

```csharp
// Correct
public DateTimeOffset CreatedAt { get; init; }
public DateTimeOffset? CompletedAt { get; init; }

// Incorrect — Kind is unenforceable convention
public DateTime CreatedAt { get; init; }
```

EF Core maps `DateTimeOffset` to the database's timestamp-with-offset or UTC-normalizing column type. For PostgreSQL, use `timestamptz` (timestamp with time zone), which stores UTC and applies session timezone on read — always configure the EF Core provider to normalize to UTC.

### Capture the Current Time via `IDateTimeOffsetProvider`

Never call `DateTimeOffset.UtcNow` directly in application or domain code. Inject an `IDateTimeOffsetProvider` (or equivalent clock abstraction) so that time can be controlled in tests and in a running environment without monkey-patching statics.

```csharp
public interface IDateTimeOffsetProvider
{
    DateTimeOffset UtcNow { get; }
}
```

Inject and consume:

```csharp
public sealed class InvoiceService
{
    private readonly IDateTimeOffsetProvider _clock;

    public InvoiceService(IDateTimeOffsetProvider clock)
    {
        _clock = clock;
    }

    public Invoice Create(...)
    {
        return new Invoice(id, _clock.UtcNow, ...);
    }
}
```

Direct calls to `DateTimeOffset.UtcNow` or `DateTime.UtcNow` are only acceptable in infrastructure implementations of the clock abstraction itself.

### Clock Implementations

Two implementations are registered depending on configuration. Both satisfy `IDateTimeOffsetProvider`; the DI container resolves the correct one at startup.

**`SystemDateTimeOffsetProvider`** — the production implementation. Returns the real system time.

```csharp
public sealed class SystemDateTimeOffsetProvider : IDateTimeOffsetProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
```

**`ConfigurableDateTimeOffsetProvider`** — reads from `SystemTime` configuration. When `OverrideEnabled` is `true`, it returns the configured fixed time. When `false`, it delegates to the real system time. This allows any workflow to be tested against a specific point in time in a running environment without data manipulation.

```json
// appsettings.Development.json
"SystemTime": {
  "OverrideEnabled": true,
  "UtcNow": "2026-05-30T00:00:00Z"
}
```

```csharp
public sealed class SystemTimeSettings
{
    public const string SectionName = "SystemTime";

    public bool OverrideEnabled { get; set; }

    /// <summary>
    /// The fixed UTC time to return when <see cref="OverrideEnabled"/> is true.
    /// Must be a valid ISO 8601 UTC string (e.g. "2026-05-30T00:00:00Z").
    /// </summary>
    public DateTimeOffset? UtcNow { get; set; }
}

public sealed class ConfigurableDateTimeOffsetProvider : IDateTimeOffsetProvider
{
    private readonly SystemTimeSettings _settings;

    public ConfigurableDateTimeOffsetProvider(IOptions<SystemTimeSettings> settings)
    {
        _settings = settings.Value;
    }

    public DateTimeOffset UtcNow
    {
        get
        {
            if (_settings.OverrideEnabled)
            {
                if (_settings.UtcNow is null)
                    throw new InvalidOperationException(
                        "SystemTime:OverrideEnabled is true but SystemTime:UtcNow is not set.");

                return _settings.UtcNow.Value.ToUniversalTime();
            }

            return DateTimeOffset.UtcNow;
        }
    }
}
```

**Registration** — the configurable provider is registered in all non-production environments. Production always uses the system clock. Because both implement `IDateTimeOffsetProvider`, no consuming code is aware of the difference.

```csharp
services.Configure<SystemTimeSettings>(
    configuration.GetSection(SystemTimeSettings.SectionName));

if (builder.Environment.IsProduction())
{
    services.AddSingleton<IDateTimeOffsetProvider, SystemDateTimeOffsetProvider>();
}
else
{
    services.AddSingleton<IDateTimeOffsetProvider, ConfigurableDateTimeOffsetProvider>();
}
```

**Unit tests** — use a simple fixed-time stub rather than either infrastructure implementation. No configuration file is needed in tests.

```csharp
public sealed class FixedDateTimeOffsetProvider : IDateTimeOffsetProvider
{
    public FixedDateTimeOffsetProvider(DateTimeOffset utcNow) => UtcNow = utcNow;

    public DateTimeOffset UtcNow { get; }
}

// In a test
var clock = new FixedDateTimeOffsetProvider(new DateTimeOffset(2026, 5, 30, 0, 0, 0, TimeSpan.Zero));
var service = new InvoiceService(clock, ...);
```

The three implementations — system, configurable, and fixed test stub — cover the full range of clock control needs without any implementation leaking into another layer.

### Normalize on API Ingress

When a request DTO carries a `DateTimeOffset` with a non-UTC offset, convert it to UTC at the application service boundary — before it reaches domain logic or persistence. Do not rely on the client having sent UTC; a client that sends a value with an offset is giving you valid information that you must normalize yourself.

```csharp
// Request DTO — accepts any valid DateTimeOffset (client timezone is fine)
public sealed record CreateScheduledPaymentRequest
{
    public DateTimeOffset ScheduledFor { get; init; }
}

// Application layer — normalize before domain use
var scheduledForUtc = request.ScheduledFor.ToUniversalTime();
```

`ToUniversalTime()` converts any `DateTimeOffset` to UTC regardless of the offset it carries. A value that is already UTC passes through unchanged. Apply this at the application service, not inside the domain model — the domain should receive UTC values and need not be defensive about it.

### Do Not Accept `DateTime` in Request DTOs

`DateTime` deserialized from JSON has `Kind = Unspecified` unless the serializer applies heuristics. This is a silent hazard. Use `DateTimeOffset` in all request and response DTOs to ensure the offset is always present and the normalization step above is always meaningful.

```csharp
// Correct — offset is always present
public DateTimeOffset ScheduledFor { get; init; }

// Incorrect — Kind will be Unspecified after deserialization
public DateTime ScheduledFor { get; init; }
```

### Entity Configuration

Timestamp columns in EF Core entity configurations must be declared without additional conversion — `DateTimeOffset` persisted to a UTC-normalizing column type requires no extra value converter. Confirm the provider configuration enforces UTC normalization at startup rather than relying on per-column workarounds.

```csharp
builder.Property(i => i.CreatedAt)
    .HasColumnName("created_at")
    .IsRequired();
// No value converter needed — provider is configured to store DateTimeOffset as UTC
```

---

## API Contract

### ISO 8601 with Offset

All date/time values in request and response payloads must be formatted as ISO 8601 strings with an explicit UTC offset. The `Z` suffix (shorthand for `+00:00`) is the preferred form for UTC values in responses. Requests may carry any valid offset — the API normalizes them.

```
// UTC — preferred in responses
"createdAt": "2024-08-15T09:30:00Z"

// With offset — valid in requests; API normalizes to UTC
"scheduledFor": "2024-08-15T11:30:00+02:00"

// Incorrect — no offset, ambiguous
"scheduledFor": "2024-08-15T09:30:00"
```

Reject requests where a date/time field carries no offset and the correct timezone cannot be inferred from context. A value without an offset is ambiguous; the API must not guess.

### Responses Always Carry UTC

Response DTOs always express date/time values in UTC (`Z` suffix). The client is responsible for converting to local time for display. Returning local or offset-adjusted timestamps in responses tightly couples the server to a specific timezone assumption and creates inconsistency when clients operate in different regions.

```json
{
  "id": "inv_abc123",
  "createdAt": "2024-08-15T09:30:00Z",
  "dueDate": "2024-09-15T00:00:00Z"
}
```

---

## Frontend (Angular)

### Convert to Local Time for Display Only

UTC values received from the API are converted to the user's local timezone only at the point of rendering — in templates, display pipes, or view models. They must never be converted before being passed to a service or sent back to the API.

```typescript
// Correct — pipe applies local conversion in the template only
{{ invoice.createdAt | date:'medium' }}

// Incorrect — converting before passing to a service
const localTime = new Date(invoice.createdAt).toLocaleString();
this.invoiceService.update({ ...invoice, createdAt: localTime });
```

Angular's built-in `DatePipe` uses the browser's local timezone by default and accepts ISO 8601 UTC strings directly. This is sufficient for most display scenarios.

For complex formatting needs (relative time, custom timezone display, date arithmetic), use a single, project-approved date utility library — either **Luxon** or **date-fns** with `date-fns-tz**. Do not mix multiple date libraries. Establish the choice as a project dependency and do not import both.

### Never Convert Before Sending to the API

When constructing a request payload containing a date/time value, always send the original UTC string received from the API, or an ISO 8601 string with an explicit UTC offset constructed from user input. Do not convert to a local `Date` object and re-serialize it — JavaScript's `Date.toISOString()` does produce UTC, but intermediate `Date` construction from a local string is error-prone and unnecessary.

```typescript
// Correct — send UTC string as received or from a UTC-aware picker
const payload = {
  scheduledFor: this.form.value.scheduledFor.toISOString(), // UTC ISO string from a Date
};

// Incorrect — localizing before sending
const localDate = new Date(utcString);
const payload = {
  scheduledFor: localDate.toLocaleString(), // ambiguous, no offset
};
```

### Date Picker Input

When a date/time picker collects user input, the user enters a value in their local time. Before including this value in an API request, convert it to a UTC ISO 8601 string. Do not send the raw local value.

```typescript
// User selects a local time — convert to UTC before the request
const localDate: Date = this.form.value.scheduledFor;
const utcIso = localDate.toISOString(); // Always UTC ("Z" suffix)

const request: CreateScheduledPaymentRequest = {
  scheduledFor: utcIso,
};
```

If the user's intent is timezone-specific — for example, scheduling an event "at 9am in Tokyo" — collect the timezone explicitly from the user and construct a full `DateTimeOffset`-equivalent ISO string (e.g. `2024-08-15T09:00:00+09:00`). The API normalizes this to UTC. Do not silently discard the user's intended timezone by converting to the browser's local zone first.

### HTTP Interceptor for Date Normalization (Optional Safeguard)

For additional defence, an HTTP interceptor may be used to verify that outgoing request payloads do not contain bare date strings (no offset). This is a safeguard — the primary responsibility for sending correct values lies with the code constructing the request.

---

## Date-Only Values

Some fields represent a date with no time component — a due date, a birth date, a period boundary. These must not be stored or transmitted as a midnight timestamp, as that conflates a date with a specific point in time and introduces timezone drift (midnight UTC is not midnight everywhere).

Use a dedicated date-only type or a constrained string format:

- **C# (.NET 6+):** Use `DateOnly` for domain properties and database columns that represent a date without time. Map it appropriately in EF Core using the `DateOnly` support added in .NET 8 EF Core, or via a value converter for earlier versions.
- **API contract:** Represent date-only values as `YYYY-MM-DD` strings (ISO 8601 calendar date). Do not use a full timestamp.
- **Angular:** Treat `YYYY-MM-DD` strings as opaque date identifiers in state and services. Parse them only at the point of display using `DatePipe` with an explicit UTC timezone to prevent the browser from interpreting the string as local midnight.

```typescript
// Correct — prevent local midnight interpretation
{{ invoice.dueDate | date:'mediumDate':'UTC' }}

// Incorrect — browser parses 'YYYY-MM-DD' as local midnight, may shift the date
{{ invoice.dueDate | date:'mediumDate' }}
```

---

## Summary

| Layer | Rule |
|---|---|
| Database | UTC timestamps only; use `timestamptz` (or equivalent) |
| C# domain / application | `DateTimeOffset` everywhere; inject `IDateTimeOffsetProvider` |
| API ingress | Normalize `DateTimeOffset` to UTC before domain logic |
| API response | UTC strings with `Z` suffix |
| Angular services / state | Store and transmit UTC strings unchanged |
| Angular templates | Convert to local time in the template, display only |
| Date pickers | Convert user-local input to UTC ISO string before sending |
| Date-only fields | `DateOnly` in C#; `YYYY-MM-DD` in API; parse as UTC on client |
