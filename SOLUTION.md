solution.md

# Solution Design

## Objective 

Create a web application targeted at a small internal sales team that needs to create and manage customer purchase orders and track their statuses.

## Capabilities:
- View, search, and filter purchase orders from a paginated list screen, and include a view of line items.
- Capture new purchase orders with line items.
- Edit existing purchase orders and line items.
- Update purchase orders through rule-driven state progressions.
- Delete purchase orders and associated line items.

### Value Added Features:
- real-time live updates in a dedicated monitoring view

## Technology Overview
- Client-server architecture
- Backend: C# with ASP.NET Core (.NET 10) using minimal APIs with a REST-style and Domain Driven Design.
- Frontend: Angular 21 with Typescript 5 using SCSS with SSR disabled.
- Mobile-friendly: all client components should use responsive breakpoints and a token design system. 
- Storage: SQLite with Entity Framework Core using code-first migrations.
- Include Swagger and Swagger UI for API testing.
- Use SignalR when live updates need to be sent to the client-side.
- Use XUnit for unit tests with FluentAssertions, NSubstitute, and Vitest with Angular Testing Library.

### Out Of Scope

A list of capabilities that were marked out of scope, including the reaons why, and how they would be supported in the future if needed.

- **User Identity**

*Current*: Not listed in the brief as required. Deemed an acceptable exclusion for an internal system.

*Future*: If added, the `MinimumAudit` base class can be extended to include user identifiers to include user identity tracking in audit trail.

- **Authorization and Authentication**

*Current*: Not listed in the brief as required. Deemed an acceptable exclusion for an internal system.

*Future*: add to the Api Presentation layer so that access and permission grants can be applied at the entrypoint.

- **Tax calculations such as VAT**

*Current*: Not listed in the bried as required. Adds complexity if not needed. Defer decision until presented as requirement.

*Future*: within the Domain layer encapsulate in the `PurchaseOrderCalculator` so that taxes are calculated consistently by a central handler. If the solution extends to other domain entities (e.g. sales orders or procurements) create a dedicated `TaxCalculator` that is shared across entity-specific calculators.

- **Currency conversions**

*Current*: Not listed in the brief as required. Adds complexity if not needed, and a base unit of currency must be chosen with intention. Defer decision until presented as requirement.

*Future*: currency options is currently bound to a stable enum that can be extended. Within the domain layer encapsulate a `CurrencyConverter` that governs the base unit of currency, and handles conversions.

- **Rate limiting**

*Current*: Not listed in the bried as required. Unlikely to be necessary for an internal system hosted within a private domain.

*Future*: if the application is moved to a public-facing domain, rate limiting should be impletmented along with authorization and authentication.

- **Deployments - support local demonstration only.**

*Current*: as per requirement for demo application.

*Future*: choose a persistent storage provider that can readily be interchanged with SQLite like (SQL Server or MySQL or PostgresSQL). Implement in the Infrastructure layer - repository interfaces abstract domain entities from the infrastructure that fulfills them.

- **Concurrency safety**

*Current*: deferred due to time constraints. Most likely to be required for development next, if the internal system will be used by many users, or traffic is expected to be high.

*Future*: introduce optimistic concurrency control using version column to track a concurrency token. Define as part of domain entities, executed by concrete storage provider in infrastructure.

Optimistic is preferred for performance and should be acceptable for an internal application with low data contention. Should high data contention become relevant, adopt pessimistic control using database locks.

## Solution Root

```
/
|--- .agents/           # context-package of coding standards and conventions used to instruct AI agents and co-pilots
|--- .build/            # per-environment documentation
|--- docs/              # record of agent prompts used during development and other solution-wide documentation
|--- src/               # backend source code
|--- tests/             # backend unit tests
|--- client/            # frontend client code
dotnet-tools.json       # listing of dotnet tools and versions used in the solution
global.json             # stable anchor for dotnet version
README.md               # solution quickstart
```

Find a more detailed breakdown of conventions used under `.agents\standards\repository-structure.md`.

## Development Process

AI-Assisted development is disrupting software engineering and changing how developers work. However, what will not change is that software engineers must remain aware, in control, and accountable for software artefacts.

With this sample solution I hope to demonstrate that:
- I have a strong full-stack technical background
- I am able to prepare context for AI agents that allow a predictable and high-quality result to be produced
- I can prompt, orchestrate, and review agents as part of my development process
- I am focused on creating effective user experiences - however great the mechanics might be, if it's not clear to the user how to use it, they will never know

### Iterations

Each iteration has been described in order below, and corresponds to agent prompts that can be found under: [`docs\prompts`](\docs\prompts\README.md).

1. Prepare a detailed list of requirements
    - Broad deliverable
        - an overview of the solution deliverable was listed here: [`.agents\specs\deliverables\erp-web-app\README.md`](\.agents\specs\deliverables\erp-web-app\README.md)
    - Solution preparation and foundations
        - general solution instructions were listed under: [`.agents\specs\epics\solution-preparation\brief.md`](\.agents\specs\epics\solution-preparation\brief.md)
    - Purchase Order management specific capabilities and solution requirements
        - detailed use case requirements were listed under: [`.agents\specs\epics\purchase-order-management\brief.md`](\.agents\specs\epics\purchase-order-management\brief.md) including:
            - client- vs server-side rules
            - minimum required unit tests
            - server-side totals calculator preserving line sub-totals to 4 decimals and using Banker's rounding to reduce imprecision when rounding to grand totals to 2 decimal places.
            - definition of state transitions for purchase orders as part of a State pattern
            - bonus demo features
        - API design were listed under: [`.agents\specs\epics\purchase-order-management\api.md`](\.agents\specs\epics\purchase-order-management\api.md) including:
            - normalization rules for searchable text like customer reference / product SKU codes and customer / product names
            - expected schema for a Result pattern for API responses and error codes
        - entity design and requirements under [`.agents\specs\epics\purchase-order-management\entities.md`](\.agents\specs\epics\purchase-order-management\entities.md) including:
            - database entity naming conventions, code-first migrations, and UTC for server dates/times
            - `enums` for status and currency
            - a base class to enforce audit timestamping per entity
            - soft-delete behaviour and query filtering

**These files were hand-written and were not generated using AI tools. They are intended to demonstrate an understanding of system design when planning full-stack features that include UI, API, domain logic, and persistence.**

Additional standards and instructions were provided to agents from the `.agents` directory, which is read and referenced when using planning and development skills. The `.agents` folder is a context package that I have been refining as I continue to work with agentic tools.

2. Sub-divide requirements into work items and capture into a backlog

Breaking up work into smaller iterations makes delivery more manageable, and I have incorporated this into skills for use with agentic development as well.

As development progressed I captured screenshots of the backlog changes, which can be found under: `docs\backlog-progress-screenshots`.

3. Generate a design system

Producing a design was not listed in the requirement brief. However, in the same way that a design helps to coordinate a team of developers to produce a cohesive and consistent look-and-feel, having a design that includes variables for colours, fonts, sizes, spacing, and breakpoints, as well as variants for button and input states, has a significant impact on producing **and maintaining** a solution with consistency over time.

In my experience this is highly effective when used with AI agents where memory is lost between sessions of what was previously built, and may not consider what might be coming next.

A design system was generated using a 3-layer token-based architecture to increase re-usability and consistency.

Screenshots of the designs can be found under: `docs\design-screenshots`. 

Context for design standards and conventions can be found: [`.agents\standards\styling.md`](\.agents\standards\styling.md)

4. Development to prepare the solution

The first iteration of development, which focused on creating the .NET solution and Angular client with the correct technologies and versions, installing packages, and setting up the client shell and foundation tokens and components for the overall look-and-feel as per the design.

5. Development of the purhcase order management screen

The second iteration covered the management screen for purchase order, the CRUD operations, and dedicated endpoints for totals calculation and status updates.

Development was distributed across multiple user stories each with their own milestone checkpoints.

### Code Review Findings

**Conformance - did we built what we said we would?**

As part of every milestone (iteration within a user story) an agent is required to perform a conformance review where it checks whether what it has built matches the requiremnents.

**Coherence - does it fit into the solution?**

In a separate session (free of the build session bias) an agent performs a review of a user story as a whole and judges its fit in the solution based on the standards, including architecture, design principles, peristence requirements, cross-cutting concerns, as well as technology-specific standards based on what is used in the solution.

**Human - does it behave? And is it good enough?**

Even after all that, agents can still make mistakes, or misunderstand requirements, or find unexpected surprises.

#### Findings and Resolutions

**Finding**: Edit command handlers for purchase order and line items

Both handlers added new items to be persisted to a `Queue` and used a ternery expression to interleave them during processing new items and existing items with revisions. 

While the logic was not wrong and produced no errors, using a ternery expression to interleave items from a `Queue` was un-neccessary and made the code more difficult to understand.

**Resolution**: the ternery expression was replaced with a statement to prepare new items, and a separate statement to preapred existing items. A third statement was used to combine them into a single collection for persistence. The use of `Queue`s was dropped.

Simple, and much easier to read and understand.

**Finding**: a custom feature gate mechanisms was built, instead of using the already-available gate from `Microsoft.FeatureManagement.AspNetCore`

The gate worked, but appeared to do exactly what the `AspNetCore` offering does - why maintain custom code when a package already being used offers a ready-made alternative.

... turns out there was a reason for it.

While testing during review, the agent found that the [`AspNetCore WithFeatureGate`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.featuremanagement.aspnetcore.featuregateendpointfilterextensions.withfeaturegate?view=azure-dotnet#microsoft-featuremanagement-aspnetcore-featuregateendpointfilterextensions-withfeaturegate(microsoft-aspnetcore-builder-iendpointconventionbuilder-microsoft-featuremanagement-requirementtype-system-string())) returns HTTP 404 Not Found most of the time for endpoints that are feature disabled, but *not always*.

Sending a malformed request in a POST call returned HTTP 400 Bad Request instead of 404 - nothing life-threatening, but it does reveal that the endpoint is there even if it can't be reached.

**Resolution**: keep the custom mechanism.

Although the value of 400 vs 404 might not be that great, particularly for an internal system, the other benefit is that the custom mechanism maintained the Result pattern consistently, even for disabled endpoints or malformed requests. Using the `AspNetCore` mechanism lost the result envelope and just returned the HTTP code.

As APIs are required to become more expressive with integrations with agents and MCP servers, a consistent result envelope seems worth having. And the surface area for maintenance is pretty small.

Most interesting, is that an AI agent found a small gap in a widely accepted package ... an emerging trend.

**Finding**: a custom version prefix was being added to the API base URL

The instruction to use the prefix `api/v1/` for all endpoints was followed literally, and used as the suffix for all the current endpoints. Not wrong, but less future-proof for when version 2 arrives.

**Resolution**: instructed the agent to use the `Asp.Versioning.Http` package, which provides better support for version iteration.

## Principles, Design Patterns, and their Why's

### SOLID Principles

SOLID Principles are the building blocks for robust software, plain and simple.

An example of where each principle is applied in the solution is listed below:

- S: "Single Responsibility"

    - Small dedicated endpoints for purchase order status updates is one example, and the calculate endpoint is another. Both endpoints focus on implementing a specific responsibility. Both can be considered updates, but if they were only available through the edit endpoint, using them might have unintended side-effects, or require the edit method to include intenstive logical checks to prevent changing data incorrectly. Isolating tasks to dedicated handlers with a clear fixed scope is much cleaner, and easier to reason about and test.

- O: "Open-Closed"

    - The use of the State pattern is an example. By abstractig purchase order to a state and defining transition rules in a dedicated context class, impact is isolated to a fix handler. A new state can be added by create a new class that implements the interface, and adds transitions rules to the context. Existing states and transitions are not affected if their rules do not change.

- L: "Liskov Substitution"

    - The `MinimumAudit` base class allows every inheriting entity to be timestamped through the same interceptor and without the need to sub-class an interceptor per concerete type.

- I: "Interface Segregation"

    - Defining different interfaces for `ICustomerRepository`, `IProductRepository`, and `IPurchaseOrderRepository` allows each one to list the specific targeted methods that repository needs to fulfill. One `IRepository` that covers all the command / query options forces each repository to implement generic methods (GetAll, GetById, Create etc) may violate Single Responsibility based on usage, and might include methods the implementor does not need, or cannot, fulfill (`FindExistingSkusAsync` has a single responsibility in context of a product repository, but is not applicable to customers). A generic `IRepository` can work well for applications that require only CRUD operations. In more complex solutions however, it can lead to an "anemic domain model", where an application does little more than expose basic CRUD interactions with the database - what value does the solution then add? Interfaces should be defined specifically according to what is needed, and where implementors don't fulfill the contract, the interfaces need to be divided into more granular contracts, or separated completely.

- D: "Dependency Inversion"

    - The domain layer defines command and queries for data operations, but only depends on repository interfaces. This makes the domain layer testable without a storage provider, and allows technologies to be inter-changed in the infrastructure layer, without breaking the domain layer. Should SQLite later be replaced with a new storage provider, this would make it easy.

Although AI agents have been trained to understand and apply SOLID principles, it might still "slip their mind" on a particular run. The principles are defined under [`.agents\standards\principles.md`](\.agents\standards\principles.md), making it possible to reference them as concrete context as part of requirements, plans, and reviews.

### Design Patterns

Object-Orientated Design Patterns go hand-in-hand with SOLID principles, and greatly improve code neatness and maintainability.

Here are a few that were chosen for the solution:

- Singleton

    - The `IDateTimeOffsetProvider` interface abstracts the provider of the local system time. In production this would be the server, but in development and testing environments the ability to substitute "today" or "now" allows time-dependent use cases to be tested. However, even when the clock provider is a mock, there must only be one system-wide, otherwise any time would be inconsistent and unreliable.

- Mediator and Chain of Responsibility with MediatR

    - The Mediator pattern decouples the sender of a request from the receiver of the request, which makes it much easier to change concrete senders and receivers without impacting entire workflows. And by abstracting the concrete receiver, it allows additional processing steps to be added as part of a pipeline, such as validating a request before handing it off to a receiver to be processed. 
    - This brings the Chain of Responsibility pattern into the mix, where a payload can only be handled by more than once receiver, as long as hand off between one appropriate process to another is maintained effectively.
    - The MediatR package provides `IPipelineBehavior` which was used to wire request validators as pre-processors before requests to create or edit purchase orders and their lines items reach the actual handlers. This maintains a strongly-type hand-off (Chain of Responsibility), and defines contracts that direct the right request types to the appropriate handlers (Mediator) without callers needing to know the concrete type of the handling receiver.

- State pattern

    - `IPurchaseOrderState` provides the common interface that every state type must fulfill so that processing via the context can be consistent.
    - `PurchaseOrderStatusContext` provides a central location where state processing and transition rules are encapsulated.
    - allows a purchase order to be passed into the context class to handle state management internally, and caller syntax can focus on clarity and expressivity e.g. `var editable = PurchaseOrderStatusContext.For(order).EnsureEditable();`

- Observer pattern (a.k.a Publish-Subscribe)

    - Managing live data via SignalR is achieved by creating a common notifier where multiple users or browser sessions can connect and subscribe their interest to receiving updates. As updates are sent to the hub, they are subsequently distributed or published to the interested parties (the observers).
