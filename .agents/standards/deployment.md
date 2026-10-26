---
title: Deployment Standards
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  A change introduces or modifies a deployment artefact, or a work item is nearing merge to main.
disposition: >
  keep — cross-environment discipline that a single mechanism cannot fully capture; the merge-criteria
  checklist in plans.md is the mechanisable slice, tracked there.
last-reviewed: 2026-09-08
---
# Deployment Standards

A feature is not complete until it is running in every target environment, not merely
passing tests locally. Deployment artefacts — whatever form they take for your stack
(container images, orchestration manifests, infrastructure-as-code, configuration and
secret entries) — are part of the feature and are authored, reviewed, and merged
alongside the code that uses them.

This file holds **target-agnostic** deployment discipline that applies however you ship.
*How* to deploy with a specific tool is documented per tool under
`.agents/standards/technologies/` (e.g. `docker.md`, `kubernetes.md`, `aspire.md`) —
adopt the ones your project uses and ignore the rest. The concrete bindings for *this*
solution (base images, image names, overlay paths, required labels) live in
`.agents/standards/solution/deployment.md`.

If a feature introduces no deployment changes (a pure code change to an existing service,
no new infrastructure, no new environment variables, no manifest modifications), record
that explicitly in the feature's `requirements.md` under a "Deployment impact" heading.
Absence of documentation is not evidence of absence of impact.

---

## Environments

Every project must define its deployment environments explicitly and document how
configuration, access controls, and topology differ between them. At minimum, distinguish
a local development environment (a developer runs the full stack on their machine) and at
least one shared environment. Shared environments beyond local are typically some
combination of development/integration, staging/QA, and production.

Each environment's topology and step-by-step setup are documented under `.build/<env>/` —
see `.agents/standards/repository-structure.md` for the required `<env>-environment.md` /
`<env>-setup.md` pair, the environment-folder lifecycle, and where CI/CD release-pipeline
manifests live per environment.

Principles that apply regardless of how many environments exist:

- A feature that introduces new infrastructure must be verified in an integration
  environment before it advances to production.
- Differences between environments are explicit, version-controlled overlays — not
  undocumented manual adjustments.
- Release toggles must be present in all environments from the first milestone that
  deploys the feature; they are never added retroactively.
- Production is not where assumptions get tested. Configuration, network access, and
  security posture must be validated in a pre-production environment first.

---

## Health and Liveness Endpoints

Exposing a health endpoint is good practice for any deployed service — not only
containerised ones. Any orchestrator, load balancer, monitoring agent, or deployment
script can use a lightweight HTTP probe to determine whether a service is alive and ready,
without knowing the service's domain logic.

### The convention

Adopt two endpoints wherever the technology makes it straightforward:

- **`/health`** — liveness. Confirms the process is alive and not in an unrecoverable
  state. Returns `200 OK` when running normally.
- **`/alive`** — readiness. Confirms the service is ready to receive traffic. A service may
  be alive but temporarily unable to serve (completing startup, waiting on a dependency).

Orchestrators use these as liveness/readiness probes; load balancers use them for routing;
monitoring polls them to detect outages; pipelines can gate the next step on a successful
probe.

### Implementation principles

- **Idempotent and side-effect free.** A health check is read-only: no state change, no
  database write, no message published. A probe with side effects is phantom load.
- **Lightweight.** Respond fast — typically under 100ms. Expensive queries time out under
  load and cause false failures.
- **Unauthenticated.** Probes from orchestrators and load balancers carry no credentials.
  The response must not leak sensitive topology — a status code and minimal body suffice.
- **Shallow by default; deep checks are opt-in.** Liveness is always shallow. Readiness may
  include lightweight dependency checks (can the service reach its database?) but must stay
  lightweight and idempotent. Deep multi-service checks belong behind a separate diagnostic
  endpoint, not a live readiness probe.

```json
{ "status": "healthy" }
```

The status code carries the meaning; the body is for human operators. Keep the production
body minimal to avoid leaking topology.

---

## Stack-specific deployment standards

How you build and ship — containers, an orchestrator, infrastructure-as-code — is a
per-project choice, not something this scaffold mandates. Generic, ready-to-use standards
for common tools live under `.agents/standards/technologies/`:

- `docker.md` — building minimal, secure container images.
- `kubernetes.md` — Kubernetes manifests and Kustomize base/overlay management.
- `aspire.md` — .NET Aspire local-development orchestration (.NET only).

These are guidelines for *if* you use the tool. Follow the ones relevant to your project and leave the others in place — they cost nothing and are ready if the project adopts that tool later. A standard's presence is not a decision to use the technology: a deployment-technology choice is made with a human, and an agent unsure whether a tool applies should ask rather than assume. Add a new file under `technologies/` when you standardise on another deployment tool
(Terraform, Ansible, Helm, …). This solution's concrete values overlay them in
`.agents/standards/solution/deployment.md`.

---

## Release Toggles and Deployment Safety

All new features must be deployed behind a release toggle from the first deployment. A
deployment is not safe to merge until the feature is unreachable behind a disabled toggle
in all environments. See `.agents/standards/api.md` — Feature Gates for the toggle
taxonomy, naming convention, and implementation pattern.

**Warning signs in a toggle.** If a toggle's purpose cannot be stated in one plain sentence,
or it only behaves sensibly combined with specific values of other toggles, treat that as a
signal the toggle is invalid or that concerns have not been properly separated — raise it
with a human rather than resolving it unilaterally. The same applies if shipping a change
depends on a manual, easily-mis-ordered sequence of configuration edits, especially one that
risks user-visible disruption: raise it rather than documenting around it. See
`.agents/standards/repository-structure.md` → *Feature-toggle warning signs*.

---

## Deployment Artefacts in Feature Specifications

Every feature specification must explicitly address deployment. The assessment is made
during requirements authoring and documented in `requirements.md` under a "Deployment
impact" heading.

If the feature requires no deployment changes, record it explicitly:

```markdown
## Deployment impact

No deployment changes required. This feature modifies an existing service and
introduces no new infrastructure, manifests, environment variables, or secrets.
```

If the feature requires deployment changes, create `deployment-plan.md` in the feature
folder alongside `plan.md`. It must cover which services and artefacts are affected, the
environment-specific configuration, any new secrets and how they are managed per
environment, rollout order, and rollback path — using whatever artefacts your stack
requires (see the relevant `technologies/` file and `solution/deployment.md`). Acceptance
criteria for such features must include at least one criterion verifiable in a non-local
environment.

---

## Other Deployment Targets

### Virtual Machines

**Infrastructure as Code.** VM provisioning and configuration are never applied manually.
[Terraform](https://www.terraform.io/) (provisioning) and [Ansible](https://www.ansible.com/)
(configuration) are the industry-standard tools. All IaC is version-controlled alongside
application code and reviewed through the same pull-request process.

**Immutable infrastructure.** Prefer replacing VMs on each deployment over patching running
instances. Provision a new VM from the current image, validate with health checks, shift
traffic, decommission the old one. This eliminates drift and makes rollback a matter of
re-routing traffic.

**Process management.** On Linux VMs, application processes run as `systemd` services with
`Restart=on-failure` and a defined `RestartSec`. The unit file is committed and deployed via
configuration management.

**Secrets management.** Use a dedicated secrets manager (HashiCorp Vault, AWS SSM Parameter
Store, Azure Key Vault). Never commit secrets or bake them into VM images.

**Health checks.** Expose the same `/health` and `/alive` endpoints described above.

### On-Premises Servers

On-premises deployments follow the VM principles with additions:

**Network segmentation.** Separate application tiers with VLANs or firewall rules; least
privilege for network access (the on-prem analogue of Kubernetes network policies/RBAC).

**Change management.** On-prem environments typically require formal change control.
Deployment artefacts — scripts, configuration templates, rollback procedures — must be
self-contained enough for an operator who was not involved in development to execute safely.

**Certificate management.** TLS certificates are often renewed manually. Document expiry
dates, renewal procedures, and responsible parties in the deployment plan for any service
that terminates TLS directly.

### General Principles — All Environments

**Twelve-Factor App.** [The Twelve-Factor App](https://12factor.net/) is the widely-adopted
baseline for portable, resilient deployments. Most relevant here: *Config* (configuration in
environment variables, not code), *Backing Services* (databases and brokers as attached
resources addressed by URL), *Build/Release/Run* (strictly separated), *Disposability*
(fast start, graceful `SIGTERM` shutdown).

**GitOps.** The Git repository is the single source of truth for deployment state. Changes
to deployment artefacts go through normal PR review. A deployment is convergence of the live
environment toward the declared state — not a manual action.

**Environment parity.** Minimise differences between environments. Configuration differs by
design; topology and resource types should be as close to identical as practical.

**Observability from day one.** New services ship with traces, metrics, and structured logs
wired from their first deployment, via the [OpenTelemetry SDK](https://opentelemetry.io/) for
the relevant language, connected to the project's configured collector. Configure telemetry
deliberately — see the cost guidance in `.agents/standards/technologies/aspire.md` (the
principles there apply to any OpenTelemetry setup, not just .NET).

---

## See Also

- `.agents/standards/technologies/docker.md`, `kubernetes.md`, `aspire.md` — stack-specific deployment standards.
- `.agents/standards/solution/deployment.md` — this solution's concrete deployment bindings.
- `.agents/standards/api.md` — feature-gate taxonomy and toggle implementation.
- `.agents/standards/persistence.md` — database migration, seeding, and schema standards.
- `.agents/standards/repository-structure.md` — `.build/` layout, per-environment documentation, and environment-variable discipline.
