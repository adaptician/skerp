---
title: API Standards
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Designing or implementing an HTTP/API surface — endpoints, contracts, versioning, error envelopes.
disposition: >
  mechanise — REST convention and versioning rules are candidates for a contract test once an API
  project exists.
last-reviewed: 2026-08-17
---
# API Standards

## REST Conventions

- Follow REST conventions for resource naming, HTTP verbs, and status codes.
- Resource names are plural nouns: `/invoices`, `/payments`, not `/getInvoices`.
- Use HTTP verbs semantically: `GET` for reads, `POST` for creates, `PUT`/`PATCH` for updates, `DELETE` for deletes.
- `PUT` replaces the full resource. `PATCH` applies a partial update.

## Versioning

- All APIs must be versioned.
- Version via URL path prefix: `/api/v1/invoices`. Do not version via headers or query strings — URL versioning is explicit and cacheable.
- Increment the major version when introducing breaking changes. Additive changes (new optional fields, new endpoints) do not require a version bump.
- Maintain at least one prior version when deprecating. Communicate deprecation timelines clearly.

## DTOs

- DTOs must not expose persistence entities directly. Map domain and persistence types to dedicated request/response types before they cross the API boundary.
- Request DTOs represent intent — what the caller wants to do. Response DTOs represent outcome — what the caller needs to know. They serve different purposes and must not be conflated.
- Validate request DTOs at the API boundary before they reach the Application layer.

---

## Security

Security is enforced at the API boundary, before any business logic runs. A request that fails any security check must never reach a service, a domain object, or a repository. The API boundary is the first and primary line of defence.

### Enforcement Order

Every secured endpoint enforces checks in this order:

1. **Authentication** — who is making this request?
2. **Feature gate** — is this feature currently available?
3. **Authorization** — is this actor permitted to perform this action?

Authentication always runs first. An unauthenticated caller should not learn whether a feature exists, is disabled, or requires a specific permission — that is information disclosure. Subsequent checks only run against authenticated identities.

---

### Authentication

All endpoints require authentication unless explicitly and deliberately marked as public. Anonymous access is the exception, not the default.

- Apply `[Authorize]` at the controller or endpoint group level as the default posture.
- Mark public endpoints explicitly with `[AllowAnonymous]` so the decision to permit anonymous access is visible and deliberate in the code. The absence of `[Authorize]` is not an acceptable way to leave an endpoint open.
- Authentication failures return **401 Unauthorized**.

---

### Feature Gates

A feature gate is a system-level switch. When a feature is enabled, it is available. When it is disabled, nothing under that feature may be used — regardless of who the caller is or what permissions they hold. Feature gates answer the question: *is this capability ready and available in the system right now?*

Feature gates are not a substitute for permissions. A feature being enabled does not mean every user can access it — that is what permissions govern. A feature being disabled means *no one* can access it, at the system level.

Feature gates serve two purposes in a CI/CD workflow:

1. **Hiding incomplete work.** Code can be deployed behind a disabled feature gate during development. The feature is invisible to users until the gate is opened, enabling trunk-based development without feature branches.
2. **Operational isolation.** A released feature can be disabled as a triage action when something goes wrong — a kill switch that halts damage without a deployment. For this to be effective, feature isolation must be maintained even after release.

#### Response Codes

| Scenario | Status Code | Reason |
|---|---|---|
| Feature not yet released (release toggle, currently disabled) | **404 Not Found** | The endpoint does not exist from the caller's perspective. Avoids revealing that a feature is in development. |
| Feature operationally disabled post-release (kill switch) | **503 Service Unavailable** | Signals a temporary system-level condition, not a user-level restriction. Implies the service will return. |

Do not return **403 Forbidden** for a disabled feature gate. 403 implies the caller lacks permission — which may be true — but for a disabled feature, the correct signal is that the capability is not available at the system level, not that the individual caller is restricted.

#### Feature Toggle Taxonomy

This project uses Martin Fowler's feature toggle taxonomy. Agents and contributors reading requirements that mention toggle types, canary releases, or dynamic toggles should interpret them according to the following definitions.

| Toggle Type | Purpose | Longevity | Dynamism | Default Storage |
|---|---|---|---|---|
| **Release toggle** | Hides incomplete features during active development. Opened when the feature is ready to ship. | Short — days to weeks. Should not outlive the feature's release. | Static | App configuration |
| **Ops toggle** | Operational kill switch. Disables a released feature during an incident or as a circuit breaker. | Medium to permanent standby. | Dynamic | Database |
| **Experiment toggle** | Controls A/B tests, multivariate tests, and canary cohorts. Activated for a percentage of traffic or a defined user segment. | Short to medium — the duration of the experiment. | Dynamic | Database or dedicated toggle service |
| **Permission toggle** | Grants access to a feature for a specific user segment — beta users, premium tier, early access group. Not the same as authorization permissions (see note below). | Long-lived, tied to the user segment's lifecycle. | Dynamic | Database |

**A note on naming: permission toggles vs. permissions.** Fowler's "permission toggle" and this project's authorization "permissions" are different concepts that share a word. A *permission toggle* is a feature gate scoped to a user segment — it controls which users can see a feature. An authorization *permission* controls what actions a user is allowed to perform within a feature. Both can restrict access, but they operate at different levels and are enforced through different mechanisms. When a requirement mentions a "permission toggle," it is describing a feature gate, not an authorization permission.

**Examples:**

*Beta access to a new reporting dashboard.* A permission toggle enables the dashboard for users enrolled in the beta programme — everyone else sees nothing. Among those beta users, authorization permissions then determine what each individual can do: one user has `Permission.Reports.View`, another has `Permission.Reports.View` and `Permission.Reports.Export`, a third has full access including `Permission.Reports.Create`. The toggle controls who enters the door; the permissions control what they can do inside.

*Premium tier feature.* A permission toggle makes an advanced analytics feature visible only to customers on the Premium subscription plan. A customer on the Free plan cannot see or reach the feature at all. A Premium customer who can reach it still needs `Permission.Analytics.View` to read data and `Permission.Analytics.Configure` to adjust settings — their subscription unlocks the door, but their individual permissions determine what they can touch.

*Early access programme.* A new AI assistant feature is hidden from all users by default (release toggle). When it is ready for limited rollout, a permission toggle opens it to users who opted into the early access programme. Full release later removes the toggle entirely and the feature becomes universally available, after which only authorization permissions remain — controlling who may use the assistant versus who may manage its configuration.

In each case, the permission toggle and the authorization permissions are applied independently. The toggle is about feature availability for a segment; the permissions are about action-level access for an individual. Removing the toggle (making a feature universally available) does not change or remove the permissions beneath it.

#### Canary Release

A canary release is a term that spans both deployment strategy and feature toggle usage — it is worth distinguishing the two.

- **Canary as a deployment strategy**: two versions of the application run simultaneously, and a percentage of incoming traffic is routed to the new version. This is an infrastructure-level concern, not a feature toggle.
- **Canary as a feature toggle**: a single version of the application runs, and a feature is enabled for a defined subset of users or a percentage of traffic via an experiment toggle. This is what Fowler's taxonomy covers.

When requirements mention a "canary release," clarify which meaning is intended. If it is toggle-based, implement it as an experiment toggle (dynamic, stored in the database).

#### Static vs. Dynamic Toggles

**Static toggles** are read at application startup from configuration. Changing them requires a configuration change followed by a restart or redeployment. They are appropriate for toggles that are expected to change rarely and in coordination with a deployment event.

- **Lives in:** app configuration — `appsettings.json`, environment variables, Azure App Configuration (without dynamic refresh). The release toggle is the canonical static toggle: it is flipped as part of a deliberate release action.

**Dynamic toggles** are read at runtime from a store that can be updated without restarting the application. They are appropriate for toggles that must respond quickly — operational kill switches that cannot wait for a deployment, or experiment cohorts that need to shift in real time.

- **Lives in:** the database, or a dedicated feature flag service (Azure App Configuration with dynamic refresh, LaunchDarkly, Unleash, or equivalent).

Default classification:

| Toggle Type | Default Storage |
|---|---|
| Release toggle | App configuration (static) |
| Ops toggle | Database (dynamic) — a kill switch that requires a deployment defeats its own purpose |
| Experiment toggle | Database (dynamic) |
| Permission toggle | Database (dynamic) |

#### Naming Convention

Feature IDs use an underscore-delimited format rooted at `Feature`, using `PascalCase` segments:

```
Feature_{Domain}
Feature_{Domain}_{SubFeature}
```

Examples:

```
Feature_Payments
Feature_Payments_Invoices
Feature_Reports
Feature_Reports_Export
```

This convention is preferred over flat `PascalCase` (e.g. `FeaturePaymentsInvoices`) because the hierarchy is legible at a glance. Underscores are used rather than dots because this project deploys to Linux containers (Docker) and Azure Functions — Linux environment variable names may only contain letters, digits, and underscores. Dots are illegal characters in Linux env var names and cannot be rescued by .NET's double-underscore hierarchy separator (`__`), which maps `A__B` to the config path `A:B`, not to a dotted key name.

**How environment variable overrides work:** .NET uses `__` as the configuration section separator in environment variable names. To set `FeatureManagement:Feature_Payments_Invoices` via an environment variable:

```
FeatureManagement__Feature_Payments_Invoices=false
```

This is valid on Linux, Windows, Docker Compose, Kubernetes env blocks, and Azure Functions Application Settings.

`Microsoft.FeatureManagement` accepts any string as a feature ID. The underscore convention is a project standard, not a library requirement.

A parent feature governs everything beneath it. Disabling `Feature_Payments` disables `Feature_Payments_Invoices` and all endpoints under it. Individual sub-features can be disabled independently without affecting siblings.

#### Implementation (ASP.NET Core)

Use `Microsoft.FeatureManagement` as the standard feature management library. It integrates with ASP.NET Core's configuration system for static toggles and supports custom `IFeatureDefinitionProvider` implementations for dynamic toggles backed by the database.

Apply feature gates at the endpoint level using the `[FeatureGate]` attribute:

```csharp
[FeatureGate("Feature_Payments_Invoices")]
[HttpGet("invoices")]
public async Task<IActionResult> GetInvoices(...)
```

Static toggle configuration in `appsettings.json` using the `Microsoft.FeatureManagement` schema:

```json
{
  "feature_management": {
    "feature_flags": [
      { "id": "Feature_Payments", "enabled": true },
      { "id": "Feature_Payments_Invoices", "enabled": false }
    ]
  }
}
```

To override a static flag at runtime via environment variable (Docker, Kubernetes, Azure Functions Application Settings):

```
FeatureManagement__Feature_Payments_Invoices=false
```

Dynamic toggles override static configuration at runtime via a custom provider reading from the database.

---

### Authorization — Permissions

A permission dictates whether a specific actor may perform a specific action. Permissions apply to authenticated users and to system users (service accounts, background workers). They answer the question: *is this actor allowed to do this?*

Permissions are enforced after authentication and after feature gates have passed. A request that is authenticated and whose feature gate is open still fails if the actor lacks the required permission for the specific action.

#### Granular Endpoints, Granular Permissions

Each endpoint should be governable by a single permission and a single feature gate. This promotes:

- **Auditability** — the permission required for any endpoint is visible and unambiguous.
- **Least privilege** — users can be granted exactly the access they need, and no more.
- **Maintainability** — changing what a permission covers affects only the endpoints explicitly assigned to it.

**Composite authorization is a design smell.** An endpoint that requires two permissions to access — for example, both `Permission.Payments.View` *and* `Permission.Reports.Read` — is doing two things. Treat this as a signal to split the endpoint. A single endpoint serving a single purpose requires a single permission.

#### Explicit View Permissions

Every resource must define an explicit `View` permission. Do not rely on a parent permission node as a stand-in for view access.

The problem with parent-as-view: if `Permission.Payments.Invoices` is used as a select-all mechanism (granting it implies all child permissions), then it becomes impossible to grant view-only access. Either all child permissions are granted, or none are. The result is that fine-grained access control cannot be expressed, and the system is forced to over-grant permissions.

By defining `Permission.Payments.Invoices.View` explicitly, a user can be granted the ability to see invoices without being granted the ability to create, update, or delete them.

#### Permission Naming Convention

Permission keys follow a hierarchical dotted format rooted at `Permission`, ending in the action verb:

```
Permission.{Domain}.{Resource}.{Action}
```

Examples:

```
Permission.Payments.Invoices.View
Permission.Payments.Invoices.Create
Permission.Payments.Invoices.Update
Permission.Payments.Invoices.Delete
```

Standard baseline actions — `View`, `Create`, `Update`, `Delete` — cover most resources. They are CRUD in intent but named after the domain action rather than the HTTP method. Use them as the default set when defining permissions for a new resource.

#### Domain-Specific Permission Verbs

When a resource supports actions that do not map cleanly onto the CRUD baseline, define a domain-specific verb that names the action as the business understands it. This is an application of the ubiquitous language principle: the permission should speak in domain terms, not technical terms.

```
Permission.Payments.Invoices.Approve
Permission.Payments.Invoices.Void
Permission.Payments.Invoices.Submit
Permission.Documents.Export
Permission.Users.Impersonate
```

Never stretch a CRUD verb to cover a domain-specific action. `Update` does not describe approval. `Delete` does not describe voiding. Use the word the business uses.

#### Parent Permissions and Grouping

Parent permission nodes may be used to govern API groupings — a parent permission that, when absent, denies access to an entire resource group. However:

- Parent nodes must not be used as a substitute for leaf-level permissions on individual actions.
- Granting a parent permission does not implicitly grant child permissions. The system must evaluate each leaf permission independently.
- Disabling a parent permission should deny access to the group as a whole, while still allowing fine-grained control at the leaf level for actors who hold it.

#### Implementation (ASP.NET Core)

Define permissions as authorization policies and apply them at the endpoint level:

```csharp
[Authorize(Policy = "Permission.Payments.Invoices.View")]
[FeatureGate("Feature_Payments_Invoices")]
[HttpGet("invoices")]
public async Task<IActionResult> GetInvoices(...)
```

The order of attributes reflects the enforcement order: authentication (implied by `[Authorize]`), then feature gate, then permission policy. Declare them in this order consistently so the security posture of an endpoint is readable at a glance.

Register permission policies during application startup against a permission store (database, claims, or identity provider). Do not hard-code permission checks inline in handler logic — permissions belong at the API boundary.

---

### Security Posture Checklist

Before an endpoint is considered complete, verify:

- [ ] Authentication is required (`[Authorize]` present, or `[AllowAnonymous]` is a deliberate documented decision).
- [ ] A feature gate is applied if the endpoint belongs to a gated feature (`[FeatureGate(...)]`).
- [ ] A permission policy is applied for the specific action (`[Authorize(Policy = "...")]`).
- [ ] The permission key follows the naming convention and the `View` permission is defined explicitly for the resource.
- [ ] The response code for a disabled feature gate is 404 (unreleased) or 503 (operational kill switch), not 403.
- [ ] No business logic executes before all three checks pass.

---

## State Ownership and Data Integrity

The backend is the authoritative source of all persisted state. A client may display state and initiate mutations, but it never owns state and must never be trusted to supply it accurately. Data that has passed through a client — regardless of where it originated — is untrusted input.

### The Round-Trip Problem

A common and dangerous pattern: the backend serialises a record and sends it to the client; the client sends it back (modified or not); the backend persists what it received. This chain is unsafe. The client-provided payload may have been tampered with, corrupted, or simply stale. The backend has no way to distinguish a legitimate round-trip from a manipulated one, and must not try — the correct response is to never treat a client-provided payload as a faithful representation of persisted state.

The rule: **reconstruct state server-side; do not persist client-provided state directly.** When a mutation is requested, the backend reads the current state from the authoritative store, applies only the changes the endpoint is designed to accept, and persists the result. The client's payload is input to a deliberate operation, not a replacement for the stored record.

### Explicit Mutation Endpoints

Mutations must be performed through consciously designed endpoints that name and constrain the specific operation being performed. An endpoint that accepts an arbitrary snapshot of an entity and persists it wholesale is not a mutation endpoint — it is a backdoor.

Each endpoint is responsible for one specific operation, expressed in domain language. This is a direct application of ubiquitous language and the single responsibility principle to API design:

```
POST /invoices/{id}/submit     ← explicit domain operation
POST /invoices/{id}/void       ← explicit domain operation
PATCH /invoices/{id}           ← acceptable for editing bounded fields; the handler
                                  determines which fields are writable, not the payload
```

Prefer domain-verb endpoints over generic `PUT` for any operation that represents a meaningful state transition. `PUT /invoices/{id}` with `{ "status": "voided" }` allows any caller who can reach the endpoint to set `status` to any value; `POST /invoices/{id}/void` is explicit, auditable, and can enforce the business rules that govern voiding independently. See the permission naming conventions — domain-specific verbs like `Void`, `Submit`, `Approve` exist precisely because these are distinct operations with distinct rules.

### Accept Only What the Endpoint Owns

Request DTOs are the explicit contract of what an endpoint accepts. They must not mirror the full domain entity — they must contain only the fields that the caller is permitted to supply for that specific operation.

Fields the backend owns are never accepted from the client:

- System identifiers (`id`, foreign keys generated server-side)
- Audit fields (`createdAt`, `createdBy`, `modifiedAt`, `modifiedBy`)
- Calculated or derived values (totals, balances, aggregated counts)
- Status fields governed by domain rules (status transitions happen through explicit endpoints, not by the caller setting a field)

A request DTO that exposes these fields is a mass assignment vulnerability waiting to be exploited — even if no current caller supplies them maliciously, the contract permits it. The fix is not validation; it is removing the fields from the DTO entirely.

### Write Only What Changed

When persisting the result of a mutation, only the fields that the operation is designed to change should be written. Overwriting fields that were not part of the operation is unnecessary, and in the case of concurrent writes, destructive.

This applies at the persistence layer — see `.agents/standards/persistence.md` for the implementation rule. The API-level principle is: the handler for a mutation endpoint updates a bounded set of fields that corresponds exactly to the operation's intent. A `submit` operation touches `status` and `submittedAt`. It does not re-save the full entity.
