---
title: .NET Aspire
tier: 2
enforced-by: [review, prose-only]
applies-when: >
  Configuring .NET Aspire local-development orchestration.
disposition: >
  keep — local orchestration and cost-discipline judgement specific to a project that adopts Aspire.
last-reviewed: 2026-08-17
---
# .NET Aspire

Local-development orchestration for .NET distributed applications. This is .NET-specific
(see `.agents/standards/technologies/c-sharp.md` for the broader C# standard). Aspire is
strictly a **local development** tool — it does not replace or influence the production
deployment topology, which is governed by `.agents/standards/deployment.md` and, for
Kubernetes, `.agents/standards/technologies/kubernetes.md`.

## When to use Aspire

Use [.NET Aspire](https://learn.microsoft.com/en-us/dotnet/aspire/) when a solution has
multiple services that need to run together locally, share configuration, and observe
each other's health and telemetry. A single-service solution does not need it.

## The Service Defaults pattern

In a multi-service .NET solution, cross-cutting concerns — health endpoints, telemetry,
HTTP client resilience — should be centralised in a shared `<Solution>.ServiceDefaults`
class library referenced by every service. It is the single place to wire OpenTelemetry,
configure health check endpoints, and set resilience defaults; without it, each service
wires these independently and drifts. Call `.AddServiceDefaults()` as early as possible in
each service's startup pipeline. The library typically provides:

- Health check endpoints (`/health` for liveness, `/alive` for readiness — see the health
  convention in `.agents/standards/deployment.md`).
- OpenTelemetry traces, metrics, and structured logs exported to a configured OTLP endpoint.
- HTTP client resilience: retry policies and circuit breakers via
  `Microsoft.Extensions.Http.Resilience`.

## Telemetry is an active decision

OpenTelemetry gives distributed tracing across services — a major observability advantage
— but it must be configured deliberately. Poorly configured telemetry is one of the
fastest ways to generate unexpectedly large infrastructure bills. Decide explicitly:

- **Log levels.** `Warning`/`Error` is the appropriate production default. `Information`
  and `Debug` are for development and troubleshooting, enabled per-environment via
  configuration, never hardcoded. Do not emit `Information` in production without a
  retention and cost plan.
- **Trace sampling.** 100% in development; rate-limited in production (e.g. 10% or a fixed
  rate per second). Configure the sampler explicitly rather than relying on the SDK default.
- **Metric cardinality.** Avoid unbounded label cardinality (e.g. a user ID or request
  value as a label) — it produces unbounded time series, expensive for any metrics store.
- **Sink selection and retention.** The OTLP collector and its backend determine cost and
  retention. Choose the sink that matches operational needs and configure retention at the
  collector/backend, not just the application.

Telemetry that is emitted but never read is pure cost. Instrument intentionally.

## See also

- `.agents/standards/technologies/c-sharp.md` — the C#/.NET standard this specialises.
- `.agents/standards/deployment.md` — health endpoint convention and observability principles.
