---
title: Backend — General Standards
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Writing server-side code, in any backend language.
disposition: >
  reference — technology-agnostic discipline; enforcement lives in the technologies/ file that
  specialises it for the language actually in use.
last-reviewed: 2026-09-10
---
# Backend — general standards

Technology-agnostic standards for server-side code: the disciplines a backend must
uphold regardless of language or framework. The general *design* principles behind
them — SOLID, DDD, Clean Architecture layering, expressive naming, no magic values —
are in `.agents/standards/principles.md` and `.agents/standards/architecture.md`;
read those first. How these rules are realised in a concrete stack lives under
`.agents/standards/technologies/` (for example `technologies/c-sharp.md`).

This file owns the *what* and the *why*; the technology files own the *how*.

---

## The backend owns correctness

A backend must never depend on a client to guarantee valid state. Clients are
untrusted: they can be modified, replayed, bypassed, or driven by a different client
than the one you shipped. Every rule that protects data integrity, authorisation, or
a business invariant is enforced on the server, regardless of what the client is
expected to do. A client-side check is a UX convenience (see `.agents/standards/client.md`);
it is never a substitute for a server-side guarantee.

Concretely:

- **Validate every request input at the boundary**, before any processing or
  persistence — shape, type, range, and business preconditions. Reject invalid input
  with a clear, specific failure rather than coercing it into something acceptable.
- **Reconstruct server-owned state on the server.** Never persist client-supplied
  values for anything the server owns. System fields — generated identifiers,
  `createdAt` / `createdBy`, workflow-controlled status, computed totals — are set
  from server state, never accepted as writable input. A field the client must not
  control must not be bindable from the request.
- **Write only what the operation owns.** An update path persists the fields that
  operation is designed to change and no others; it does not blanket-overwrite an
  entity from a client payload.

## Authorisation is a server responsibility

Authentication and authorisation are enforced server-side, at the layer that owns the
decision. Coarse-grained checks (is the caller authenticated? does it hold the
required role or feature gate?) belong at the request boundary; fine-grained checks
(may *this* caller act on *this* resource?) belong in the application layer; domain
invariants belong in the domain. No layer assumes an outer layer already checked —
each enforces what it owns. The full layer-by-layer breakdown is in
`.agents/standards/agent-workflow.md` ("No reliance on another layer's defences").

## Expected vs. unexpected failure

Two categories of failure exist and must be handled differently.

- **Expected failures** are ordinary outcomes of a business workflow: validation
  errors, not-found, business-rule violations, conflicts, permission denials. They
  are part of the domain model, not exceptional. Represent them as a returned result
  the caller is forced to handle — not as a thrown exception. Throwing for an expected
  failure hides the business meaning and removes the language's ability to enforce
  handling.
- **Unexpected failures** indicate a bug, an infrastructure fault, or an unrecoverable
  state: a violated invariant the code guaranteed, a lost database connection, data
  corruption. These are exceptional. Let them propagate to the application boundary,
  where they are logged and translated into an appropriate error response.

The test: *would a reasonable business workflow encounter this outcome?* If yes,
return it; if no, raise it. The concrete result and exception mechanisms for a given
stack are in its technology file.

## Fail fast, fail loud

A failure is information. Surfacing it clearly is safer than masking it; a suppressed
failure is only deferred to a point where it is harder to diagnose.

- Never substitute a default, placeholder, or fabricated value for a required value
  that is missing. A generated stand-in (an empty string, a zero, a dummy email, a
  minimum-value date) writes a false value to real storage, can trigger real side
  effects, and hides the real problem until something downstream breaks in a way that
  is far harder to trace. If a required value is absent, model that as a failure that
  names exactly what is missing.
- Never swallow an error silently. Handle it meaningfully or let it propagate; if it
  is genuinely non-actionable, log it and continue — do not hide it.
- Preserve diagnostic context when an error crosses a boundary: keep the original
  cause, and wrap infrastructure faults in a domain or application failure before they
  cross inward, so inner layers are never coupled to infrastructure detail.

## State-changing operations

- **Idempotency.** An operation that may be retried or received twice (client retries,
  at-least-once delivery, webhook redelivery) must not produce duplicate side effects.
  Make it safe to receive the same request more than once. Messaging, outbox, and
  webhook rules are in `.agents/standards/messaging.md`.
- **Concurrency.** Operations that can run concurrently against the same state must be
  safe under that concurrency — guard against lost updates and check-then-act races.
  Concurrency guidance is in `.agents/standards/cross-cutting.md`.

## Configuration vs. constants

Distinguish values that are true by design from values that may legitimately differ
between environments. A value that should never vary (a well-known key, a fixed
precision, a column limit) is a named constant in code. A value that could reasonably
differ between local and production (timeouts, rate limits, batch sizes, external
URLs, thresholds) is configuration, injected per environment — never a hardcoded
literal. The test: *would I want a different value for this in local development
versus production?* If yes, it is configuration.

## Reuse Before You Build

Before adding a new domain service, repository, value object, or shared abstraction, check whether
an existing one already does this or could be lightly generalised to. This is the backend instance
of a rule that applies to every layer and every work item — see `.agents/standards/agent-workflow.md`
→ *Reuse, Duplication, and When to Refactor* for the full mindset, the benefit/risk decision
framework, and why this is never the agent's call to make alone. `.agents/standards/architecture.md`
documents where a shared backend abstraction belongs once the decision is made to build or promote
one (`Domain/Shared/`, `Application/Abstractions/`, and similar). The equivalent question for schema
and data — reusing an existing table or column rather than adding a near-duplicate — is in
`.agents/standards/persistence.md`.

## Persistence, integrations, and API surface

This file defers to the focused standards for their areas: data access and
persistence (migrations generated by tooling, never hand-written; reading and writing
only what is needed; transactional boundaries) in `.agents/standards/persistence.md`;
third-party integration discipline (anti-corruption layers, resilience, mock
providers) in `.agents/standards/integrations.md`; and HTTP/API surface conventions in
`.agents/standards/api.md`.

## Technology-specific conventions

How the above is implemented in a given stack — result types, dependency injection,
nullability, query/ORM patterns, naming — lives in that stack's file under
`.agents/standards/technologies/`:

- C# / .NET — `.agents/standards/technologies/c-sharp.md`

Add a file there when introducing a new server-side language or framework (Python, Go,
Node, and so on) and link it from this list.
