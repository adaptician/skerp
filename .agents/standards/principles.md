---
title: Design Principles
tier: 2
enforced-by: [review, prose-only]
applies-when: >
  Making a non-trivial design decision. Foundational reference, read once and internalised rather than
  checked per task.
disposition: >
  reference — philosophy that grounds judgement calls; not itself a checklist to mechanise.
last-reviewed: 2026-08-17
---
# Design Principles

These principles apply across all languages, layers, and contributors in this project. They are the philosophical foundation from which all specific standards derive. Agents and humans are expected to internalize them and use them as grounding when making design decisions — not as a checklist to satisfy mechanically.

When a design decision feels uncomfortable, checking it against these principles often names the discomfort precisely. When a principle seems to conflict with good judgment in a specific case, document the trade-off — do not silently ignore the principle.

---

## SOLID

SOLID is a set of five design principles for object-oriented software. They are lenses for reasoning about code, not laws to follow rigidly. Each principle addresses a distinct and common source of fragility, rigidity, or opacity. Applying them well produces code that is easier to change, easier to test, and easier to understand. Applying them mechanically — without understanding the problem each one addresses — produces unnecessary complexity.

### Single Responsibility Principle (SRP)

A class should have one reason to change. More precisely: a class should be responsible to one actor — one part of the system that could require it to change.

This is not the same as "one method per class" or "keep things small." A class that fully orchestrates a single business operation can be substantial and still have a single responsibility. The question to ask is: if this class needed to change, who would be asking for the change — and could two independent actors ask for incompatible changes? If yes, the class has more than one responsibility.

In practice: controllers handle HTTP concerns. Services orchestrate business logic. Repositories manage persistence. These concerns do not bleed into each other. A service that also formats its own API responses and constructs its own database queries has at least three reasons to change.

### Open/Closed Principle (OCP)

Software entities should be open for extension but closed for modification. Existing, tested code should not need to change to accommodate new behavior — new behavior is added by adding new code.

In practice: design with extension points (interfaces, abstract base types, strategy patterns) where variation is expected. Avoid if/switch chains that must be modified every time a new case is added. The addition of a new variant should not require changing the code that dispatches to it.

### Liskov Substitution Principle (LSP)

Subtypes must be substitutable for their base types without altering the correctness of the program. A caller that depends on an abstraction should behave correctly regardless of which concrete implementation it receives.

In practice: if an override changes the semantics of the base contract — throws where the base does not, ignores a parameter the base honors, returns values outside the range the base implies — the subtype violates LSP. This is a signal to prefer composition over inheritance. The base type's contract is a promise; a subtype that breaks the promise is not a subtype in any meaningful sense.

### Interface Segregation Principle (ISP)

No client should be forced to depend on methods it does not use. Prefer focused interfaces over large general-purpose ones.

This does not mean one method per interface. It means grouping methods by the coherent set of operations a specific consumer actually needs. An interface with fifteen methods covering three different concerns forces every implementor and every caller to deal with all fifteen. The split should be by consumer: what does a specific caller actually need from this abstraction?

### Dependency Inversion Principle (DIP)

High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details. Details should depend on abstractions.

In practice: business logic never imports from infrastructure directly. A service that sends email depends on `IEmailSender`, not on `SmtpClient`. The infrastructure layer provides the concrete implementation; the domain and application layers never know it exists. This is what makes infrastructure swappable and business logic independently testable.

DIP is the principle that gives Clean Architecture its structural integrity. Dependency Injection is the runtime mechanism that enforces it.

---

## Domain-Driven Design

Domain-Driven Design (DDD) is a philosophy for building software that reflects the language and concepts of the business domain it serves. The degree to which the full set of tactical patterns is applied depends on domain complexity — but the foundational practices apply to every feature, every class, every variable: the language is precise, the names are expressive, and the structure tells you what the system does.

### Ubiquitous Language

The domain has its own vocabulary. Every concept the business uses to describe its work has a name. That name must be used consistently everywhere: in conversations, in requirements, in code, in tests, in API contracts, in database column names. There is no translation layer between what the business calls something and what the code calls it.

When a new concept appears, name it deliberately. If the business does not yet have a name for it, that is a conversation to have — not a decision to defer with a placeholder like `DataProcessor`, `ItemManager`, or `Helper`. Vague names are a sign the concept has not been understood; the name should prompt the understanding, not substitute for it.

### Expressive Naming

Code is read far more often than it is written. The primary audience for a piece of code is the next person to read it — often yourself, months later, with no memory of the original context.

Names must express intent, not mechanism. `CalculateOverdraftFee` describes what it does. `Process` does not. `PendingOrdersQuery` describes what it returns. `GetData` does not. `InsufficientFundsException` describes what went wrong. `AppException` does not.

When a name requires a comment to explain what the thing is, the name has failed. The comment is evidence that a better name exists — find it.

This applies at every scale: variable names, method names, class names, file names, folder names, project names, namespace roots, solution names. The whole system, at every level of zoom, should tell you what it does and what it is about.

### Screaming Architecture

Robert C. Martin's principle: the top-level structure of a codebase should scream its purpose. A stranger looking at the project tree should immediately understand what the system is about — not what framework it uses.

A layout that screams `MVC` or `WebAPI` tells you the technology. A layout that screams `Payments`, `Orders`, `Identity`, `Notifications` tells you the domain. The domain is the point.

Project names, folder names, and namespace roots reflect domain concepts first. Technical layers (controllers, services, repositories) exist *within* domain areas, not above them. The directory tree is the first thing a new contributor reads; it should orient them to the business, not to the framework.

See `.agents/standards/architecture.md` for how this is applied in this project's solution structure.

### Tactical Patterns — Apply Where Complexity Warrants

DDD provides a set of tactical patterns — entities, value objects, aggregates, domain events, repositories, specifications — for modeling complex, behavior-rich domains. These patterns add structure and impose consistency boundaries that pay off when domain logic is intricate and evolving.

They add overhead without proportionate benefit when a feature is straightforward. A simple CRUD operation does not need aggregates, domain events, and specifications.

The guideline is: the language and naming conventions apply universally, without exception. The tactical patterns apply where the domain complexity genuinely warrants them. See `.agents/standards/architecture.md` for pattern definitions and application guidance.

---

## Clean Architecture

Clean Architecture (Robert C. Martin) organises software into concentric layers where all source code dependencies point inward — toward the domain — and never outward toward infrastructure or delivery mechanisms.

The layers, from innermost to outermost:

**Domain** — entities, value objects, domain events, business rules. No framework or infrastructure dependencies. The heart of the system. Independently testable.

**Application** — use cases, command and query handlers, application services. Orchestrates domain objects to fulfil specific business operations. Defines interfaces (ports) for infrastructure capabilities the application needs. Depends on Domain only.

**Infrastructure** — concrete implementations of the interfaces the Application layer defines: database access, external APIs, email, file storage, background job runners. Depends on Application and Domain. Never imported by Application or Domain.

**Presentation** — API endpoints, controllers, UI entry points, and delivery mechanisms. Thin: no business logic. Delegates to Application to execute use cases. Depends on Application.

The dependency rule is non-negotiable: an inner layer never imports from an outer layer. When an inner layer needs a capability that only the outer layer can provide, it defines an interface and the outer layer provides the implementation. This is the Ports and Adapters pattern. It is what keeps the domain model clean, the application logic testable, and the infrastructure replaceable.

---

## Named Constants Over Magic Values

A magic number or magic string is a literal value embedded directly in code with no explanation of what it represents or why it has that value. Magic values are a readability and maintainability problem: a reader encountering `status == 2` or `type == "INV"` must trace the value back to its origin to understand what it means. When the same value appears in multiple places, a change requires finding every occurrence — and missing one silently introduces a bug.

The rule: every meaningful constant must have a name. The name explains what the value represents; the code that uses it expresses intent rather than raw data.

This applies to all languages and all layers. It is not sufficient to define a constant once and reference it — the constant must be placed where it belongs, named after what it means in the domain, and grouped with related constants. A constant file that is a flat dump of every magic value in the system is only marginally better than inline literals.

Language-specific implementation — enums, constant classes, typed identifiers, serialisation aliases — is documented in the relevant technology standard under `.agents/standards/technologies/` (for example `c-sharp.md` for C#, `angular.md` for Angular).

---

## Don't Repeat Yourself (DRY) — Balanced with SRP

Before writing new code, read the existing codebase. Look for established classes, methods, records, and utilities that already solve the same problem. Reusing existing, tested implementations is almost always preferable to rewriting them. Duplication means two places to change when requirements shift, two places where bugs can hide, and two implementations that will gradually drift apart.

However, DRY must be applied with judgement, not mechanically. Code that looks identical is not always code that should be shared. If two pieces of code serve different actors — different parts of the system that could require them to change independently and in different directions — merging them creates coupling that will hurt when they diverge. The shared implementation must then satisfy multiple masters simultaneously, and changes intended for one use case break the other.

The test to apply before extracting shared logic: *could different actors require this code to change in different directions?* If yes, keep the implementations separate even if they look identical today. If no — if a change would always be appropriate in both places — extract the shared logic and give it a name that reflects its single, clear purpose.

When the answer is not obvious, do not guess. Ask for guidance before abstracting. The cost of premature abstraction — coupling things that should stay separate — is higher and harder to undo than the cost of temporary duplication.
