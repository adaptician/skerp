---
title: Client Standards
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Writing client/UI code, on any platform.
disposition: >
  reference — technology-agnostic discipline; enforcement lives in the technologies/ file that
  specialises it for the platform actually in use.
last-reviewed: 2026-09-10
---
# Client Standards

These principles apply to all client applications in this project, regardless of platform — Angular web, Flutter mobile, or otherwise. They describe the experience, architecture, and configuration standards every client must meet. Platform-specific implementations live under `.agents/standards/technologies/` (for example `technologies/angular.md`) and specialise this file without restating it.

---

## User Feedback and Loading States

A user should never be left wondering whether something happened. Every asynchronous operation must have a visible loading state from the moment it is triggered until it completes or fails. The absence of feedback is not neutral — it reads as broken.

- Show a loading indicator whenever an async operation is in progress. The indicator must be visible in the region relevant to the operation — not just a spinner somewhere in the corner.
- Disable controls that are unsafe to interact with while an operation is in progress. A button that submits a form should be disabled from the moment it is tapped until the result is known. This prevents duplicate submissions and makes the in-progress state unambiguous.
- When an operation completes successfully, confirm it with a clear, brief message. Do not leave the user inferring success from the absence of an error.
- When an operation fails, explain what failed and, where possible, what the user can do. "Something went wrong" is not a useful error message. Name the operation, name the failure, and name the path forward.
- Any copy text visible to a user — error messages, dialogs, footers, disclaimers — uses the solution's **brand name**, never its internal alias. See `solution-identity.md` at the repository root and `.agents/standards/repository-structure.md` → *Solution alias and brand name*.

---

## Reliability Patterns

Client applications operate in environments where network conditions are unreliable, responses are delayed, and the user may interact with the UI faster than operations resolve. Standards in this area prevent the most common class of client-side reliability bugs.

### Idempotency and Deduplication

Submitting the same request twice must not produce duplicate side effects. Clients are responsible for making this safe at the interaction level, independent of whether the server enforces idempotency on its end.

- Disable submit controls the moment an operation begins and do not re-enable them until the operation is resolved. This is the first and most reliable defence against duplicate submission.
- Debounce or throttle inputs that trigger automatic operations (search, filter, autocomplete) to prevent issuing a new request on every keystroke.
- Cancel or ignore superseded in-flight requests when a newer request for the same resource has been issued. The result from the older request should never overwrite the result from the newer one.

### Race Conditions

Race conditions on the client arise when multiple async operations compete to update the same state. The most common case: a user triggers operation A, then triggers operation B before A resolves, and A's response arrives after B's and overwrites B's result with stale data.

Manage in-flight requests explicitly. For any operation that updates shared state, only the most recent request's response is applied. Responses from superseded requests are discarded.

### Eventual Consistency

When an operation succeeds, the backend state and the data visible on screen may not be immediately consistent — especially in distributed systems where reads and writes are served from different replicas or caches.

- After a write operation succeeds, update local state immediately and optimistically where appropriate. If the server later returns a different value, reconcile it.
- Clearly communicate to users when data is potentially stale or subject to a processing delay — for example, after a bulk operation, a report generation job, or any workflow that produces results asynchronously. "Your request is being processed" sets the right expectation; silently displaying the old data does not.
- Design for the possibility that a page's displayed state may lag behind actual state. Do not assume that what was just written will appear immediately on a subsequent read.

### Error Handling

Errors fall into two categories: expected errors (validation failures, permission denials, resource not found) and unexpected errors (network failures, server errors, unhandled exceptions). They require different treatment.

- **Expected errors** should be surfaced contextually and clearly. A validation failure belongs next to the field it describes. A permission error belongs where the restricted action was attempted.
- **Unexpected errors** should be caught at a global level so that an unhandled error never leaves the application in a broken or blank state. Show a meaningful recovery path — a retry option, a navigation escape, or a contact prompt.
- Never silently swallow errors. An error that is caught but not surfaced or logged is a bug waiting to be misdiagnosed. If an error is non-actionable to the user, log it and continue — do not hide it entirely.

---

## Destructive Actions

Destructive actions are those that permanently change or remove data. They require special treatment because a user making a mistake cannot undo the consequence. The client's job is to make the consequence visible before the action is committed, and to clearly communicate whether recovery is possible afterward.

- **Confirmation before action.** A destructive action must always be preceded by a confirmation step. The confirmation message must name the action and the target — not just "Are you sure?" but "Delete invoice INV-0042? This cannot be undone."
- **Name the consequence.** If an action can be reverted, say so. If it cannot, say so explicitly. "This will permanently delete the record and cannot be undone" is useful. "This will delete the record" is not, because it leaves the question of permanence unanswered.
- **Reversibility signalling.** Where actions are soft-deletable, archivable, or otherwise recoverable, the UI should communicate this at the point of action and — where relevant — surface the path to recovery. A user who understands they can restore something will act more confidently.

---

## Security Reflection

The API enforces authentication, authorization, and feature gate rules. The client reflects those rules in the user interface. These are separate responsibilities and must not be conflated.

**The client is never responsible for enforcing security.** Any check the client performs is a UX convenience — it can be bypassed, and the API must defend against all invalid requests regardless. This principle is non-negotiable.

What the client is responsible for:

- **Authentication gates.** Screens, components, and controls that require an authenticated user must not be rendered for unauthenticated users. Route guards and navigation checks enforce this at the routing level before content is shown.
- **Permission reflection.** Controls must visually reflect whether the current user holds the permission required to use them. A control for an action the user cannot perform should be disabled (or hidden, depending on the context — see guidance below). A disabled control should communicate why it is disabled when the user attempts to interact with it.
- **Feature gate reflection.** When a feature is disabled at the system level, the controls, screens, and navigation items that belong to it should be hidden. A user should not encounter a disabled feature gate in normal use — the routes, menu items, and entry points for that feature should not appear.

**Disable vs. hide.** The choice between disabling a control and hiding it depends on the reason for the restriction:

- If the user lacks a permission for an action that exists within a feature they can otherwise use, prefer disabling with an explanation. A disabled control is informative — it tells the user the action exists but is restricted.
- If the feature itself is disabled (feature gate off), prefer hiding. A feature that does not exist at the system level should not be visible as a dead end.
- If the feature exists but the user's tier, plan, or segment does not include it (permission toggle), prefer hiding with a discoverable upgrade path where relevant to the product context.

---

## Authentication as Transient State

Authentication sessions expire. This is not an edge case — it is a normal part of every authenticated application's lifecycle, and the client must handle it gracefully at all times, not just at login.

- Treat the authenticated state as transient, not permanent. Do not assume a session that was valid on page load will still be valid on the next request.
- When an authentication session expires mid-use, the client must not crash, blank out, or lose the user's current context. Detect the expired session (typically via a 401 response from the API), redirect to the authentication flow, and — where safe — restore the user's previous context after re-authentication.
- Re-authentication must be safe and convenient. Safe: the user's current state (form inputs, navigation position, pending intent) should be preserved where possible and not lost to the re-auth redirect. Convenient: the user should not be required to navigate back to where they were manually after authenticating.
- Token refresh should happen proactively before expiry where the authentication provider supports it, reducing the frequency of mid-action session interruptions.

---

## Screen vs Component Architecture

A well-designed client makes a clear distinction between screens and components. This distinction drives reusability, testability, and the ability for users to develop intuition about the interface — because the same component behaves the same way wherever it appears.

**Screens** (also called pages or containers) are top-level views tied to a route. They orchestrate: they know which data to fetch, which state to read, and which components to compose. A screen should contain minimal presentational logic of its own.

**Components** are reusable, encapsulated units of presentation. A component receives what it needs via inputs, emits what happens via outputs, and does not reach out to global state or services directly unless that is explicitly its stated responsibility (as in a smart/container component pattern). A well-designed component can be dropped into a different area of the application — or a different application — and function correctly with the same inputs.

The test for whether something should be a standalone component: *can this presentational unit be described independently of the screen it currently lives in?* If yes, extract it. If it already exists elsewhere in the application, reuse it.

Reusability is not just a code quality concern — it is a UX consistency concern. When the same component renders the same way across the application, users build a mental model of how that pattern works. When the same interaction is reimplemented differently in each screen, users must relearn it every time.

---

## Reusable Elements

Beyond components, clients should leverage the full set of reusable primitives available in their framework. These reduce duplication and keep behaviour consistent across the application. Framework-specific guidance is in the relevant platform standard, but the general principle is:

- If a transformation, behaviour, or side-effect is applied in more than one place, extract it as a reusable element.
- Shared behaviour (formatting, validation, interaction patterns) that is re-implemented in multiple components will drift — extract it so that fixing it once fixes it everywhere.
- Reusable elements should be documented inline so that a developer discovering them can understand their purpose and constraints without reading the implementation.

---

## Reuse, Duplication, and When to Refactor

Before implementing new UI, review what the solution already has — see
`.agents/standards/design.md` → *Review Before You Build* for the design-handoff side of this. This
section covers the client-specific angle; the general mindset (it applies just as much to backend
services and schema, and to Analysis and Design work, not only client code) and the full
benefit/risk decision framework are in `.agents/standards/agent-workflow.md` → *Reuse, Duplication,
and When to Refactor* — read that first, this section only adds what is specific to UI code.

Building in isolation, without checking what already exists, is how the same button or the same
style ends up duplicated three different ways across a solution — each copy drifting a little
further from the others every time only one of them gets fixed.

**Finding a first-of-a-kind candidate.** Sometimes existing code holds a component or style built
for one specific place that is, or could easily be made, generic — and a currently-applicable use
case for it exists now. Reusing it (lightly generalizing if needed) is preferable to building a
parallel duplicate. See `.agents/standards/technologies/angular.md` → *Shared / Common Elements* for
the concrete `common/` promotion mechanics in Angular.

**Promoting a component to shared/generic status touches working, already-tested code**, and may
need re-testing in both its original context and the new one — weigh that cost using the
benefit/risk table in `agent-workflow.md` before doing it.

---

## Lazy Loading

Large client applications must not load all code upfront. Lazy loading — deferring the loading of a module or feature until it is needed — improves initial load time and keeps the application responsive.

- Group features into loadable units that can be deferred until the user navigates to them.
- Lazy loading requires deliberate design: a feature that has dependencies shared with every other feature cannot be cleanly deferred. Avoid tight coupling between features at design time, not as a retrofit.
- Where lazy loading is not feasible due to existing coupling, document it as a concern so it can be addressed deliberately.

---

## Environment Configuration

Client applications run across multiple environments: local development, testing, staging, production. Behaviour that varies by environment must be configurable, not hardcoded.

- API base URLs, authentication provider endpoints, feature toggle overrides, logging verbosity, and any other environment-specific values must be injected at build or runtime via environment configuration — not embedded as string literals.
- Never hardcode a URL, API key, or environment-specific identifier in application source code. The source code must be identical across environments; only the configuration differs.
- Local development environments should not require editing source files to run. Environment configuration should be sufficient.

---

## Documentation

Documentation belongs close to the code it describes. A developer should be able to understand a component, module, or feature area by reading what is in that folder — not by searching elsewhere.

- Each feature area should have a `README.md` that describes what the feature does, its primary components, and any non-obvious design decisions.
- Complex components should have inline comments that explain *why* a decision was made, not just what the code does. The code describes the what; comments describe the intent and constraints.
- Public interfaces — component inputs/outputs, service methods, pipes — should have documentation comments that describe their contract: what they accept, what they return, and what side effects (if any) they produce.

---

## Technology-specific conventions

How these client standards are implemented in a given UI stack — component, state,
styling, and routing conventions — lives in that stack's file under
`.agents/standards/technologies/`:

- Angular / NgRx — `.agents/standards/technologies/angular.md`

Add a file there when introducing a new client framework (React, Next.js, Flutter,
…) and link it from this list.
