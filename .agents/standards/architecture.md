---
title: Architecture
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Placing new code in a layer, or introducing a new project/module boundary.
disposition: >
  mechanise — an architecture test asserting the layer-dependency rule from the project graph, once
  the solution has more than one project to test.
last-reviewed: 2026-09-10
---
# Architecture

This project follows Clean Architecture as described by Robert C. Martin. The foundational philosophy — SOLID principles, ubiquitous language, screaming architecture, and the dependency rule — is documented in `.agents/standards/principles.md`. This file describes how those principles manifest in this project's solution structure and conventions.

---

## Layer Boundaries

Four layers exist in this project. Each has a defined scope, a defined set of allowed dependencies, and things it must never do.

**Domain**
Entities, value objects, aggregates, domain events, domain services, and specifications. Zero dependencies on frameworks, ORMs, or infrastructure packages. This layer must be independently compilable and testable using only the language runtime. If adding something to the Domain project requires pulling in an infrastructure package, the design is wrong.

**Application**
Use cases implemented as command and query handlers (MediatR). Application services. Interface definitions for infrastructure capabilities: `IEmailSender`, `IPaymentGateway`, `IOrderRepository`. Depends on Domain only. Contains no infrastructure imports and no framework-specific code beyond what MediatR requires.

**Infrastructure**
EF Core DbContext, repository implementations, external API clients, email providers, background job runners. Implements the interfaces defined in Application. Depends on Application and Domain. Never imported by Application or Domain — the dependency flows inward, not outward.

**Presentation**
ASP.NET Core controllers, minimal API endpoints, middleware. Thin: no business logic. Translates HTTP requests into Application commands and queries, and translates results into HTTP responses. Depends on Application.

---

## Enforcing the Dependency Rule

Layer boundaries are enforced by .NET project references, not by convention or discipline. Structure the solution so that importing across the boundary is a build error, not a judgment call.

- `Domain` project: no project references to other layers.
- `Application` project: references `Domain` only.
- `Infrastructure` project: references `Application` (and transitively `Domain`).
- `Presentation` project: references `Application` (and transitively `Domain`).

A circular dependency between projects is a design problem, not a configuration problem. Resolve it by introducing an abstraction — do not resolve it by relaxing the reference constraints.

---

## Screaming Architecture

Project and folder names must reflect the domain, not the technical pattern. The structure should tell an unfamiliar reader what the system *does*, not what framework it uses.

**Correct — domain first:**

```
src/
├── Payments/
│   ├── Domain/
│   ├── Application/
│   ├── Infrastructure/
│   └── Presentation/
├── Orders/
│   ├── Domain/
│   ├── Application/
│   ├── Infrastructure/
│   └── Presentation/
└── Identity/
    ├── Domain/
    ├── Application/
    ├── Infrastructure/
    └── Presentation/
```

**Avoid — pattern first:**

```
src/
├── Controllers/
├── Services/
├── Repositories/
└── Models/
```

The pattern-first layout names the architecture. The domain-first layout names the business. A new contributor reading the domain-first structure immediately understands the system deals with payments, orders, and identity. A new contributor reading the pattern-first structure knows it uses the repository pattern. Prefer the business.

---

## Directory Structure Within Each Layer

The following structures define the standard internal layout for each layer. They apply within the domain folder and within each .NET project. Deviations require a documented reason.

### Domain

```
Domain/
├── DomainEvents/         ← Raised by aggregates; named in past tense (OrderPlaced, PaymentFailed)
├── Entities/             ← Domain entities and aggregate roots
├── Exceptions/           ← Domain-specific exceptions (InsufficientFundsException, OrderNotFoundException)
├── Repositories/         ← Repository interfaces only — no implementations
├── Shared/               ← Cross-cutting value types, enums, base entity classes, tenancy interfaces
└── ValueObjects/         ← Immutable types defined by their attributes (Money, Address, EmailAddress)
```

The `Repositories` folder contains **interfaces only**. The implementations live in `Infrastructure/Persistence/Repositories`. Placing repository interfaces in the Domain layer reflects the DDD position that the repository concept originates in the domain model — the domain defines *what* it needs a repository to do; Infrastructure defines *how* it does it.

### Application

```
Application/
├── Abstractions/         ← Interface definitions for infrastructure capabilities (ports — see note below)
│   ├── Data/             ← IUnitOfWork, IApplicationDbContext
│   ├── Email/            ← IEmailService, IEmailTemplate
│   └── Messaging/        ← IMessageBus, IEventPublisher
├── Behaviors/            ← MediatR pipeline behaviors: validation, logging, transaction management
├── Contracts/            ← DTOs and request/response types that cross the Application boundary
│   ├── Orders/           ← Request/response types for the Orders domain
│   └── Payments/         ← Request/response types for the Payments domain
│       └── Invoices/     ← Request/response types scoped to Invoices within Payments
├── Orders/               ← Handlers and types scoped to the Orders domain concept
│   ├── Commands/         ← Write operations: PlaceOrderCommand, CancelOrderCommand
│   ├── Events/           ← Integration event handlers: OrderPlacedEventHandler
│   └── Queries/          ← Read operations: GetOrderByIdQuery, GetPendingOrdersQuery
└── Payments/
    ├── Commands/
    ├── Events/
    └── Queries/
```

**On `Abstractions` and the Ports concept**

The `Abstractions` folder is where the Application layer defines the interfaces it needs from the outside world — the capabilities it requires without knowing how they will be provided. This concept comes from Hexagonal Architecture (also known as Ports and Adapters), where these interfaces are called *ports*. In Hexagonal Architecture, a port is a defined boundary through which the application communicates with the outside world; an *adapter* is the concrete implementation of that port. The Infrastructure layer provides the adapters.

The naming `Abstractions` (rather than `Ports`) is the more common .NET convention and is used here for consistency with the ecosystem. The concept is identical.

The per-entity folder structure (`Orders/`, `Payments/`) within Application promotes CQRS — Commands, Queries, and Events are separated by intent, and grouped by the domain concept they operate on. This makes it immediately apparent what operations exist on a given entity, and prevents handler classes from accumulating across an undifferentiated flat folder.

### Infrastructure

```
Infrastructure/
├── BackgroundJobs/       ← Scheduled and recurring job implementations (Hangfire, Quartz, etc.)
├── Persistence/          ← All database-related code
│   ├── EntityConfigurations/  ← EF Core IEntityTypeConfiguration<T> classes, one per entity
│   ├── Migrations/            ← EF Core generated migration files; never edit by hand after commit
│   ├── Repositories/          ← Concrete repository implementations of Domain interfaces
│   ├── Seeders/               ← ISeeder implementations; SeedIds constants; seeding settings types
│   ├── StoredProcedures/      ← SQL source files (.sql) for stored procedures; embedded resources
│   ├── Views/                 ← SQL source files (.sql) for views; embedded resources
│   └── ApplicationDbContext.cs
└── Services/             ← Concrete implementations of Application Abstractions
    ├── Email/            ← IEmailService implementation
    └── Messaging/        ← IMessageBus implementation
```

Infrastructure implements everything the Application layer declared it needed. Each subfolder under `Services/` corresponds to a subfolder under `Application/Abstractions/` — this symmetry makes it easy to verify that every port has an adapter.

---

## Within-Layer Domain Grouping

The directory structures above show the standard top-level folders for each layer. Within those folders, group by domain concept wherever the content is domain-specific.

The `Contracts/` folder illustrates this: rather than placing all DTOs in a flat list, they are grouped by the domain concept they belong to (`Contracts/Payments/`, `Contracts/Orders/`, `Contracts/Payments/Invoices/`). The same applies inside Infrastructure — if there are multiple repository implementations, they should be arranged by domain (`Repositories/Orders/`, `Repositories/Payments/`) rather than accumulated in a flat folder. When a domain area grows large enough, a subfolder is the right response before the files become hard to navigate.

**Cross-cutting concerns are the correct exception.** Folders that serve the whole application rather than a single domain concept should group by technical concern, not by domain. `Abstractions/` groups by infrastructure capability (`Data/`, `Email/`, `Messaging/`). `Behaviors/` groups by pipeline stage. These are intentionally horizontal — they apply across all domain areas and should not be artificially split by domain just to follow the grouping rule.

The principle: domain-specific content groups by domain; cross-cutting content groups by concern. If you are unsure which applies, ask whether the folder's content serves one domain area or many — that question answers itself.

---

## Project Granularity

A .NET project is a compilation unit and a deployment boundary. The question of when to create a new project versus a new folder is a question of what the seam needs to enforce.

**Folders enforce convention. Projects enforce compilation.** The choice comes down to whether you need the stronger guarantee.

### Baseline: one project per architectural layer

For a single-application solution, the baseline is one project per layer:

```
YourApp.Domain
YourApp.Application
YourApp.Infrastructure
YourApp.Presentation
```

This gives you the architectural boundaries that matter — Domain cannot import Application, Application cannot import Infrastructure — enforced as build errors. For most applications, this is sufficient.

### When splitting within a layer is justified

Splitting a layer into multiple projects is a deliberate decision, not a default. It is justified when:

- **The sub-concern has distinct tooling requirements.** `Infrastructure.Persistence` is the most common justified split. EF Core migrations require `dotnet ef` tooling, have their own integration test setup, and evolve on a different cadence to email or messaging infrastructure. Isolating persistence keeps EF-specific packages out of the rest of Infrastructure and allows migration tooling to target a focused project.
- **The sub-concern is shared across multiple solutions.** If Domain types or Application contracts need to be consumed by another service or a client SDK, extract them to a separate project that can be published as a NuGet package.
- **Different teams own different infrastructure concerns at meaningful scale.** If the messaging team and the persistence team are genuinely independent, a project boundary between them reduces accidental coupling.

### When splitting is not justified

- To organise code. Folders do this at zero cost and zero overhead.
- Pre-emptively, because it might be useful later. Add the split when the need is real.
- Per-entity within Application (`Application.Orders`, `Application.Payments`). This is vertical slice architecture — a different architectural model, not a naming variation on Clean Architecture. If moving to vertical slices, do it deliberately and document the decision in an ADR.

### Naming convention when splitting

When a layer is split into multiple projects, the naming convention makes layer membership unambiguous from the project name alone:

```
{Solution}.{Layer}              ← single-project layer
{Solution}.{Layer}.{Concern}    ← split layer
```

Examples:

```
Grimoire.Domain
Grimoire.Application
Grimoire.Infrastructure                  ← or, if split:
Grimoire.Infrastructure.Persistence
Grimoire.Infrastructure.Messaging
Grimoire.Presentation
```

The layer name appears in the project name. A developer reading a project reference can immediately determine which architectural layer it belongs to without opening the project file.

As a secondary confirmation: a project's imports reflect its layer. A project that only references `Domain` belongs to Application. A project that references `Application` belongs to Infrastructure. The name declares intent; the imports enforce it.

---

## DDD Tactical Patterns

Apply tactical patterns where domain complexity justifies them. For straightforward CRUD features, a lean approach is acceptable — but the naming and structural conventions in `.agents/standards/principles.md` still apply regardless of whether the full tactical suite is in use.

**Entities**
Objects with identity that persists through state changes. Two entities with different identities are different objects even if all their attributes are currently equal. Identity, not attribute equality, is what distinguishes them.

**Value Objects**
Objects defined entirely by their attributes. Immutable. Two value objects with the same attributes are the same value. Model domain concepts that have no independent identity as value objects: `Money`, `Address`, `EmailAddress`, `DateRange`. Value objects encapsulate both the value and its invariants — an `EmailAddress` that validates its format on construction is more useful and more honest than a raw `string`.

**Aggregates**
Clusters of entities and value objects with a single root. The aggregate root is the only externally accessible entry point and the only object that may be referenced by ID from outside the aggregate. All state changes pass through the root. The aggregate boundary is the consistency boundary: invariants within the aggregate are enforced atomically. External objects never hold references to internal aggregate members — only to the root.

**Domain Events**
Facts about something that happened in the domain. Named in past tense: `OrderPlaced`, `PaymentFailed`, `UserRegistered`. Raised inside the aggregate when something meaningful occurs; dispatched after the transaction commits. Consumers of domain events react to events rather than being directly coupled into the aggregate that produced them.

**Repositories**
Defined as interfaces in the Domain layer. Implemented in Infrastructure. One repository per aggregate root — not per entity. The repository interface expresses domain-meaningful operations (`FindPendingOrders`, `FindByCustomerId`), not generic CRUD verbs.

**Specifications**
Named, composable objects that encapsulate query criteria. Prefer named specifications over anonymous LINQ expressions for any query that represents a domain concept. `PendingOrdersSpecification` communicates intent. An inline `.Where(o => o.Status == OrderStatus.Pending && o.PlacedAt < cutoff)` does not.

---

## Reuse Before You Build

Before adding a new domain service, repository, aggregate, or value object, check whether an
existing one already models this concept or could be lightly generalised to serve a second use
case. See `.agents/standards/agent-workflow.md` → *Reuse, Duplication, and When to Refactor* for the
full mindset (it applies to every layer and every work item, not only backend code) and the
benefit/risk framework for deciding whether to promote, duplicate, or ask a human — this is
deliberately never the agent's call to make alone.

---

## Documenting Decisions

Refer to `.agents/standards/documentation.md` for Architecture Decision Records (ADR). Every significant architectural decision — library choice, persistence strategy, layer boundary exception, a decision to split or not split a layer into multiple projects, a deliberate decision to omit DDD tactical patterns from an area — must be captured as an ADR. Routine implementation choices that affect only one item belong directly in that item's own `spec.md` (see `.agents/specs/README.md`).
