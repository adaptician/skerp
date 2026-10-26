---
title: Docker / Containers
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Building or changing a container image.
disposition: >
  mechanise — a Dockerfile linter (e.g. hadolint) in the pipeline would catch most of this
  mechanically once a CI pipeline exists.
last-reviewed: 2026-09-08
---
# Docker / Containers

Standards for building container images. General best practice for any containerised
service — adopt if your project ships containers. Target-agnostic deployment discipline
is in `.agents/standards/deployment.md`; the concrete base images and build commands for
*this* solution are in `.agents/standards/solution/deployment.md`. If you deploy these
images to Kubernetes, see `.agents/standards/technologies/kubernetes.md`.

## Dockerfile location and naming

Each deployable service has exactly one Dockerfile, committed alongside the service's
source. Library and shared projects compiled into consuming services do not have
Dockerfiles. A consistent location must be established and documented for the project
(for a monorepo, `src/<ServiceName>/Dockerfile` is conventional).

## Multi-stage build structure

All Dockerfiles use multi-stage builds to produce a minimal runtime image: a build stage
that contains the compiler/SDK and build tooling, and a separate final stage that
contains only the runtime and the published artefacts. Never ship the build/SDK image as
the final runtime stage — it is larger and materially increases the attack surface.

The example below is the **.NET** four-stage pattern (`base`, `build`, `publish`,
`final`); the staging principle is language-agnostic, but the concrete `FROM` images and
restore/build/publish commands are .NET-specific — see
`.agents/standards/technologies/c-sharp.md` and `.agents/standards/solution/deployment.md`.

```dockerfile
ARG VERSION=0.0.0

# Stage 1: base — runtime-only image; non-root user declared here so all
# subsequent stages that inherit from base also run as non-root.
FROM <runtime-image> AS base
USER <non-root-user>
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# Stage 2: build — SDK/compiler image; copy dependency manifests before source
# files so the package restore layer is cached until dependencies change.
FROM <sdk-image> AS build
WORKDIR /src
COPY ["src/<ServiceName>/<ServiceName>.csproj", "src/<ServiceName>/"]
# Add one COPY line per referenced project in dependency order.
RUN <restore-command>
COPY . .
WORKDIR "/src/src/<ServiceName>"
RUN <build-command>

# Stage 3: publish — separate from build so intermediate build artefacts are
# not carried into the publish output.
FROM build AS publish
RUN <publish-command>

# Stage 4: final — runtime image only; build tooling and intermediate layers
# are discarded; OCI version label applied from the VERSION build argument.
FROM base AS final
ARG VERSION=0.0.0
LABEL org.opencontainers.image.version=${VERSION}
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT [<entrypoint>]
```

## Non-root user

Application containers must not run as root. Declare a non-root user in the `base` stage
so all inheriting stages run under it automatically. Prefer a runtime image's
pre-configured non-root user over creating one manually. Running as root inside a
container is unnecessary privilege and is blocked by well-configured cluster pod-security
policies.

## Base images

Use official images from your runtime vendor's registry. Do not use community or
third-party base images without an ADR documenting the rationale and a supply-chain trust
assessment. Pin base images to a version tag rather than `latest`. When the runtime
version is upgraded across the solution, update all Dockerfiles in a single PR so the
change is atomic and reviewable.

## Ports

Establish and document a default port convention. A common one: HTTP on `8080` (serving
health endpoints) and HTTPS on `8081` (reserved for direct TLS termination; in most
environments TLS is handled at the ingress layer). Do not expose additional ports without
documenting them and updating the relevant manifests.

These in-container ports are unaffected by host port collisions between solutions — see
`.agents/standards/repository-structure.md` → *Local port allocation* for the convention on
ports exposed to the host (Compose `ports:` mappings, `hostPort`, `port-forward`), which is a
distinct concern from the container's own internal port.

## OCI labels

Every final image must carry at least the OCI version label, populated from a `VERSION`
build argument set by the CI/CD pipeline at build time (matching the release tag):

```dockerfile
ARG VERSION=0.0.0
LABEL org.opencontainers.image.version=${VERSION}
```

The default `0.0.0` is a safe placeholder for local builds. `org.opencontainers.image.source`,
`.revision`, and `.created` are recommended for traceability and may be required by policy.

## Image naming and registry

Images follow the pattern `{REGISTRY}{image-name}:{VERSION}`, where `REGISTRY` is empty
for local images or the registry host (trailing slash) for remote ones, `image-name` is
the kebab-case service name, and `VERSION` is the build version injected at CI build time.
The registry is never hardcoded in manifests — it is injected at deploy time via an
environment variable. `solution/deployment.md` documents the image names and registry
convention in use.

## See also

- `.agents/standards/deployment.md` — target-agnostic deployment discipline.
- `.agents/standards/technologies/kubernetes.md` — deploying these images to Kubernetes.
- `.agents/standards/technologies/c-sharp.md` — .NET build conventions referenced above.
- `.agents/standards/repository-structure.md` — host-exposed local port allocation.
