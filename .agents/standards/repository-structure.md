---
title: Repository Structure
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Placing a new top-level file or directory, adding a solution file, setting up CI/build
  tooling, or documenting an environment.
disposition: >
  keep — the top-level layout is judgement-guided convention; a verify.mjs check confirming
  required top-level paths exist is a mechanisation candidate once a solution has real
  application code.
last-reviewed: 2026-09-08
---
# Repository Structure

## Terminology

**Solution** means this repository, top to bottom — the whole codebase. One repository is one
solution. **Project** is reserved for code-level project references only — a .NET project, an
Angular workspace project, an npm package — never for the repository as a whole. This
distinction exists because "project" is heavily overloaded by tooling (`.csproj`, `angular.json`
projects); "solution" gives the repo-as-a-whole an unambiguous name. `.agents/standards/solution/`
is where this repo's own solution-specific overlays live, by the same convention.

## Solution alias and brand name

A solution's working name and its public brand name are often not the same word — the brand may not
be decided yet, a domain may not be confirmed, or the solution needs to prove itself before it is
formally branded. Using the wrong one in the wrong place creates real confusion: a contributor
instruction, a generated diagram, or copy text that mixes the two reads as inconsistent or leaked
internal information.

**[`solution-identity.md`](../../solution-identity.md)** at the repository root is the single,
easy-to-reference place both names live — consult it rather than assuming a name or inferring one
from the repository's folder name.

- **Alias** (code name) is used in documentation, planning specs, diagrams, ADRs, code comments,
  class/namespace/package names, code artefacts, and CI/CD pipelines — everywhere the audience is a
  contributor or a system.
- **Brand name** is used in copy text — emails, site text, error messages, user dialogs, footers,
  disclaimers, legal notices — everywhere the audience is an end user.

If either name changes, `solution-identity.md` records the change as an **appended** row in its
version history, never an overwrite, so a rename stays traceable the same way an ADR or a run-log
entry does. Changing either name is a solution-identity decision — see
`.agents/owned-by-humans.md` before editing the file's current values.

---

## Solution root layout

```
<solution-root>/
├── <Solution>.sln              ← .NET solution file, when applicable — at the root
├── README.md                   ← entry point; routes to .build/ for setup
├── solution-identity.md         ← the solution's alias and brand name, with version history
├── .editorconfig                ← shared baseline editor settings
├── .mcp.json                    ← MCP servers this solution expects (agent capability deps)
├── mcp-servers.md                ← human-readable index of the servers declared in .mcp.json
├── src/                          ← all production source code
├── tests/                        ← test suites, kept separate from src/ wherever the stack allows
├── docs/                         ← current-state, solution-wide documentation
└── .build/                       ← CI, infrastructure-as-code, and per-environment documentation
    ├── ci/
    │   └── <provider>/            ← e.g. azure/ — build & PR pipeline manifests, grouped by provider
    ├── config/
    │   └── env-variables.md       ← master list of environment variables and feature toggles
    ├── k8s/                       ← (or terraform/, etc.) infrastructure-as-code, if used
    │   ├── base/
    │   └── overlays/<env>/
    ├── development/               ← always present
    │   ├── development-environment.md
    │   └── development-setup.md
    ├── qa/                        ← created only once a QA environment exists
    │   ├── qa-environment.md
    │   ├── qa-setup.md
    │   └── <provider>/
    │       └── <provider>-release-pipeline.yml
    └── production/                ← created only once production exists
        ├── production-environment.md
        ├── production-setup.md
        └── <provider>/
            └── <provider>-release-pipeline.yml
```

A file's presence in this diagram is not a decision to use it — a Kubernetes layout, for
instance, only applies if the solution deploys to Kubernetes. Skip what does not apply.

---

## Solution file

When the stack uses a solution file (a .NET `.sln`/`.slnx`, for example), it lives at the
repository root, sibling to `src/` and `tests/` — not nested inside `src/`.

## `src/`

All production source code lives under `src/`. See `.agents/standards/architecture.md` for the
internal layer structure within `src/`.

## `tests/`

Test suites are kept separate from `src/` wherever the tooling allows it — see
`.agents/standards/testing.md` for the internal layout. Where a stack cannot physically separate
tests from production code (Angular's `*.spec.ts` files co-located with the component they test
is the canonical example), preserve the *intent* rather than the letter: test files must not
bloat the shipped production artefact. For Angular, the production build already excludes
`*.spec.ts` by default (they are not part of the `angular.json` build target's file set) — verify
this holds for any new build target rather than assuming it, since the goal is a lean release
artefact, not a specific folder.

## `.editorconfig`

A root `.editorconfig` carries the stack-agnostic whitespace/encoding baseline shared by every
contributor's editor. It should exist in every solution scaffolded from this repo. Contributors
may override individual settings in their own editor at their discretion — `.editorconfig` sets
the shared default, not a mandate enforced beyond what the language's own tooling checks.
Language- and framework-specific style and analyzer rules layer on top per the relevant
`.agents/standards/technologies/` file (e.g. a project-level `.editorconfig` plus
`Directory.Build.props` for .NET — see `technologies/c-sharp.md`).

## `docs/`

`docs/` holds high-level, solution-wide documentation: architecture diagrams, infrastructure
topology, component diagrams, process-flow diagrams, an overview of third-party integrations with
links to their provider documentation, and starting points into the codebase for a newcomer.

`docs/` is **current-state documentation, not planning.** It must stay accurate as a source of
truth for what the system looks like *right now*. Step-wise history and rationale — why a
decision was made, what was considered and rejected — is recorded elsewhere (ADRs under
`.agents/adrs/`, specs under `.agents/specs/`), not in `docs/`. Work-item planning and low-level
requirements never belong here.

This directory carries a maintenance cost: every doc it holds must be kept current as the system
changes, or it actively misleads. Per `.agents/standards/documentation.md`, create a file here
only when it serves a real, ongoing need — not speculatively. `docs/` is the defined exception to
that standard's "no large root-level documentation folder" rule, precisely because its content is
solution-global by definition.

## `.mcp.json` and `mcp-servers.md`

`.mcp.json` at the repository root declares the MCP servers this solution expects an agent to
have available — see `.agents/standards/mcp.md` for the full format, security rules, and the
human-owned-boundary requirement on this file. If `.mcp.json` is missing from a solution that
should have one, ask for it rather than proceeding without it.

`mcp-servers.md`, also at the root, is the human-readable companion: one entry per server declared
in `.mcp.json`, naming the server, its purpose in one line, and a link to its documentation. Keep
the two in lockstep — every server in `.mcp.json` has an entry in `mcp-servers.md` and vice versa.
A new session in a new environment reads `mcp-servers.md` to know which servers to configure
before starting work.

---

## `.build/`

`.build/` is this solution's home for continuous integration and infrastructure information —
everything about *how the solution is built, deployed, and operated* per environment, as distinct
from `docs/` (what the system *is*) and `.agents/specs/` (what work is planned).

### `ci/`

Scripts, templates, and manifests used purely for continuous integration (build and PR
validation, not release), grouped by provider: `ci/azure/azure-pipeline-build.yml`,
`ci/azure/azure-pipeline-pr.yml`. Adding a second provider adds a sibling folder, not a rename.

### `config/`

`config/env-variables.md` is the master list of every environment variable the solution uses,
including feature toggles, with the possible values and a short, concrete summary of what each
one does. Every other document under `.build/` and every place a variable is referenced in code
must use the same name for it — variable names are never renamed or given different meanings
between environments. A deliberate, narrow deviation (a variable that only exists in one
environment, for instance) is documented at the point where it becomes relevant, not silently.

**Feature-toggle warning signs.** If a toggle's purpose cannot be stated in one plain sentence, or
a toggle only makes sense combined with specific values of other toggles, treat that as a signal
the toggle is invalid or that concerns have not been properly separated — raise it with a human
rather than resolving it unilaterally (see the Blocker pattern used by `run-milestone`). Likewise,
if shipping a change depends on a manual, error-prone sequence of configuration edits — especially
one that risks user-visible downtime — raise it rather than documenting around it. See
`.agents/standards/api.md` → *Feature Gates* for the toggle taxonomy itself, and
`.agents/standards/deployment.md` → *Release Toggles and Deployment Safety* for the deployment
rules.

### Infrastructure-as-code (`k8s/`, `terraform/`, …)

When the solution deploys via Kubernetes manifests, Terraform, or similar, that tree lives under
`.build/` (e.g. `.build/k8s/`), not at the repository root. Keep the base/shared definitions and
every environment's overlay together in one tree rather than duplicating the base into each
environment folder under `.build/<env>/` — this preserves the Kustomize base+overlays model in
`.agents/standards/technologies/kubernetes.md` unchanged, just relocated. The per-environment
`<env>-setup.md` and `<env>-environment.md` files reference this shared tree; they do not
duplicate its content.

### Environment folders (`development/`, `qa/`, `production/`)

`development/` always exists. `qa/` and `production/` (or whatever environments the solution
actually has) are created only once that environment comes into existence — do not scaffold
documentation for an environment that does not exist yet; an unused guide left to rot is worse
than no guide. This mirrors the "real need, real value" discipline in
`.agents/standards/documentation.md`.

Each environment folder holds exactly two required documents, plus an optional CI/CD-provider
subfolder:

- **`<env>-environment.md`** — what the environment *is*. Opens with one diagram giving a
  birds-eye view of the whole solution in that environment; more detailed or isolated diagrams may
  follow for clarity. Covers servers, cloud platforms, tools, communication protocols, and
  third-party dependencies specific to that environment. For `development`, this is what a
  contributor needs to understand before anything will run on their machine.
- **`<env>-setup.md`** — a step-by-step guide from nothing to a running solution in that
  environment, covering only the *physical* resources: servers, databases, network configuration,
  DNS, prerequisite installations, hardware, third-party API keys. This explicitly excludes
  setting up CI/CD pipelines — that is the provider subfolder's job.
- **`<provider>/`** (e.g. `azure/`) — the CI/CD release-pipeline manifest for that environment
  (`<provider>-release-pipeline.yml`) plus a step-by-step guide to build that pipeline from
  scratch (`<provider>-release-pipeline-setup.md`). Only present once that environment has a
  managed release pipeline.

Environment variable names used across every `<env>-environment.md` and `<env>-setup.md` must
match `config/env-variables.md` exactly.

### Local port allocation

Default ports for well-known tools and frameworks (Postgres `5432`, Angular's dev server `4200`,
Redis `6379`, RabbitMQ `5672`/`15672`, and similar) are reused across unrelated solutions. On a
developer machine running more than one solution scaffolded this way, two solutions bound to the
same default port collide the moment both run at once.

**Prefer non-default host-exposed ports for local development.** The tool or framework's default
remains valid as the documented fallback constant in code and configuration — do not strip it out
— but the value a contributor's machine actually binds to should be solution-specific, distinct
from the ecosystem default.

**Ask, don't guess.** When an agent sets up a local development environment — writing
`development-environment.md` / `development-setup.md` for the first time, or wiring in a new tool
or framework that binds a port — it must raise the port-number choice as an explicit question to a
human and get it confirmed, rather than picking a value unilaterally. Do this as close to the
solution's inception, or the framework's adoption, as possible: a collision discovered months
later, after every doc, script, and connection string already references the default, is far more
expensive to unwind than resolving it at setup time.

**Containers are the exception; host exposure is not.** A tool running inside Docker Compose or a
Kubernetes cluster may keep its default in-container port when nothing outside that compose
project's own network or that cluster's internal service network ever addresses it directly —
containers in different compose projects or clusters don't collide with each other on their
internal ports. The moment a port is exposed to the host — a Compose `ports:` mapping, a Kubernetes
`hostPort`, or a local `kubectl port-forward` — that host-side port is exactly as collision-prone
as a natively-run process, and the same non-default-port guidance applies to it. See
`.agents/standards/technologies/docker.md` → *Ports* for the related in-container port convention.

Document the solution's chosen local ports in `development-environment.md`, and in
`config/env-variables.md` wherever a port is driven by an environment variable.

**Changing a bound port later.** A port change is rarely a single-file edit. Search thoroughly for
every place the old port could be referenced before treating the change as complete:

- environment variables and connection strings (`config/env-variables.md` and every place that
  consumes it);
- Docker Compose files and Kubernetes manifests/ConfigMaps (`.build/k8s/`);
- client-side dev-server config (e.g. Angular's `proxy.conf.json`, `environment.ts`) and launch
  profiles (`launchSettings.json`, an Aspire AppHost);
- CI/CD pipeline variables and health-check URLs;
- integration/E2E test fixtures and Testcontainers configuration;
- documentation (`docs/` and every `.build/<env>/` guide);
- **stored configuration in a database** — a settings or tenant table, a webhook/callback-URL
  column — that may have persisted the old port inside a saved connection string or URL. This
  category is the easiest to miss, because it is data rather than code and no repository-wide
  search will surface it; check it explicitly.

---

## `README.md` routing

The repository-root `README.md` is the entry point. It gives a short orientation and then routes:
local development to `.build/development/development-setup.md`, and each shared environment to
its `.build/<env>/` folder once that environment exists. It does not duplicate the content of
those guides.

---

## See also

- `.agents/standards/documentation.md` — documentation-as-code rules; the `docs/` exception.
- `.agents/standards/deployment.md` — target-agnostic deployment discipline; feature-gate safety.
- `.agents/standards/solution/deployment.md` — this solution's concrete deployment bindings.
- `.agents/standards/mcp.md` — `.mcp.json` format, security, and ownership.
- `.agents/standards/tooling.md` — `.tool-versions` (asdf/mise tool pinning) vs `mcp-servers.md`.
- `.agents/standards/technologies/kubernetes.md`, `docker.md`, `aspire.md` — stack-specific
  deployment standards referenced from `.build/`.
- `.agents/owned-by-humans.md` — top-level directory layout is a human-owned boundary; do not move
  or rename top-level folders without explicit instruction. `solution-identity.md`'s current values
  are on the same boundary.
- `.agents/standards/client.md` — user-facing copy conventions; use the brand name there.
