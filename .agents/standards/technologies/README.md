---
title: Technology-Specific Standards
tier: 2
enforced-by: [prose-only]
applies-when: >
  Index of stack-specific standards.
disposition: >
  mechanise — generate from frontmatter alongside the standards index, for the same reason as
  solution/README.md.
last-reviewed: 2026-09-08
---
# Technology-specific standards

This directory holds **stack-specific conventions** — the disciplines a particular
language, framework, platform, or tool requires that are *not* baked into the
technology itself. The durable, technology-agnostic standards live one level up in
`.agents/standards/`; the files here describe how those general standards are
*applied* in a concrete technology.

## How this directory is referenced

To keep references stable as the stack evolves, the root `AGENTS.md` routes to the
**category** standards (`backend.md`, `client.md`, `api.md`, …), never to individual
files here. Each category standard, in turn, indexes the technology files that
specialise it. Adding a technology is therefore a two-line change — create the file
here, add one link in its parent category standard — with no edit to `AGENTS.md`,
`CODEOWNERS`, or `owned-by-humans.md` (their globs already cover this folder).

| Technology file | Specialises | Covers |
|---|---|---|
| `c-sharp.md` | `backend.md` | C# / .NET: nullability, result types, DI, EF Core, naming, query performance |
| `angular.md` | `client.md` | Angular / NgRx: component and state conventions |
| `docker.md` | `deployment.md` | Container image build standards (multi-stage, non-root, OCI labels, image naming) |
| `kubernetes.md` | `deployment.md` | Kubernetes manifests + Kustomize base/overlays (probes, RBAC, network policies, secrets) |
| `aspire.md` | `deployment.md` / `c-sharp.md` | .NET Aspire local-dev orchestration and OpenTelemetry cost discipline |
| `figma.md` | `styling.md` / `client.md` | Figma as design source of truth: reading before work, spec references, drift handling, design systems, code↔design skills |

(Extend the table as files are added.)

## Adding a technology standard

1. Create `<technology>.md` here, named after the concrete technology: `python.md`,
   `go.md`, `react.md`, `nextjs.md`, `azure.md`, `websockets.md`, `tailwind-css.md`.
2. Keep it to the *conventions and disciplines the team imposes* — not a tutorial. If
   a rule is true of the technology everywhere, it does not belong here; if it is a
   choice this project makes, it does.
3. Open the file by pointing back to the general standard(s) it specialises (the way
   `c-sharp.md` points to `backend.md`, `principles.md`, and `architecture.md`). The
   general standard owns the *why* and the cross-cutting rule; the technology file
   owns the *how* in that stack.
4. Add a one-line link from the relevant category standard (`backend.md` for a server
   language, `client.md` for a UI framework, …) and a row to the table above.

A team adopting a technology adds a file here; a technology the project does not use simply has its file left in place — it costs nothing and is ready if the technology is adopted later. Neither requires touching `AGENTS.md`. Do not delete a standard to signal non-use: applicability is judged from what the project actually uses (a human-approved choice), not from a file's presence or absence.
