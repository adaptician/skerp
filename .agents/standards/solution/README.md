---
title: Solution-Specific Standards
tier: 2
enforced-by: [prose-only]
applies-when: >
  Index of solution-specific standards overlays.
disposition: >
  mechanise — a hand-maintained index of a directory drifts the moment a file is added. Generate it
  from frontmatter the way this directory's own README is generated.
last-reviewed: 2026-09-08
---
# Solution-Specific Standards

This directory contains conventions specific to **this solution** — this repository, top to
bottom — that **extend or deviate from** the root standards in `.agents/standards/`. "Solution"
is this repo's term for the whole codebase, as distinct from a code-level "project" (a .NET
project, an Angular workspace project). Files here mirror the root directory by name so that the
scope of each file is obvious at a glance.

A file in this directory means: "the root standard applies — plus these additional rules or
deliberate deviations." If a root standard file has no counterpart here, the root standard
applies as-is with no additions.

| File | What it adds |
|---|---|
| `api.md` | gRPC conventions; transport selection rule (HTTP vs gRPC vs RabbitMQ) |
| `architecture.md` | Multi-artefact topology; component→project mapping; module-boundary seam rule; composition root |
| `cross-cutting.md` | Benchmarking telemetry counters; scaling-trigger configuration; graceful failure drain pattern |
| `deployment.md` | Concrete container images, Kubernetes layout, overlay paths, and local-orchestration bindings for this solution |
| `figma.md` | Which Figma file governs which app; the screen index (`figma-screen-index.json`) format, including recorded approval |
| `messaging.md` | RabbitMQ topic conventions |
| `persistence.md` | Schema ownership per module; JSONB document store pattern; delta vs snapshot paths |
| `versioning.md` | Semver tagging rules; version bump table; tagging workflow for environment branches; pipeline enforcement |

## How to use this directory

When working in an area covered by both a root standard and a solution file, read **both**. The
solution file never replaces the root — it adds to it. If the two conflict, the solution file
takes precedence and the conflict should be noted in an ADR.
