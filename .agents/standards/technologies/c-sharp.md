---
title: Backend — C#
tier: 1
enforced-by: [verify.mjs, review, prose-only]
applies-when: >
  Writing C# / .NET code.
disposition: >
  mechanise — the largest available prose-to-enforcement conversion once a .NET project exists:
  enabling EnableNETAnalyzers/AnalysisLevel/EnforceCodeStyleInBuild plus a project-level .editorconfig
  would enforce most of this file at build time. Nullability and warnings-as-errors are the easiest
  first step via Directory.Build.props, which verify.mjs's backend-build/backend-format checks already
  cover once such a file exists.
last-reviewed: 2026-08-17
---
# Backend — C#

C#-specific conventions for this project. The technology-agnostic server-side rules these specialise — validate every input at the boundary, never trust the client for valid state, expected-vs-unexpected failure, fail fast and loud — are in `.agents/standards/backend.md`. The general design principles (SOLID, ubiquitous language, expressive naming, Clean Architecture layering) are in `.agents/standards/principles.md` and `.agents/standards/architecture.md`. Read those first; this file describes how all of that is applied in C# specifically.

## Build enforcement

Several rules in this file and the completion checklist in `AGENTS.md` ("builds
without warnings", nullable enabled, formatting applied) are enforced by build
configuration, not left to review. Set these project-wide in `Directory.Build.props`
at the solution root so every project inherits them:

```xml
<Project>
  <PropertyGroup>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <EnableNETAnalyzers>true</EnableNETAnalyzers>
    <AnalysisLevel>latest-Recommended</AnalysisLevel>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  </PropertyGroup>
</Project>
```

- `TreatWarningsAsErrors` makes the "no new warnings" rule executable — a warning
  fails the build, which the quality gate's `dotnet build` check surfaces.
- `EnableNETAnalyzers` + `AnalysisLevel` turn on the .NET analyzers;
  `EnforceCodeStyleInBuild` makes code-style violations (driven by `.editorconfig`)
  build failures rather than IDE-only hints.
- `dotnet format --verify-no-changes` (also in the quality gate) catches formatting
  drift the build does not.

Layer-boundary rules from `.agents/standards/architecture.md` are enforced by an
architecture test (for example with NetArchTest or ArchUnitNET) asserting that inner
layers do not depend on outer ones. It lives in the test suite and runs under
`dotnet test`, so a boundary violation fails the gate like any other test.

Keep analyzer severities and naming rules in a project-level `.editorconfig` beside
the solution, where both the build and the IDE read them. The repo-root
`.editorconfig` holds only universal whitespace/encoding settings; .NET-specific
rules belong in the project's own `.editorconfig`.

---

## File Organization

- One primary public type per file. File name matches the primary type.
- Controllers and API endpoints are thin. No business logic — they translate HTTP into Application commands and queries, and translate results back into HTTP responses.
- Prefer domain objects and application services over static helper classes.
- Avoid `#region` as a substitute for decomposition. If a region feels necessary, the class is too large — split it.

## Nullable Reference Types

Enable nullable reference types project-wide via `<Nullable>enable</Nullable>` in `Directory.Build.props`. Do not toggle nullability per file with `#nullable enable` / `#nullable disable` except in extraordinary circumstances, and document the reason when you do.

- Every reference type is non-nullable by default. Declare `?` explicitly when a property, parameter, or return type can legitimately be null.
- Avoid suppressing warnings with the null-forgiving operator (`!`) except where nullability is guaranteed by context the compiler cannot see. Each suppression must be accompanied by a comment explaining why it is safe.
- Prefer `is null` / `is not null` over `== null` / `!= null` for null checks. Pattern-based checks are not overloadable and are semantically unambiguous.
- Do not propagate null through a call chain. If null at a particular point is unexpected, fail fast with a clear message. If null is a meaningful, intentional value, model it explicitly with a type that communicates that intent — do not leave it as an implicit possibility.

## Error Handling

Two categories of failure exist and must be treated differently.

**Expected failures** are anticipated outcomes of a business workflow: validation errors, not-found results, business rule violations, conflict conditions, authorization failures. These are not exceptional — they are part of the domain model. Represent them with a `Result<T>` or `Result` type. The calling code is required to inspect and handle the outcome. Do not throw exceptions for expected failures; an exception here obscures the business meaning and removes the compiler's ability to enforce handling.

**Unexpected failures** are conditions that indicate a programming error, infrastructure failure, or unrecoverable state: a null reference that the code guaranteed would never be null, database connectivity loss, data corruption. These are exceptional. Throw exceptions. Let them propagate to the application boundary where they are logged and translated into an appropriate error response.

The test to apply: "Is this an outcome a reasonable business workflow would encounter?" If yes — result. If no — exception.

### Fail Fast, Fail Loud

A failure is valuable information. The system that surfaces failures clearly is safer and more defensible than the system that masks them. Suppressing, swallowing, or working around a failure does not resolve it — it defers it to a point where it is harder to diagnose and potentially more damaging.

Do not use default values, placeholder data, or fallback behavior to avoid surfacing a failure that should be visible. Consider an application that requires a user's email address. If the address is absent, the correct response is a clear failure that names exactly what is missing. Substituting a generated placeholder — a dummy address constructed to pass validation — does not solve the problem: it writes a false value to real storage, potentially triggers real communications to a non-existent address, and makes the actual problem (the missing data) invisible until something downstream breaks in a way that is much harder to trace. The placeholder feels safe; it is not.

This applies to any value that is required but absent: do not use `0`, `""`, `Guid.Empty`, `DateTime.MinValue`, or generated stand-ins as substitutes for a failure. If the real value is required and missing, model that as a failure. The system must not pretend it has information it does not have.

**Rules:**

- Never catch and silently discard an exception (`catch (Exception) { }`). Either handle it meaningfully or let it propagate.
- Never catch and rethrow without preserving the original stack. `throw ex;` loses the original stack trace. `throw;` preserves it.
- Never use try/catch to implement expected business logic. If you find yourself catching `NotFoundException` or `ValidationException` to branch on a business condition, the code should be using a result type instead.
- Exception type names must be specific and descriptive. `OrderNotFoundException` communicates precisely what happened. `ApplicationException` communicates nothing.
- Domain exceptions belong in the Domain layer when they represent domain violations. Application-level failures (e.g. `UnauthorizedException`) belong in the Application layer. Infrastructure exceptions must be caught at the infrastructure boundary and wrapped in a domain or application exception before crossing inward — inner layers must not be exposed to infrastructure exception types.

## Return Types

- Use `Result<T>` / `Result` for operations that can fail in expected ways. The result type forces the caller to handle the failure case; it cannot be ignored without deliberate effort.
- Return the narrowest collection type that satisfies the caller's needs. Prefer `IReadOnlyList<T>` or `IReadOnlyCollection<T>` over `List<T>` when callers should not mutate the result.
- Return `IEnumerable<T>` only when the caller genuinely only needs to iterate once. Return `IReadOnlyList<T>` when indexed access or count may be needed. Choosing `IEnumerable<T>` when `IReadOnlyList<T>` is appropriate forces callers to materialize the sequence themselves, which leads to multiple enumerations.
- Do not return `null` from methods. Return an empty collection, a `Result` in a failed state, or an `Option<T>` type as appropriate. A method whose return type is not nullable but that can return null is lying about its contract.
- All async methods return `Task` or `Task<T>`. Do not return `void` from async methods except for event handlers where no alternative exists. `async void` methods cannot be awaited, their exceptions cannot be caught by callers, and they complicate application lifetime management.

## Dependency Injection

Constructor injection is the default and the only supported pattern for declaring dependencies.

- Never use the service locator pattern: injecting `IServiceProvider` and calling `GetService<T>()` or `GetRequiredService<T>()` at runtime. Service locator hides dependencies, makes them invisible to static analysis, and prevents the container from catching misconfiguration at startup. It also makes unit tests harder to write because dependencies are not visible from the constructor signature.
- Never inject `IServiceProvider` into domain or application services. If a factory or deferred resolution is genuinely needed, define an interface for it and inject that interface.
- More than four or five constructor parameters is a signal that the class has too many responsibilities. Apply SRP before adding another dependency.
- Register services with the narrowest appropriate lifetime:
  - **Transient** — stateless services; a new instance per resolution.
  - **Scoped** — per-request state; the standard lifetime for EF Core's `DbContext`.
  - **Singleton** — genuinely shared, thread-safe resources. Never register a service as singleton if it holds request-scoped state.
- Do not use `static` fields or properties as a substitute for dependency management. Static mutable state is globally shared, invisible to the container, and untestable.

## Naming Conventions

These follow the expressive-naming principle from `.agents/standards/principles.md`. Names communicate domain intent, not technical role. `OrderFulfillmentService` tells you what it does. `ServiceHelper2` tells you nothing.

| Element | Convention | Example |
|---|---|---|
| Types (classes, structs, enums, records) | `PascalCase` | `PaymentProcessor`, `OrderStatus` |
| Interfaces | `I` prefix + `PascalCase` | `IOrderRepository`, `IPaymentGateway` |
| Methods | `PascalCase`, verb-first | `CalculateOverdraftFee`, `FindByIdAsync` |
| Properties | `PascalCase` | `TotalAmount`, `CreatedAt`, `IsExpired` |
| Private fields | `_camelCase` | `_logger`, `_repository`, `_clock` |
| Local variables and parameters | `camelCase` | `orderId`, `cancellationToken`, `result` |
| Async methods | Suffix `Async` | `GetOrderAsync`, `PlaceOrderAsync` |
| Test classes | `<SubjectType>Tests` | `OrderServiceTests`, `PlaceOrderHandlerTests` |
| Test methods | `<Scenario>_<ExpectedResult>` | `PlaceOrder_WhenFundsInsufficient_ReturnsFailure` |
| Generic type parameters | Single uppercase for unconstrained; `T`-prefixed for constrained | `T`, `TResult`; `TCommand`, `TResponse` |

Avoid `Manager`, `Helper`, `Utility`, `Data`, and `Info` as type name suffixes. These names describe a vague role, not a specific responsibility. If a type name needs one of these words to be distinguishable, the responsibility it holds has not been clearly defined.

## Type Vocabulary — Contract, Interface, Model

These three terms are frequently misused. Consistent, precise usage makes code and documentation unambiguous and keeps architectural boundaries visible.

**Interface** — the `interface` keyword. Defines a behavioral contract: a set of operations that an implementing type must provide. Interfaces describe what something *does*, not what it contains. In this project, interfaces in `Application/Abstractions/` are ports — capabilities the Application layer requires from Infrastructure. Interfaces in `Domain/Repositories/` define the persistence operations the domain requires. Name interfaces with the `I` prefix: `IOrderRepository`, `IEmailSender`.

**Contract** — a data-transfer type defining the shape of data crossing a layer or system boundary. Contracts carry data; they do not enforce behavior or invariants. In this project, contracts live in `Application/Contracts/` and take the form of request DTOs, response DTOs, command and query payloads, and integration event messages. Name contracts after what they represent in the exchange: `PlaceOrderRequest`, `InvoiceSummaryResponse`, `OrderPlacedEvent`. Do not suffix contracts with `Model` — a response DTO is not a domain model.

**Model** — a domain object: an entity, value object, or aggregate that encapsulates business state and enforces invariants. Models live in the Domain layer. They are not passive data containers; they carry domain logic and protect their own consistency. Do not use "Model" as a catch-all for any class that holds data. A class shaped for an API response is a Contract. A class shaped for a form submission is a request DTO. Reserving "Model" for domain objects keeps the vocabulary precise and the architectural boundary between Domain and Application visible.

## Code Style

### Omit `this` When It Is Not Required

In C#, access to instance members is implicit — `this` does not need to be written. Explicit `this` in contexts where it adds nothing is visual noise that reduces readability without adding clarity.

The private field naming convention (`_camelCase`) already eliminates the main reason developers reach for `this`: disambiguating a field from a parameter of the same name. With `_camelCase` fields, the distinction is always visible without `this`.

`this` is required only in these specific contexts:

- Passing the current instance as an argument: `Register(this)`
- Constructor chaining: `public Order() : this(Guid.NewGuid()) { }`
- Extension method declarations: the `this` keyword on the first parameter

In all other cases — accessing properties, calling instance methods, referencing fields — omit it:

```csharp
// Avoid
this.Status = OrderStatus.Active;
this.Validate();

// Correct
Status = OrderStatus.Active;
Validate();
```

### Named Arguments for Context-Free Values

When a value passed to a constructor or method does not communicate its own purpose — because it is a literal, null, or one of several adjacent parameters of the same type — qualify it with the parameter name.

The trigger condition is a *context-free value*: a value that a reader cannot interpret without inspecting the method or constructor signature. The three primary cases are:

**Boolean literals** — `true` and `false` carry no semantic information positionally. Always name them.

```csharp
// Avoid — what does true mean here?
return new PaymentSubscriptionCancelResult(
    request.Provider,
    request.ProviderSubscriptionReference,
    true);

// Correct
return new PaymentSubscriptionCancelResult(
    request.Provider,
    request.ProviderSubscriptionReference,
    CancelAtPeriodEnd: true);

// Correct — inline form is fine when the call is short
return new PaymentWebhookResponse(Accepted: true, Duplicate: false, envelope.EventKey);
```

**Numeric and null literals** — apply the same judgement. A bare `0`, `30`, or `null` passed as one of several arguments requires the reader to look up the signature to understand what it represents.

```csharp
// Avoid
var policy = new RetryPolicy(3, 30, null);

// Correct
var policy = new RetryPolicy(maxAttempts: 3, delaySeconds: 30, onRetry: null);
```

**Adjacent parameters of the same type** — when two or more consecutive parameters share a type (`string`, `bool`, `int`), their order is easy to transpose and the error compiles silently. Name both to make transposition visible.

```csharp
// Avoid — two strings, easy to swap
SendNotification(user.Email, template.Subject);

// Correct
SendNotification(to: user.Email, subject: template.Subject);
```

Note that the strongly-typed identifier convention (see "Strongly-Typed Identifiers" below) addresses this at the type level for aggregate IDs — the compiler rejects a transposition of `OrderId` and `CustomerId`. Named arguments are the complementary defence for types the type system cannot distinguish, such as `string`, `bool`, and primitive numerics.

**When naming is unnecessary** — do not add named arguments where a well-named variable already makes the intent self-evident. The additional label is noise with no readability gain.

```csharp
// The variable name carries the intent; naming the argument adds nothing
var order = new Order(orderId);
var result = repository.FindByIdAsync(customerId, cancellationToken);
```

The test to apply: if a reader seeing only the call site cannot tell what a value represents without opening the method definition, name the argument. If the variable name makes it unambiguous, leave it unlabelled.

### Multi-Condition and Chained Expression Formatting

When an `if` condition, LINQ chain, or any other chained expression spans multiple lines, apply these rules consistently. The goal is to reduce cognitive complexity by making each condition or step individually scannable, and to make the logical structure of the expression visible at a glance.

**One condition or chain step per line.** Split at every logical operator (`&&`, `||`) or method chain (`.Where`, `.Select`, `.OrderBy`, etc.) so that each line expresses exactly one concern.

**Operator at the beginning of the continuation line, not the end of the preceding line.** Placing the operator at the start of the new line keeps the relationship between conditions visible without requiring the reader to track what is at the end of the previous line. This convention aligns with Knuth's recommendation, is codified in Python's PEP 8 (W504), and is used throughout the .NET runtime source.

**Closing bracket or parenthesis on its own line**, aligned with the opening keyword or expression. This gives the reader a clear visual boundary around the whole expression.

```csharp
// Multi-condition if — each condition on its own line, operator leading
if (authorizationResponse.Data is null
    || !authorizationResponse.Status
    || !authorizationResponse.Data.CorrelationReference.Equals(request.CorrelationReference)
   )
{
    return Result.Failure(...);
}

// LINQ chain — one method per line
var rules = await dbContext.CurrencyRules
    .AsNoTracking()
    .Where(rule =>
        rule.EventType == applicationEvent.EventType
        && rule.IsEnabled
        && rule.ActivationDateUtc <= now
    )
    .ToListAsync(cancellationToken);
```

**Why leading operators reduce cognitive complexity.** The Cognitive Complexity metric (SonarSource, G. Ann Campbell) treats each logical operator in a compound condition as an increment to complexity — not because the operator is inherently bad, but because each one represents a branch the reader must hold in mind. Vertical alignment makes those branches explicit; the reader processes them sequentially rather than parsing a single dense line. Code reviews also benefit: a diff that changes one condition changes exactly one line, making the intent of the change unambiguous.

**Ternary expressions** follow the same rule when they exceed a single line:

```csharp
// Inline — fine when it fits
var label = isOverdue ? "Overdue" : "Current";

// Multi-line — condition, true branch, false branch each on their own line
var label = isOverdue
    ? "Overdue"
    : "Current";
```

**Boolean LINQ predicates with multiple clauses** benefit from extracting a named local function or specification when the predicate grows beyond three conditions. A named predicate communicates intent; a six-clause inline lambda requires the reader to reconstruct the intent themselves.

```csharp
// Acceptable for two or three conditions
.Where(rule =>
    rule.EventType == applicationEvent.EventType
    && rule.IsEnabled
    && rule.ActivationDateUtc <= now
)

// Preferable once complexity grows — name the predicate
.Where(rule => IsApplicable(rule, applicationEvent, now))

// ...
private static bool IsApplicable(CurrencyRule rule, ApplicationEvent ev, DateTimeOffset now) =>
    rule.EventType == ev.EventType
    && rule.IsEnabled
    && rule.ActivationDateUtc <= now
    && rule.ExpiryDateUtc > now
    && rule.Currency == ev.Currency;
```

---

## Constants and Enumerated Values

Avoid magic numbers and magic strings. The general principle is in `.agents/standards/principles.md`. The following covers C#-specific implementation patterns.

### Constant Organisation

Define named constants as `const` or `static readonly` fields on a dedicated static class. Do not create a single `Constants.cs` god-file at the project or solution root — it becomes an undifferentiated bucket that nobody navigates. Group constants by the domain concept they belong to and place them close to the code that owns them.

```
Payments/
├── Domain/
│   ├── Invoices/
│   │   ├── InvoiceStatus.cs     ← enum for invoice states
│   │   └── InvoiceConstants.cs  ← any non-enum constants scoped to invoices
```

Cross-cutting constants — permission keys, feature flag IDs, shared error codes — may share a home, but group them by concern within that home rather than dumping everything together.

### Enums with Attribute Annotations

Use enums when a concept has a fixed set of discrete values that need multiple representations at different call sites. The integer value is the stable internal reference; attributes provide aliases for serialisation, display, and data seeding without duplicating the concept.

**Standard attributes:**

`[Description]` (`System.ComponentModel.DescriptionAttribute`) — human-readable prose. Use for display labels, seed data descriptions, logging context, and any situation where a readable explanation is needed rather than a code value.

`[EnumMember]` (`System.Runtime.Serialization.EnumMemberAttribute`) — the serialised string value sent over the wire. Recognised natively by `System.Text.Json` via `JsonStringEnumConverter` and by Newtonsoft.Json via `StringEnumConverter`. Use this for values exposed to API clients — it removes the need for a custom mapping attribute for the serialisation use case specifically.

Custom attributes — for any alias not covered by the above: a short code, a reporting label, a legacy system identifier. Define a focused custom attribute that names its purpose clearly. A custom `[Key]` attribute is appropriate when the value is not a serialisation alias but a stable identifier used in another context (e.g. seeding a lookup table).

**Example:**

```csharp
public enum InvoiceStatus
{
    [EnumMember(Value = "active")]
    [Description("The invoice is active and changes may be made.")]
    Active = 0,

    [EnumMember(Value = "completed")]
    [Description("The invoice was completed. No further changes are permitted.")]
    Completed = 1,

    [EnumMember(Value = "cancelled")]
    [Description("The invoice was cancelled. No further changes are permitted.")]
    Cancelled = 2
}
```

Always assign integer values explicitly. Relying on implicit ordering means inserting a new member between existing ones silently renumbers everything that follows — a breaking change to any persisted integer values.

### Extension Methods for Attribute Access

Provide extension methods to make attribute retrieval ergonomic. Because attribute lookup via reflection is relatively expensive, cache results for any enum accessed on a hot path.

```csharp
public static class EnumExtensions
{
    private static readonly ConcurrentDictionary<Enum, string> _descriptionCache = new();
    private static readonly ConcurrentDictionary<Enum, string> _enumMemberCache = new();

    public static string GetDescription(this Enum value) =>
        _descriptionCache.GetOrAdd(value, v =>
        {
            var member = v.GetType().GetMember(v.ToString()).FirstOrDefault();
            return member?.GetCustomAttribute<DescriptionAttribute>()?.Description
                   ?? v.ToString();
        });

    public static string GetEnumMemberValue(this Enum value) =>
        _enumMemberCache.GetOrAdd(value, v =>
        {
            var member = v.GetType().GetMember(v.ToString()).FirstOrDefault();
            return member?.GetCustomAttribute<EnumMemberAttribute>()?.Value
                   ?? v.ToString();
        });
}
```

**Usage:**

```csharp
// Retrieve the [Description] value — human-readable prose for display or seeding
string description = InvoiceStatus.Active.GetDescription();
// → "The invoice is active and changes may be made."

// Retrieve the [EnumMember] value — the serialised alias sent to API clients
string apiValue = InvoiceStatus.Active.GetEnumMemberValue();
// → "active"
```

Place extension methods in the domain or shared layer alongside the enum types they operate on, not in a generic utilities file.

### SmartEnum — When Enum Members Need Behaviour

A standard C# `enum` carries no behaviour. When an enum member needs to do something — compute a value, enforce a rule, return a related object — reach for the SmartEnum pattern rather than scattering switch statements across the codebase.

The concept originates in the **Enumeration class pattern** used in DDD circles and popularised in .NET through Jimmy Bogard's writing and Microsoft's eShopOnContainers reference architecture. The practical, ready-to-use implementation for this project is **Ardalis.SmartEnum**:

> [github.com/ardalis/SmartEnum](https://github.com/ardalis/SmartEnum)

SmartEnum members are instances of a class rather than integer values, which means they can carry properties and methods as first-class members:

```csharp
public sealed class InvoiceStatus : SmartEnum<InvoiceStatus>
{
    public static readonly InvoiceStatus Active    = new(nameof(Active),    0);
    public static readonly InvoiceStatus Completed = new(nameof(Completed), 1);
    public static readonly InvoiceStatus Cancelled = new(nameof(Cancelled), 2);

    private InvoiceStatus(string name, int value) : base(name, value) { }

    public bool AllowsEditing => this == Active;
}
```

Use SmartEnum when enum members need to carry behaviour or computed properties. Use a standard C# enum when members are data only — discrete values with optional attribute annotations.

### `nameof()` for Member Name References

When code must refer to a property, method, or type name as a string — in LINQ expressions, logging statements, validation messages, EF Core column mappings, or reflection-based APIs — use `nameof()` rather than a string literal. It is refactor-safe: renaming the member updates the reference automatically, and the compiler catches stale usages.

```csharp
// Avoid — breaks silently when the property is renamed
_logger.LogInformation("Processing {OrderId}", order.Id);
builder.Property("OrderId").HasColumnName("order_id");

// Prefer
_logger.LogInformation("Processing {OrderId}", order.Id);          // value is fine as-is
builder.Property(nameof(Order.Id)).HasColumnName("order_id");      // member reference is safe
```

### Strongly-Typed Identifiers

Passing a raw `Guid` or `int` as an identifier is a magic value problem at the type level. The compiler cannot distinguish an `OrderId` from a `CustomerId` when both are `Guid` — transposing them in a method call is a silent bug that compiles cleanly.

Use `readonly record struct` to define typed identifiers for aggregate roots and any entity whose ID crosses a meaningful boundary:

```csharp
public readonly record struct OrderId(Guid Value);
public readonly record struct CustomerId(Guid Value);
```

The compiler now enforces correct usage:

```csharp
// Correct
void PlaceOrder(OrderId orderId, CustomerId customerId) { ... }

// Compile error — types are distinct; accidental transposition is caught
PlaceOrder(customerId, orderId);
```

Define typed IDs in the Domain layer alongside the entity they identify. EF Core supports value converters for persisting typed IDs; configure them in `EntityConfigurations`.

### Configuration vs. Constants

Not every value that appears to be a constant belongs in code. Distinguish between two categories:

**Constants** — values that are true by design and should never vary between environments, deployments, or configurations. The maximum length of a database column, the number of decimal places in a currency calculation, the name of a well-known claim type. These belong in code as named constants.

**Configuration values** — defaults that may legitimately differ between environments or change over time without a code change: timeouts, rate limits, batch sizes, retry counts, external service URLs, threshold values. These belong in `appsettings.json` (or environment-specific overrides), bound to a typed options class via the Options pattern.

The test: "Would I want a different value for this in local development versus production?" If yes — it is configuration. If the same value is always correct regardless of context — it is a constant. Encoding configurable values as constants forces a recompile and a deployment to change them; encoding true constants as configuration adds noise and the risk of environment-specific misconfiguration.

---

## Query Performance

These are not strict rules but common pitfalls that compound as a system scales. Treat them as code review signals: when one appears, investigate whether it is a genuine issue in context before acting.

### `AsNoTracking` — Read-Only Queries Only

`AsNoTracking()` instructs EF Core to skip change tracking for returned entities, reducing memory overhead and improving read performance. Use it in read-only contexts: GET endpoints, reporting queries, and any operation where returned entities will not be modified through the same `DbContext`.

Do not use `AsNoTracking()` in a method that also writes through the same `DbContext` instance. Entities returned without tracking are invisible to the change tracker — `SaveChanges()` will succeed but will silently ignore any changes to those entities. No exception is raised; the data simply does not persist. This is the nature of the bug: it is easy to miss because the surrounding code appears correct.

For queries where joins may produce the same entity multiple times in the result set, `AsNoTrackingWithIdentityResolution()` prevents duplicate instances while still skipping change tracking overhead.

| Method | Change tracking | Deduplicates instances | Use for |
|---|---|---|---|
| Default | Yes | Yes | Entities that will be modified |
| `AsNoTracking()` | No | No | Simple read-only queries |
| `AsNoTrackingWithIdentityResolution()` | No | Yes | Read-only queries with joins that may return the same entity more than once |

### Query Complexity and Projection

When a query requires more than approximately seven joins, treat it as a signal to investigate alternatives. Deeply joined queries are not automatically wrong, but they frequently indicate an attempt to retrieve too much in a single round trip. Consider:

**Segmented queries** — retrieve a targeted list of primary keys or essential identifiers first, then execute subsequent reads against that smaller result set. A focused query followed by a heavier targeted read is often faster, clearer, and easier to maintain than one monolithic query that does everything at once.

**Projection** — use `Select()` to retrieve only the columns required for the operation. Avoid loading full entity graphs when only a subset of properties is needed. When `Select()` is applied to an `IQueryable<T>`, EF Core translates column selection into SQL — only the projected columns are fetched. When projection already covers the required navigation properties, any `Include()` calls for those properties are redundant and should be removed; `Include()` on a projected query loads data that is immediately discarded.

### Deferred Execution — Build the Full Query Before Materialising

`IQueryable<T>` represents an expression tree being built, not data being retrieved. Nothing is sent to the database until a materialisation operator is called: `ToList()`, `ToArray()`, `First()`, `FirstOrDefault()`, `Single()`, `Count()`, `Any()`, and similar. Up to that point, `Where()`, `OrderBy()`, `Select()`, and other operators compose a SQL expression.

`IEnumerable<T>` means the data is already in memory. Any further `Where()` or `Select()` applied to an `IEnumerable<T>` runs in the application process — not in the database.

The most common mistake is materialising before the query is fully composed:

```csharp
// Avoid — retrieves the entire Orders table into memory, then filters in the application
var orders = await dbContext.Orders.ToListAsync();
var pending = orders.Where(o => o.Status == OrderStatus.Pending);

// Correct — Where() is part of the SQL expression; only matching rows are retrieved
var pending = await dbContext.Orders
    .Where(o => o.Status == OrderStatus.Pending)
    .ToListAsync();
```

Apply all filters, ordering, and projections while the query is still `IQueryable<T>`. Materialise once, at the end, when the query is fully qualified.

### Queries Inside Loops

Executing a database query inside a loop produces one round trip per iteration — the N+1 query problem. At small data volumes it is invisible; as data scales it becomes a serious bottleneck.

**The obvious case** — an explicit query call inside a loop:

```csharp
// Avoid — one query per order
foreach (var order in orders)
{
    var customer = await dbContext.Customers
        .FirstOrDefaultAsync(c => c.Id == order.CustomerId);
    ProcessOrder(order, customer);
}

// Prefer — one query retrieves all required customers up front
var customerIds = orders.Select(o => o.CustomerId).Distinct();
var customers = await dbContext.Customers
    .Where(c => customerIds.Contains(c.Id))
    .ToDictionaryAsync(c => c.Id);

foreach (var order in orders)
{
    var customer = customers[order.CustomerId];
    ProcessOrder(order, customer);
}
```

**The nuanced case** — accessing a lazy-loaded navigation property inside a loop. No query is visible in the code, but EF Core fires an individual database query for each property access when lazy loading is enabled:

```csharp
// Avoid — each access to order.Customer triggers a hidden query per iteration
foreach (var order in orders)
{
    Console.WriteLine(order.Customer.Name);
}

// Prefer — eager-load the navigation property before the loop
var orders = await dbContext.Orders
    .Include(o => o.Customer)
    .ToListAsync();

foreach (var order in orders)
{
    Console.WriteLine(order.Customer.Name); // no additional queries
}
```

Both cases require the same fix: retrieve all required data before entering the loop. Any query or navigation property access inside a loop is a code review flag.

### Prefer `Any()` Over `Count() > 0` for Existence Checks

`Count()` forces the database to count every matching row before returning a result. `Any()` short-circuits at the first match. For existence checks, always prefer `Any()`:

```csharp
// Avoid — counts all matching rows
if (await dbContext.Orders.CountAsync(o => o.CustomerId == id) > 0)

// Prefer — stops at the first match
if (await dbContext.Orders.AnyAsync(o => o.CustomerId == id))
```
