---
title: Kubernetes
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Writing or changing Kubernetes manifests or Kustomize overlays.
disposition: >
  mechanise — a policy check (e.g. conftest/kubeval against the manifests) is a reasonable CI addition
  once a cluster target and pipeline exist.
last-reviewed: 2026-09-08
---
# Kubernetes

Standards for deploying services to Kubernetes. These are general best practices that
apply to most Kubernetes projects — adopt them if your project deploys to Kubernetes;
ignore the file if it does not. Target-agnostic deployment discipline (environments,
health endpoints, release toggles, parity, GitOps) lives in
`.agents/standards/deployment.md`. The concrete bindings for *this* solution — image
names, overlay paths, required labels, service-specific overrides — live in
`.agents/standards/solution/deployment.md`. This file owns the *how* for Kubernetes in
general; `deployment.md` owns the *why*; `solution/deployment.md` owns this solution's
specifics.

## Resource types

Use `Deployment` for application pods. Use `StatefulSet` with `PersistentVolumeClaims`
for stateful infrastructure components (databases, message brokers) that require stable
identity and durable storage. Do not use `StatefulSet` for an application service
without an ADR justifying the choice — StatefulSets add operational complexity (ordered
rollouts, PVC lifecycle) without benefit for workloads that do not require stable pod
identity.

## Directory structure (Kustomize base + overlays)

Manifests live under `.build/k8s/` following the Kustomize base+overlays pattern. The structure
below is the recommended layout; `solution/deployment.md` documents the actual layout for
this solution.

```
.build/k8s/
├── base/                              # Applied to every environment
│   ├── apps/
│   │   └── <service-name>/
│   │       ├── deployment.yaml        # Required for every deployable service
│   │       ├── service.yaml           # Required for every service accessed by others
│   │       ├── configmap.yaml         # Add when the service has configurable non-secret values
│   │       └── rbac.yaml              # Add when the service needs a ServiceAccount or RBAC bindings
│   ├── infra/
│   │   └── <component>/
│   │       ├── statefulset.yaml
│   │       ├── service.yaml
│   │       └── pvc.yaml               # Documentation only; PVCs live in StatefulSet volumeClaimTemplates
│   ├── network/
│   │   └── network-policies.yaml
│   ├── namespace.yaml
│   ├── secrets.template.yaml          # Documentation template; not applied by Kustomize
│   └── kustomization.yaml             # Lists every base resource
├── overlays/
│   ├── <env>/
│   │   ├── kustomization.yaml
│   │   └── <service>-<env>-patch.yaml # Environment-specific patches
│   └── ...
└── secrets.yaml                       # Not committed; applied separately before kustomize apply
```

## Adding a new service

When a new deployable service is introduced, all of the following must be completed in
the same PR:

1. Create the base manifests: `deployment.yaml` and `service.yaml` at minimum. Add
   `configmap.yaml` for configurable non-secret values. Add `rbac.yaml` if the service
   needs a `ServiceAccount` or RBAC bindings.
2. Add every new file to `.build/k8s/base/kustomization.yaml` under `resources`.
3. Add environment-specific patches to each overlay that requires them.
4. Register the service in the local development orchestrator (for .NET solutions, see
   `.agents/standards/technologies/aspire.md`; otherwise the project equivalent).

A service missing from `kustomization.yaml` cannot be deployed. Both the manifest and
the kustomization registration are incomplete work until present.

## Namespace

Deploy all application and infrastructure resources to a dedicated namespace. Never
deploy to the `default` namespace — it has no isolation and is often used by
cluster-level tooling. The namespace is declared in `.build/k8s/base/namespace.yaml` and applied
as part of the base.

## Labels

Every pod template must carry an `app` label identifying the service. Additional labels
may be required by network policies or by orchestration components that select pods
dynamically. `solution/deployment.md` documents any required labels beyond `app`.

```yaml
template:
  metadata:
    labels:
      app: <service-name>
```

## Health probes

Every `Deployment` must define both a liveness probe and a readiness probe. These map
directly to the health endpoint convention in `.agents/standards/deployment.md`:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
readinessProbe:
  httpGet:
    path: /alive
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 10
  timeoutSeconds: 5
```

These are sensible defaults; `solution/deployment.md` documents any service-specific
overrides. A Deployment without probes cannot participate in rolling updates and will not
recover automatically from hangs.

## Resource requests and limits

Always specify both `requests` (the scheduler's guaranteed allocation) and `limits` (the
hard ceiling). Specifying `requests` without `limits` allows a container to consume all
available node resources during a load spike. Resource profiles are added to base
manifests once a service's steady-state usage is known.

## Configuration and secrets

Non-sensitive configuration values are stored in `ConfigMap` resources. Sensitive values
— credentials, API keys, and components used to compose connection strings — are stored
in `Secret` resources and never appear in committed manifests.

Composite values such as connection strings are constructed at pod startup using
Kubernetes `$(VAR_NAME)` expansion from Secret-sourced environment variables:

```yaml
# Source credential components from a Secret first
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: <secret-name>
      key: DB_PASSWORD
# Then compose the value at runtime using $(VAR_NAME) expansion
- name: ConnectionStrings__db
  value: "Host=db;Password=$(DB_PASSWORD)"
```

Secrets are not managed by Kustomize. They are applied separately before the Kustomize
apply step and are not committed. A `secrets.template.yaml` documents the required Secret
structure; when a feature introduces a new secret, the template is updated in the same PR.

## Graceful shutdown

Set `terminationGracePeriodSeconds` on Deployments where in-flight work must complete
before the pod is replaced. Do not set it lower than the longest expected request
duration. Stateless services may use the Kubernetes default (30 seconds).

## Network policies

Define network policies for all services. Apply least privilege: a service may only
communicate with the services it explicitly needs, on the required ports. When a new
service is introduced, add its network policies in the same PR as the service manifests.

## RBAC

Services that interact with the Kubernetes API require a `ServiceAccount` and the
appropriate `Role` or `ClusterRole` binding. Grant only the exact verbs on the exact
resource types the service requires. Prefer a namespaced `Role` over a `ClusterRole`
unless cross-namespace access is genuinely needed — `ClusterRole` grants require explicit
justification.

## Kustomize

[Kustomize](https://kustomize.io/) manages environment-specific configuration through a
base+overlays model. Base manifests define the canonical resource shapes applied in every
environment; overlays patch or extend the base per environment.

**Base** (`.build/k8s/base/`) contains everything constant across environments. If a resource
applies in every environment without modification, it belongs in the base.

**Overlays** (`.build/k8s/overlays/<env>/`) contain only what differs per environment. Overlays
are intentionally minimal — differences should be visible and explicit, not buried in
duplicated resources. Do not copy a full resource into an overlay to change one field;
use a strategic-merge or JSON 6902 patch to express only the delta.

```bash
# Apply secrets first (not managed by Kustomize)
kubectl apply -f .build/k8s/secrets.yaml
# Apply the environment overlay
kubectl apply -k .build/k8s/overlays/<env>
```

`solution/deployment.md` documents the exact overlay paths and any additional pre-apply
steps.

## See also

- `.agents/standards/deployment.md` — target-agnostic deployment discipline.
- `.agents/standards/technologies/docker.md` — building the container images deployed here.
- `.agents/standards/solution/deployment.md` — this solution's concrete bindings.
- `.agents/standards/repository-structure.md` — where `.build/k8s/` sits within `.build/`.
