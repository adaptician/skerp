# Pattern: Mock Service Substitution

This file provides a complete, annotated reference implementation for the factory/facade pattern used to substitute a mock third-party service adapter for a real one. The payment integration domain is used as the basis for the example throughout.

For conceptual guidance, rationale, and standards, see `.agents/standards/integrations.md` and `.agents/standards/testing.md`.

---

## Overview

The pattern involves four collaborating elements:

- **Settings** — a typed configuration model that controls which adapters are loaded and how mock adapters behave
- **Interface** — the canonical contract that all adapters (mock and real) implement
- **Factory** — resolves concrete adapters by key; applies the mock/real substitution decision at construction time
- **Facade** — implements the same interface as the adapters; hides runtime adapter resolution from callers

---

## Settings

The settings model has two responsibilities: the top-level `UseMocks` flag that governs substitution, and the per-operation mock behaviour flags that allow success and failure paths to be exercised independently.

```csharp
internal sealed class PaymentIntegrationSettings
{
    public const string SectionName = "Payments";

    // Controls whether mock or real adapters are loaded into the factory.
    // This is a binary switch: when true, all adapters are mocked.
    public MockedPaymentSettings Mock { get; set; } = new();

    public PaystackPaymentSettings Paystack { get; set; } = new();
}

internal sealed class MockedPaymentSettings
{
    public bool UseMocks { get; set; }

    // Each operation that can succeed or fail has its own configurable outcome.
    // This allows individual failure paths to be exercised without affecting
    // the rest of the workflow.
    public MockProviderTransactionInitialization TransactionInitialization { get; set; } = new();

    public MockProviderSubscriptionDisablement SubscriptionDisablement { get; set; } = new();
}

internal sealed class PaystackPaymentSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string ApiBaseUrl { get; set; } = string.Empty;
    public string CallbackUrl { get; set; } = string.Empty;
}

internal sealed class MockProviderTransactionInitialization
{
    public bool Successful { get; set; }
}

internal sealed class MockProviderSubscriptionDisablement
{
    public bool Successful { get; set; }
}
```

A corresponding `appsettings.Development.json` entry for local development:

```json
{
  "Payments": {
    "Mock": {
      "UseMocks": true,
      "TransactionInitialization": {
        "Successful": true
      },
      "SubscriptionDisablement": {
        "Successful": false
      }
    }
  }
}
```

A developer testing the failure path for subscription disablement sets `Successful: false` for that operation only, without disturbing the transaction initialization path. This is the intended granularity.

---

## Provider Key Enum

Each supported real provider is identified by a strongly-typed key. The `Unknown` value is the zero-default guard — resolving it is always an error.

```csharp
public enum PaymentProviderKey
{
    Unknown = 0,
    Paystack = 1
}
```

---

## Canonical Interface

All adapters — mock and real — implement this interface. The facade implements it too. No caller ever knows whether it is talking to a mock, a real adapter, or a facade.

```csharp
internal interface IPaymentAdapter
{
    PaymentProviderKey ResolveProviderKey(string key);

    Task<SubscriptionTransactionAuthorizationResponse> InitializeTransactionAsync(
        InitializeSubscriptionTransactionRequest request, CancellationToken cancellationToken);

    void ValidateProviderWebhookSignature(
        HttpRequest request,
        PaymentProviderKey providerKey,
        string rawPayload);

    IWebhookEvent ParseProviderWebhookToCanonical(
        PaymentProviderKey providerKey,
        string rawPayload);

    Task<SubscriptionDisablementResponse> CancelSubscription(
        CancelSubscriptionRequest request, CancellationToken cancellationToken);
}
```

---

## Factory

The factory is a dictionary of lazy-loaded adapters keyed by `PaymentProviderKey`. The substitution decision is made once, at construction time, based on the `UseMocks` flag. Mock and real adapters are never mixed.

```csharp
/// <summary>
/// The Factory pattern is used to allow payment adapters to be resolved dynamically at runtime
/// based on a key that can be derived from configuration or persisted data.
/// </summary>
internal interface IPaymentAdapterFactory
{
    /// <summary>
    /// A dictionary of lazy-loaded adapters that can be looked up based on a key.
    /// </summary>
    Lazy<IPaymentAdapter> this[PaymentProviderKey id] { get; set; }
}

internal class PaymentAdapterFactory : Dictionary<PaymentProviderKey, Lazy<IPaymentAdapter>>,
    IPaymentAdapterFactory
{
    public PaymentAdapterFactory(
        IServiceProvider serviceProvider,
        IOptions<PaymentIntegrationSettings> integrationSettings)
    {
        if (integrationSettings.Value.Mock.UseMocks)
        {
            // When mocking is enabled, load only the mock counterpart for each provider.
            // The mock adapter implements the same interface as the real adapter, so the
            // rest of the application is unaware that substitution has occurred.
            Add(PaymentProviderKey.Paystack,
                new Lazy<IPaymentAdapter>(serviceProvider.GetRequiredService<MockPaystackPaymentAdapter>));

            // Early return ensures real adapters are never loaded alongside mocks.
            return;
        }

        // When mocking is disabled, load the real adapters.
        Add(PaymentProviderKey.Paystack,
            new Lazy<IPaymentAdapter>(serviceProvider.GetRequiredService<PaystackPaymentAdapter>));
    }
}
```

Adapters are registered as lazy so the DI container does not instantiate them until they are first needed. For integrations that hold HTTP clients or maintain connection state, this avoids allocating resources for providers that may not be used in a given request.

---

## Facade

The facade is used when the concrete adapter cannot be known at compile time — for example, when the provider key is derived from request data or persisted state. The facade implements the same interface as the adapters. The caller invokes a method on the facade; the facade resolves the correct adapter from the factory and delegates.

```csharp
/// <summary>
/// The concrete adapter used to provide payment integration is allocated dynamically based on the provider key
/// that accompanies a specific request. This means that the adapter cannot be resolved at compile-time, and can only
/// be resolved at the moment of integration.
///
/// The facade is used to hide this decision from the caller — the caller does not need to know that dynamic
/// allocation occurs. All adapters implement the same interface as the facade, such that the caller needs only to
/// choose the method to invoke through the facade. The facade encapsulates the allocation process.
/// </summary>
internal class PaymentAdapterFacade : PaymentAdapter, IPaymentAdapter
{
    private readonly ILogger<PaymentAdapterFacade> _logger;
    private readonly IPaymentAdapterFactory _adapterFactory;

    public PaymentAdapterFacade(
        ILogger<PaymentAdapterFacade> logger,
        IPaymentAdapterFactory adapterFactory)
    {
        _logger = logger;
        _adapterFactory = adapterFactory;
    }

    public async Task<SubscriptionTransactionAuthorizationResponse> InitializeTransactionAsync(
        InitializeSubscriptionTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var adapter = ResolveAdapter(request.ProviderKey);
        return await adapter.InitializeTransactionAsync(request, cancellationToken);
    }

    public IWebhookEvent ParseProviderWebhookToCanonical(
        PaymentProviderKey providerKey,
        string rawPayload)
    {
        var adapter = ResolveAdapter(providerKey);
        return adapter.ParseProviderWebhookToCanonical(providerKey, rawPayload);
    }

    public void ValidateProviderWebhookSignature(
        HttpRequest request,
        PaymentProviderKey providerKey,
        string rawPayload)
    {
        var adapter = ResolveAdapter(providerKey);
        adapter.ValidateProviderWebhookSignature(request, providerKey, rawPayload);
    }

    public Task<SubscriptionDisablementResponse> CancelSubscription(
        CancelSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        var adapter = ResolveAdapter(request.ProviderKey);
        return adapter.CancelSubscription(request, cancellationToken);
    }

    private IPaymentAdapter ResolveAdapter(PaymentProviderKey providerKey)
    {
        var isProviderSupported = providerKey != PaymentProviderKey.Unknown &&
                                  Enum.IsDefined(typeof(PaymentProviderKey), providerKey);

        if (isProviderSupported)
        {
            return _adapterFactory[providerKey].Value;
        }

        _logger.LogError("{MethodName} failed due to unsupported adapter key: {Key}",
            nameof(ResolveAdapter), providerKey);

        throw new NotSupportedException("Unsupported payment provider.");
    }
}
```

---

## Usage

The caller injects `IPaymentAdapter` (satisfied by the facade) and invokes operations without any knowledge of the underlying provider or whether a mock is active.

```csharp
// The facade is registered as IPaymentAdapter in DI.
// The caller does not know whether it is talking to a mock or a real provider.
var authorizationResponse = await _paymentAdapterFacade.InitializeTransactionAsync(
    request, cancellationToken);
```

---

## Unit Tests: Verifying Substitution

Two tests are required for every integration that uses this pattern: one verifying that mock adapters are loaded when `UseMocks` is true, and one verifying that real adapters are loaded when it is false. These tests confirm the wiring is correct before any workflow tests are written.

```csharp
[Fact]
public void PaymentAdapterFactory_uses_mock_paystack_adapter_when_mocks_are_enabled()
{
    using var provider = CreatePaymentServiceProvider(useMocks: true);

    var factory = new PaymentAdapterFactory(
        provider,
        Options.Create(new PaymentIntegrationSettings
        {
            Mock = new MockedPaymentSettings { UseMocks = true }
        }));

    factory[PaymentProviderKey.Paystack].Value.Should().BeOfType<MockPaystackPaymentAdapter>();
}

[Fact]
public void PaymentAdapterFactory_uses_live_paystack_adapter_when_mocks_are_disabled()
{
    using var provider = CreatePaymentServiceProvider(useMocks: false);

    var factory = new PaymentAdapterFactory(
        provider,
        Options.Create(new PaymentIntegrationSettings
        {
            Mock = new MockedPaymentSettings { UseMocks = false }
        }));

    factory[PaymentProviderKey.Paystack].Value.Should().BeOfType<PaystackPaymentAdapter>();
}
```

These tests belong in `Grimoire.Unit.Tests` under the application or infrastructure folder that corresponds to the payment integration. They do not require a running database or live provider — only the service provider configured for the test environment.
