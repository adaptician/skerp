---
title: Third-Party Integration Standards
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Integrating with a third-party service or external dependency.
disposition: >
  keep — isolation-boundary and resilience judgement; mock/fake-provider conventions are a candidate
  for a contract test once a concrete integration exists to test against.
last-reviewed: 2026-08-17
---
# Third-Party Integration Standards

Integrating with a third-party service introduces a dependency on something that cannot be seen, controlled, or relied upon to be stable. Done well, an integration is isolated behind a clear boundary, comprehensively documented, locally reproducible, and resilient to failure. Done poorly, it is tightly coupled to a specific provider's quirks, impossible to test without live credentials, and fragile whenever the provider changes. These standards describe the former.

---

## Philosophy

**The application should depend on as little of the third-party as possible.** The third-party is an implementation detail. The application domain does not know which payment provider processes its payments or which SMS provider delivers its messages — it knows that payments can be processed and messages can be sent, expressed as canonical interfaces. The provider is one possible implementation of those interfaces.

This is not academic. Providers change pricing, deprecate APIs, shut down services, and get acquired. An application that is tightly coupled to a specific provider's types and conventions must be substantially rewritten when the provider changes. An application built against its own canonical model requires only a new adapter.

**Every production scenario must be reproducible in local development through deliberate configuration.** A state or outcome that a user can encounter in production — a declined payment, a failed webhook delivery, a rate-limited API call, an expired session — must be triggerable locally without depending on the live service, without waiting for specific real-world conditions, and without randomness. If a scenario can only be encountered by luck, it cannot be tested systematically, and it cannot be confidently claimed to have been implemented correctly. If it is implemented as a deliberate, configurable behaviour in the mock provider, it is known, planned, and testable.

This principle shapes everything that follows: it determines how mock providers are built, what acceptance criteria must cover, and what documentation must exist before implementation begins.

---

## The Anti-Corruption Layer (ACL)

The Anti-Corruption Layer is the boundary between the application's canonical model and the third-party's model. It is the translation layer that prevents the provider's types, naming conventions, error formats, and data structures from leaking into the application domain.

Without an ACL, the application becomes coupled to the provider's representation of the world. When the provider renames a field, adds a required parameter, or changes an error format, those changes propagate throughout the application. With an ACL, the impact is contained entirely to the adapter.

### Canonical Types

Define the application's own types for every concept that the integration touches. These types use the application's ubiquitous language, not the provider's.

```
// Canonical — owned by the application
public record PaymentResult(PaymentStatus Status, string? FailureReason, string? ProviderReference);
public enum PaymentStatus { Succeeded, Declined, Failed, Pending }

// Provider-specific — lives in the adapter, never exposed beyond it
internal class StripeChargeResponse { ... }
```

The application layer depends on `PaymentResult`. Nothing in the application layer imports `StripeChargeResponse` or references a Stripe-specific type. The adapter translates between the two.

### Error Translation

Third-party error models must be translated to the application's failure vocabulary at the adapter boundary. A Stripe decline code, a Twilio error code, or an AWS exception type is a provider detail. The application receives a domain-meaningful failure.

```csharp
// Inside the adapter — translate, never propagate
catch (StripeException ex)
{
    var reason = ex.StripeError?.Code switch
    {
        "card_declined"         => PaymentFailureReason.CardDeclined,
        "insufficient_funds"    => PaymentFailureReason.InsufficientFunds,
        "expired_card"          => PaymentFailureReason.CardExpired,
        _                       => PaymentFailureReason.ProviderError
    };
    return Result.Failure(reason);
}
```

A `StripeException` must never be caught in the Application or Domain layer. If it surfaces there, the ACL is not doing its job.

### SDK Preference

When the provider supplies a first-party SDK for the target platform, prefer it over a raw HTTP client. First-party SDKs handle serialisation, authentication, retry conventions, idempotency keys, and stay current with breaking API changes. Document the SDK version in use — provider SDK updates can contain breaking changes that need to be tracked.

If no SDK exists, or if the SDK is insufficient, implement a typed HTTP client scoped to the integration and document the decision.

---

## Documentation

Integration documentation serves two audiences: the contributor implementing the integration today, and the contributor maintaining or extending it later. Both need different things, and both must be served.

### Integration README

Every third-party integration has a `README.md` co-located with its implementation, typically at `src/Infrastructure/{Domain}/{ProviderName}/README.md`. This document must remain accurate and should be updated whenever the integration changes.

It contains:

- **What this integration does** — the capabilities it provides in domain terms, not provider terms
- **API version reference** — a link to the specific version of the provider's documentation that was current at the time of implementation (e.g., `https://stripe.com/docs/api/v2026-01-01`). Versioned links are preferred over unversioned ones because provider docs change without warning
- **Authentication** — how credentials are obtained (sandbox vs production), where they are configured, and what environment variables they map to
- **Supported operations** — the canonical interface methods and how they map to provider API calls
- **Known limitations or quirks** — provider behaviour that is non-obvious, underdocumented, or diverges from what the API documentation implies
- **Relevant ADRs** — links to any Architecture Decision Records that constrain or explain the integration's design

When the provider's API changes in a way that affects the integration, document the change as an ADR and update this README. The README is a snapshot of what is currently true. It should never describe what used to be true.

### Local Development Quickstart

A quickstart section in the integration README (or a separate `QUICKSTART.md` if it is extensive) describes how a new contributor can run and exercise the integration locally without access to the live service. It covers:

- Which mock provider to use and how to enable it (environment variable, configuration flag)
- How to configure specific scenarios (decline a payment, trigger a webhook, simulate a timeout)
- What seed data or state is needed to exercise the workflows
- How to obtain sandbox credentials if live provider access is needed for smoke testing
- Any known differences in behaviour between the mock and the live provider

The quickstart exists so that a contributor can be productive from day one without needing to ask how to set up the integration.

### Specs and Acceptance Criteria

Before implementation begins, the expected workflows of the integration must be documented in the feature's spec folder (`.agents/specs/<feature-slug>/`). This includes:

- Every state the integration can be in
- Every outcome it can produce (success and failure)
- The expected application behaviour for each outcome

Well-scoped acceptance criteria in Given/When/Then form are the planning artefact that makes mock implementation intuitive. If an acceptance criterion describes what happens when a payment is declined, the mock provider needs to be able to produce a declined payment. The acceptance criteria are, in effect, the specification for the mock. If the research and planning is thorough, implementing the mock becomes a direct translation of that specification.

---

## Mock Providers

A mock provider is a local implementation of the canonical integration interface that behaves like the real provider without calling it. It exists to make development, testing, and debugging possible without live credentials, network access, or real-world side effects.

### Service Mocks vs Unit Test Fakes

These are distinct tools with distinct purposes. Conflating them leads to implementations that are either under-tested or incorrectly structured.

A **unit test fake** (NSubstitute substitute) is used in application-layer unit tests to replace a dependency that is not the focus of the test — a repository, an email sender, a message bus. The fake satisfies the interface so the handler under test can run. It does not simulate a real system; it provides a controlled precondition. See `.agents/standards/testing.md` for where and how fakes are used.

A **mock service adapter** is a concrete implementation of the integration interface that substitutes for the real third-party adapter in a running application. Unlike a unit test fake, it is a fully implemented class that exercises domain logic, mapping, error handling, and the full request/response path — just without calling the live service. It is used for local development, integration tests, and acceptance verification. It must be configurable to produce both success and failure outcomes.

The distinction matters because they are used at different levels. A unit test fake for `IPaymentAdapter` would be appropriate for testing a command handler that orchestrates payment logic. A mock payment adapter is appropriate for running the full payment workflow locally without live credentials. One does not replace the other.

### What a Mock Provider Is Not

A mock provider is not a stub that always returns success. A stub confirms that the happy path compiles. A mock provider confirms that the system behaves correctly across the full range of outcomes the real provider can produce.

A mock provider that only returns success means every failure path — declined payment, expired token, rate limit, provider outage — goes untested until it happens in production. At that point it is not known and planned; it is a surprise.

### What a Mock Provider Must Cover

The mock provider must be configurable to reproduce every scenario identified in the acceptance criteria. At minimum this includes:

- All success states (including partial success where the provider supports it)
- All expected failure modes (validation failures, business rule rejections, resource not found)
- Transient failures (network timeout, 503 from the provider) for testing resilience behaviour
- Rate limit responses (429) to verify backoff handling
- Webhook delivery in both directions where the integration involves webhooks

The mock must maintain state where the real provider does. If the real provider returns different responses based on prior interactions (a payment that must be created before it can be captured, a subscription that must be active before it can be cancelled), the mock must enforce the same sequencing.

### Configurable Behaviour

Mock behaviour is controlled through configuration — environment variables, a local settings file, or a small admin interface — so that scenarios can be switched without modifying code or restarting the application.

```json
// Local appsettings.Development.json
{
  "MockPaymentProvider": {
    "SimulateDecline": false,
    "SimulateTimeout": false,
    "SimulateRateLimit": false,
    "DefaultDeclineCode": "insufficient_funds"
  }
}
```

A developer testing the declined payment flow sets `SimulateDecline: true`, exercises the workflow, observes the application's response, and switches it back. This is reproducible, deliberate, and independent of any real-world state.

### Abstraction Enforcement

A mock provider is a practical enforcement mechanism for the ACL. If the canonical interface is well-defined, the mock implements it exactly as the real adapter does. If the canonical interface leaks provider-specific types, the mock cannot implement it without also importing the provider's SDK — which defeats the purpose. The presence of a working mock provider is a signal that the abstraction is genuinely clean.

---

## Service Substitution

When an integration supports a mock adapter, the decision of which adapter to use — mock or real — must be made in one place, controlled by configuration, and binary: either the mock is active or the real service is active. The two are never used simultaneously.

### Factory Pattern

Use a factory to hold the set of available adapters and to apply the substitution decision at construction time. The factory is a keyed dictionary of lazy-loaded adapters. Each key maps to a provider; each value is the concrete adapter for that provider.

The substitution decision is made once when the factory is constructed. If `UseMocks` is enabled, only mock adapters are registered; if it is disabled, only real adapters are registered. An early return after loading mock adapters ensures the two sets are never mixed.

```csharp
if (integrationSettings.Value.Mock.UseMocks)
{
    Add(PaymentProviderKey.Paystack,
        new Lazy<IPaymentAdapter>(serviceProvider.GetRequiredService<MockPaystackPaymentAdapter>));

    return; // real adapters are never loaded when mocking is enabled
}

Add(PaymentProviderKey.Paystack,
    new Lazy<IPaymentAdapter>(serviceProvider.GetRequiredService<PaystackPaymentAdapter>));
```

This pattern accommodates multiple real providers for the same workflow. Each provider key maps to its own adapter, and the factory can grow to include additional entries without changing the substitution logic.

### Facade Pattern

When the concrete adapter cannot be determined at compile time — because the provider key is derived from request data or persisted state — use a facade to hide the runtime resolution from the caller.

The facade implements the same interface as the concrete adapters. The caller holds a reference to `IPaymentAdapter` and invokes operations on it. The facade resolves the correct adapter from the factory and delegates. The caller has no knowledge of how many adapters exist or which one is active.

```csharp
private IPaymentAdapter ResolveAdapter(PaymentProviderKey providerKey)
{
    var isProviderSupported = providerKey != PaymentProviderKey.Unknown &&
                              Enum.IsDefined(typeof(PaymentProviderKey), providerKey);

    if (isProviderSupported)
        return _adapterFactory[providerKey].Value;

    throw new NotSupportedException("Unsupported payment provider.");
}
```

Because the facade implements the same interface as the adapters, all adapters — mock, real, and facade — are substitutable at every injection point. When mocking is enabled the factory resolves mock adapters, so the facade transparently delegates to them without any conditional logic in the facade itself.

### Granular Mock Configuration

Mock configuration must provide per-operation control over success and failure outcomes. A single global `SimulateFailure` flag is insufficient — it forces all operations into the same state, making it impossible to test a workflow where one step fails and others succeed.

Model the settings with a dedicated type per operation:

```csharp
internal sealed class MockedPaymentSettings
{
    public bool UseMocks { get; set; }
    public MockProviderTransactionInitialization TransactionInitialization { get; set; } = new();
    public MockProviderSubscriptionDisablement SubscriptionDisablement { get; set; } = new();
}

internal sealed class MockProviderTransactionInitialization
{
    public bool Successful { get; set; }
}
```

This allows a developer to set transaction initialization to succeed and subscription disablement to fail in the same development session, without code changes or application restarts.

### Unit Tests for Substitution

Every integration using this pattern must include unit tests that verify the factory loads the expected adapter type under each configuration. These tests confirm the wiring is correct before any workflow tests are written. One test for `UseMocks: true`, one for `UseMocks: false`. Both resolve the adapter by key and assert the concrete type.

For the full annotated reference implementation of this pattern, including settings, interface, factory, facade, usage, and test examples, see `.agents/patterns/mock-service-substitution.md`.

---

## Resilience

Third-party services are external, uncontrolled, and will fail. Resilience patterns must be applied to every outbound integration — not as a retrofit when something goes wrong, but as a standard part of the initial implementation.

Use **Polly** as the standard resilience library for .NET. Configure policies per integration, not globally — different providers have different retry semantics and different tolerance for retry volume.

### Timeouts

Every outbound HTTP client must have an explicit timeout configured. The default `HttpClient` timeout is 100 seconds — far too long for a user-facing operation. A request that hangs for 100 seconds holds a thread and degrades the application for other users.

Set timeouts to the minimum that the provider's documented latency SLA requires, plus a reasonable margin. If the provider has no documented SLA, profile real response times and set accordingly.

```csharp
services.AddHttpClient<IStripeClient, StripeHttpClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
```

### Retry with Exponential Backoff

Retry transient failures (network errors, 5xx responses) with exponential backoff and jitter. Jitter distributes retry load across time, preventing thundering herd when many clients retry simultaneously after a provider recovers.

Do not retry non-transient failures. A 4xx response (except 429) is a client error — retrying it will produce the same result and wastes quota.

```csharp
var retryPolicy = HttpPolicyExtensions
    .HandleTransientHttpError()
    .WaitAndRetryAsync(
        retryCount: 3,
        sleepDurationProvider: attempt =>
            TimeSpan.FromSeconds(Math.Pow(2, attempt))
            + TimeSpan.FromMilliseconds(Random.Shared.Next(0, 500)));
```

### Rate Limiting (429)

A 429 response means the provider is asking to slow down. The correct response is to back off for the duration specified in the `Retry-After` header if present, then retry. Do not treat 429 as a permanent failure and do not retry immediately.

Track 429 responses in application metrics. A sustained pattern of 429s indicates either a traffic spike or an integration design that is making more calls than the provider allows. Both warrant investigation.

### Circuit Breaker

A circuit breaker prevents an unavailable provider from being called repeatedly when it is clearly not responding. After a threshold of consecutive failures, the circuit opens and subsequent calls fail immediately without hitting the provider. After a cooldown period, the circuit half-opens and allows a probe request through. If the probe succeeds, the circuit closes.

This protects the application from accumulating latency and exhausting resources on calls that are known to fail.

```csharp
var circuitBreakerPolicy = HttpPolicyExtensions
    .HandleTransientHttpError()
    .CircuitBreakerAsync(
        handledEventsAllowedBeforeBreaking: 5,
        durationOfBreak: TimeSpan.FromSeconds(30));
```

When the circuit is open, the application should return a meaningful response — not an unhandled exception. Treat an open circuit as a known failure mode and handle it at the application level the same way a provider error would be handled.

---

## Secrets and Configuration

Provider credentials — API keys, client secrets, webhook signing secrets — must never be committed to source control, hardcoded in application code, or embedded in Docker images.

- Development and testing credentials go in local environment configuration (`appsettings.Development.json`, `.env`, or user secrets via `dotnet user-secrets`). These files are git-ignored.
- Staging and production credentials are injected at runtime via environment variables, Azure Key Vault, AWS Secrets Manager, or an equivalent secrets management service.
- Sandbox and production credentials are always distinct. A developer must never need production credentials to work locally.
- Document which environment variables a given integration requires in the integration README. A new contributor should be able to identify every credential they need and where to obtain a development value for each.

---

## Observability

External integrations fail in ways that are invisible without deliberate instrumentation. Log enough to diagnose a production issue without having to reproduce it.

Log at the integration boundary for every outbound call:

- Provider name and operation
- Request identifiers (idempotency key, correlation ID) — never the full request payload if it contains sensitive data
- HTTP status code and provider-specific result code
- Latency
- Retry attempt number if applicable

Do not log sensitive data: card numbers, raw API keys, personally identifiable information in request payloads. Log the presence and outcome of the call, not its sensitive content.

Provider errors should be logged at `Warning` level for expected failures (card declined, resource not found) and `Error` level for unexpected failures (provider 5xx, timeout, circuit open). Do not log every 429 at `Error` — at scale this creates noise that masks real errors.

---

## Testing Strategy

| Test Type | Provider | Purpose |
|---|---|---|
| Unit tests | Mock provider | Test application logic and adapter mapping in isolation |
| Integration tests | Mock provider | Test the full request pipeline against the canonical interface |
| Local development | Mock provider | Exercise all workflows without live credentials or side effects |
| Smoke tests (staging) | Sandbox / test mode | Verify the real provider integration end-to-end before production |
| Production | Live provider | Real traffic only |

Automated tests never call the live provider. The mock provider is the test target for all automated test runs. Live provider access in automated tests is slow, fragile, potentially costly, and creates real side effects.

Smoke tests in a staging environment use the provider's sandbox or test mode — dedicated test credentials, test card numbers, test phone numbers — not production credentials. These are manual or semi-automated checks, not part of the CI pipeline.
