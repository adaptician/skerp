---
title: Testing Standards
tier: 1
enforced-by: [verify.mjs, review, prose-only]
applies-when: >
  Writing or updating any test.
disposition: >
  mechanise — verify.mjs already runs the suite (backend-test / frontend-test) once a project exists;
  content conventions here (avoiding tautological tests, covering failure paths) remain review-only.
last-reviewed: 2026-08-17
---
# Testing Standards

---

## Philosophy

Tests reflect expected behaviours and outcomes for specific scenarios. They are not written to satisfy a coverage target — coverage is a by-product of good tests, not the objective.

A test has value when it does one or more of the following:
- Specifies a behaviour that is required and non-obvious
- Guards against a regression when that behaviour is later touched
- Exercises a permutation or edge case that is difficult or impossible to reach through normal user interaction
- Verifies that a security, business, or data integrity rule holds in isolation — independent of any other layer's defences

A test has no value when it:
- Only asserts that a mock was called (it tests the test setup, not the system)
- Duplicates the production logic rather than asserting an outcome
- Passes only because every meaningful dependency has been stubbed away
- Tests framework behaviour or trivial property access rather than application logic
- Exists solely to move a coverage number

Delete no-value tests. Do not write them in the first place.

---

## What to Test

**Behaviour, not implementation.** A test that breaks because a private method was renamed but the observable behaviour is unchanged is testing the wrong thing. A test should describe a scenario and verify its outcome. When the implementation is refactored without changing the behaviour, the tests should continue to pass.

**Outcomes, not steps.** Verify what comes out of a unit — return values, raised events, state changes, side effects on collaborators — not the sequence of internal calls that produced it. Exception: verifying that a specific collaborator was called with specific arguments is valid when the call itself is the expected side effect (sending an email, publishing an event).

**Boundary conditions and failure paths.** Happy-path tests are necessary but insufficient. The scenarios that matter most are often the ones where things go wrong: invalid input, insufficient permissions, concurrent modification, resource not found. These are the paths that must not silently misbehave.

**Security rules in isolation.** The backend must be defensible even when called directly through the API, with no reliance on client-side guards. Tests must verify that authentication, authorisation, and business rules enforce correctly at the layer they belong to, not assume that another layer will catch invalid inputs first.

---

## Test Structure

All tests follow Arrange / Act / Assert:

```
// Arrange — set up the preconditions
// Act — invoke the unit under test
// Assert — verify the outcome
```

Each test exercises exactly one scenario. Multiple assertions within a test are acceptable when they all describe facets of a single outcome — they are not acceptable when they describe independent scenarios that should be separate tests.

---

## Naming

Naming conventions for C# are defined in `.agents/standards/technologies/c-sharp.md`:

- Test classes: `<SubjectType>Tests` — `InvoiceServiceTests`, `SubmitInvoiceCommandHandlerTests`
- Test methods: `<Scenario>_<ExpectedResult>` — `SubmitInvoice_WhenAlreadySubmitted_ReturnsFailure`

For Angular, tests use the `describe` / `it` structure. The `it` description should read as a sentence: `it('should disable the submit button when the form is invalid')`. Nest `describe` blocks to group related scenarios within a component or service.

---

## Organisation

Test files mirror the structure of the source they test. A developer looking for the tests for a class should find them in the corresponding location in the test project or alongside the source file — not in an undifferentiated flat folder.

Tests are split into sensible, focused files. One test class per source class. One `describe` block per Angular component or service. If a test file is growing large, it is a signal that the test subject has too many responsibilities or that the file needs to be broken into scenario-scoped groupings.

---

## Backend — C# / .NET

### Test Project Structure

```
tests/
├── Grimoire.Unit.Tests/
│   ├── Domain/
│   │   ├── Entities/           ← Entity invariants, aggregate behaviour
│   │   └── ValueObjects/       ← Value object equality, validation, construction rules
│   └── Application/
│       ├── Orders/
│       │   ├── Commands/       ← Command handler unit tests
│       │   └── Queries/        ← Query handler unit tests
│       └── Payments/
│           ├── Commands/
│           └── Queries/
└── Grimoire.Integration.Tests/
    ├── Api/
    │   ├── Orders/             ← Full HTTP pipeline tests via WebApplicationFactory
    │   └── Payments/
    └── Infrastructure/
        └── Persistence/        ← Repository tests against a real database
```

Test projects follow the naming convention `{Solution}.Unit.Tests` and `{Solution}.Integration.Tests`. Infrastructure unit tests are rarely necessary — infrastructure logic is thin by design and is covered by integration tests.

### Frameworks and Libraries

| Purpose | Library |
|---|---|
| Test runner | xUnit |
| Assertions | FluentAssertions |
| Mocking | NSubstitute |
| Integration test host | `Microsoft.AspNetCore.Mvc.Testing` (`WebApplicationFactory`) |
| Database containers | Testcontainers |

### What to Test at Each Layer

**Domain**

Domain logic is the highest-value target for unit tests. It has no infrastructure dependencies and tests run fast.

- Entity invariants: does the aggregate enforce its business rules on construction and state transition?
- Value object construction: does an invalid value object reject construction with the appropriate exception?
- Domain event raising: does the aggregate raise the expected domain events when meaningful operations occur?
- Specification logic: does a specification correctly include and exclude the cases it is designed for?

**Application (Command and Query Handlers)**

Handlers are the orchestration layer. Unit-test them with mocked infrastructure dependencies (repositories, services). Test:

- Does a valid command produce the expected result and invoke the expected collaborators?
- Does an invalid command return the appropriate failure result (not throw)?
- Does a query handler apply the correct filtering, projection, or ordering?
- Are domain events or integration events dispatched when expected?

Infrastructure dependencies (repositories, email senders, message bus) are substituted with NSubstitute fakes. Do not mock the domain objects — exercise them for real.

Note that NSubstitute fakes are appropriate here because the handler is the focus: the fake satisfies the interface so the handler can run. This is distinct from mock service adapters used for third-party integration testing. A fake `IPaymentAdapter` in a handler unit test is correct. A full `MockPaystackPaymentAdapter` class is correct for running the payment workflow in a development or integration test environment. Using a NSubstitute fake where a mock adapter is required means the full request/response path, mapping, and error handling of the integration are never exercised. See `.agents/standards/integrations.md` for the mock adapter pattern.

**API (Integration Tests)**

Integration tests exercise the full request pipeline using `WebApplicationFactory` against a test instance of the application. They verify:

- Unauthenticated requests to secured endpoints return **401**.
- Authenticated requests without the required permission return **403**.
- Requests to endpoints behind a disabled feature gate return **404** (release toggle) or **503** (ops toggle).
- Valid requests produce the expected response body and status code.
- Invalid request payloads return **400** with meaningful validation errors.
- Business rule violations return the appropriate status and error detail.

Security-specific integration tests are not optional. The security posture checklist in `.agents/standards/api.md` has a corresponding set of tests: every enforcement point declared in code must have a test that verifies it fires correctly.

**Persistence (Integration Tests)**

Repository integration tests run against a real database provisioned by Testcontainers. They verify:

- Does the repository correctly persist and retrieve entities?
- Do query methods return the expected results for known data?
- Do soft-delete filters exclude deleted records correctly?
- Do concurrency conflicts surface the expected exceptions?

Testcontainers spins up a real PostgreSQL instance for the test run. Do not substitute an in-memory database for persistence integration tests — in-memory databases do not enforce constraints, do not support all query patterns, and have masked real bugs in the past.

### Integration Wiring Tests

Every integration that uses the factory/facade substitution pattern (see `.agents/standards/integrations.md`) must include unit tests that verify the factory loads the correct adapter type under each configuration state. These tests are not about the adapter's behaviour — they confirm that the DI wiring and substitution logic are correct before any workflow tests are written.

Two tests are required per integration: one asserting the mock adapter type is resolved when `UseMocks` is true, and one asserting the real adapter type is resolved when it is false.

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

These tests belong in `Grimoire.Unit.Tests` under the folder corresponding to the integration. They do not require a database or live provider credentials.

### Concurrency Tests

Transactional and concurrent scenarios require dedicated tests. These are not covered by standard happy-path integration tests and must be written explicitly for any operation that modifies shared state.

Test scenarios include:
- Optimistic concurrency: a second writer who reads and modifies a record after a first writer has already modified it must receive a concurrency conflict, not silently overwrite.
- Idempotency: a command submitted twice must not produce duplicate side effects.
- Race conditions on status transitions: concurrent attempts to transition the same entity to a mutually exclusive state must resolve correctly.

---

## Frontend — Angular

### Frameworks and Libraries

| Purpose | Library |
|---|---|
| Test runner | Vitest |
| Component testing | Angular TestBed + Angular Testing Library |
| E2E | Cypress or Playwright |

**Vitest** is the Angular CLI default for new projects from Angular v21 onward, with stable status. It runs unit tests in Node.js using jsdom to simulate the browser DOM, avoiding the overhead of launching a real browser. The Angular CLI scaffolds Vitest configuration automatically for new projects — do not configure it manually unless there is a specific reason to deviate.

Karma (the previous default) is deprecated and must not be used for new projects. The experimental Jest and Web Test Runner integrations introduced in earlier Angular versions were deprecated in v21 and are scheduled for removal in v22. Teams migrating from Jest can use community tooling (`jest-preset-angular` or the Nx Jest plugin) as a transitional measure, but Vitest is the target.

Vitest's API is intentionally compatible with Jest — `describe`, `it`, `expect`, `beforeEach`, and the matcher surface are the same. Existing test knowledge transfers directly; only the runner and configuration change.

Angular Testing Library is preferred for component tests that interact with the DOM as a user would, rather than through component internals.

### File Organisation

Test files are co-located with the source file they test, using the `.spec.ts` suffix:

```
invoice-list/
├── invoice-list.component.ts
├── invoice-list.component.html
├── invoice-list.component.scss
└── invoice-list.component.spec.ts
```

E2E tests live in a dedicated `e2e/` directory at the project root, organised by feature:

```
e2e/
└── payments/
    └── invoice-submission.cy.ts
```

### What to Test

**Services**

- Test the public methods of the service with mocked dependencies (use `jest.fn()` or NSubstitute equivalents for Angular's `HttpClient` using `HttpClientTestingModule`).
- Verify the correct HTTP method and endpoint are called for API-backed operations.
- Verify that returned observables emit the expected values or errors.
- Do not test Angular's HTTP stack itself — only what the service does with requests and responses.

**Components**

Focus on observable behaviour, not implementation:

- Given a set of inputs, does the component render the expected output?
- Given a user interaction (click, input, form submission), does the component emit the expected output or trigger the expected action?
- Are elements conditionally visible, disabled, or styled based on the component's state?
- Do loading states appear while async operations are in progress and clear when they resolve?

Avoid testing internal implementation details — private methods, child component internals, or the exact sequence of lifecycle hook calls.

**Pipes**

Pipe tests are the simplest category. Test the transformation for a representative set of inputs, including edge cases (null, empty string, boundary values).

**Guards**

- Does an unauthenticated user get redirected to the login route?
- Does a user without the required permission get redirected to an appropriate denial state?
- Does a user with the required credentials pass through?

**NgRx — Reducers**

Reducers are pure functions and trivially testable. For each action, verify the expected state transition:

```typescript
it('should mark invoices as loading when load is requested', () => {
  const state = reducer(initialState, InvoiceActions.loadInvoices());
  expect(state.loading).toBe(true);
});
```

**NgRx — Effects**

Test that an effect dispatches the expected action in response to an input action, with service dependencies mocked:

```typescript
it('should dispatch loadInvoicesSuccess when the service returns data', () => {
  // Arrange: mock the service to return a known list
  // Act: dispatch loadInvoices action via the effects harness
  // Assert: the effect dispatches loadInvoicesSuccess with the returned data
});
```

**Directives**

Test that the directive produces the expected DOM change when its input condition is met and its inverse when it is not. For permission and feature gate directives specifically, test the hidden and disabled states that correspond to the security reflection rules in `.agents/standards/client.md`.

### E2E Tests

E2E tests verify complete user-facing flows in a real browser against a running application. They are the most expensive tests to write and maintain — target them at the paths that matter most:

- Critical happy paths (submitting an invoice, completing a payment)
- Flows involving multiple steps or pages where integration bugs are likely
- Authentication flows, including session expiry and re-authentication

Do not write E2E tests for scenarios that are adequately covered by unit or component tests. E2E tests are slow; do not use them as a substitute for lower-level tests.

### What Not to Test in Angular

- Angular framework behaviour (template compilation, DI resolution)
- Third-party component library internals
- Trivial property bindings with no conditional logic
- Auto-generated boilerplate with no application logic
