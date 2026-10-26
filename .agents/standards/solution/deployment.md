---
title: Solution Deployment Conventions
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Deploying this specific solution — solution-specific bindings that overlay deployment.md.
disposition: >
  keep — solution-specific overlay content; mechanisation, if any, tracks the root deployment.md
  disposition.
last-reviewed: 2026-09-08
---
# Solution Deployment Conventions

Solution-specific deployment bindings for **this** solution. This file overlays the
target-agnostic `.agents/standards/deployment.md` and the tool standards under
`.agents/standards/technologies/` (`docker.md`, `kubernetes.md`, `aspire.md`) with the
concrete values this solution actually uses. The tool standards describe *how* to deploy
to a technology in general; this file records *what* this solution uses. Where the two
conflict, this file wins and the conflict is recorded in an ADR.

> **Scaffold note.** Replace the placeholders below with real values once the solution has
> a deployment. Until a section has a concrete binding, record "no solution-specific
> convention yet" rather than deleting the heading.

## Container images — overlays `technologies/docker.md`

- Runtime base image (`<runtime-image>` in the build template): _e.g._ `<registry>/dotnet/aspnet:9.0`.
- SDK / build base image (`<sdk-image>`): _e.g._ `<registry>/dotnet/sdk:9.0`.
- Restore / build / publish commands for this stack.
- Image name per service and the registry convention in use.

## Kubernetes — overlays `technologies/kubernetes.md`

- The actual `.build/k8s/` layout, if it differs from the recommended base+overlays layout.
- Required pod labels beyond `app`.
- Service-specific probe overrides and resource profiles.
- Overlay paths per environment and any pre-apply steps.
- The `secrets.template.yaml` location and the Secret structure.

## Local orchestration — overlays `technologies/aspire.md`

- The Aspire AppHost registration (or this solution's equivalent local orchestrator).

## Environments

- The concrete environment names and how topology, configuration, and access differ
  between them. The topology and step-by-step setup for each environment live under
  `.build/<env>/` — see `.agents/standards/repository-structure.md`.
