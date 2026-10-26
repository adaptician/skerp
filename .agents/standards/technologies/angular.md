---
title: Frontend — Angular
tier: 1
enforced-by: [verify.mjs, review, prose-only]
applies-when: >
  Writing Angular code.
disposition: >
  mechanise — an ESLint/stylelint configuration is the single highest-leverage mechanisation missing
  here; verify.mjs's frontend-lint/frontend-test checks activate once npm scripts exist, but currently
  have no lint config to run.
last-reviewed: 2026-09-08
---
# Frontend — Angular

This file documents Angular-specific standards. The general client principles — loading states, reliability patterns, security reflection, authentication lifecycle, screen vs component architecture, lazy loading, environment configuration, and documentation — are in `.agents/standards/client.md` and apply here without exception. This file describes how those principles are implemented in Angular.

---

## Naming Conventions

| Element | Prefix | Example |
|---|---|---|
| Feature components | `adapt` | `adapt-invoice-list` |
| Common / shared components | `a` | `a-button`, `a-modal` |

These prefixes prevent naming collisions and make it immediately apparent whether a component is feature-specific or shared.

---

## Project Structure

### Feature Areas

Each feature is self-contained under `src/app/features/<feature-name>/`:

```
src/app/features/<feature-name>/
├── components/       ← Presentational components scoped to this feature
├── pages/            ← Route-level container components (screens)
├── services/         ← Feature-scoped services and API clients
├── models/           ← Feature-scoped interfaces, types, and enums
├── state/            ← NgRx store: actions, reducers, selectors, effects
└── README.md         ← Feature overview and design notes
```

Pages are screens — they are tied to routes, orchestrate data loading, and compose feature components. Components are reusable presentational units. Services handle data access. State manages the NgRx store slice for this feature.

### Shared / Common Elements

Elements that are used across more than one feature live under `src/app/common/`:

```
src/app/common/
├── components/       ← Shared presentational components (prefixed `a-`)
├── directives/       ← Shared structural and attribute directives
├── pipes/            ← Shared transformation pipes
├── guards/           ← Route and navigation guards
├── interceptors/     ← HTTP interceptors
└── services/         ← Application-wide services (auth, notifications, etc.)
```

Nothing in `src/app/common/` should import from a feature folder. Common elements are shared by features; features are not shared by common elements. If a component or service in `common/` begins importing from a feature, it has moved to the wrong location.

**Promoting a feature-local component to `common/`.** A component built for one feature — a button
with a click-gleam animation, say — is a candidate for promotion the moment a second, unrelated
feature needs the same thing. Moving it to `common/components/` (renaming/re-prefixing to `a-` per
the naming table above, and generalizing any feature-specific assumptions out of its inputs) is
preferable to a second feature building its own copy. See `.agents/standards/client.md` → *Reuse,
Duplication, and When to Refactor* for how to weigh the risk of that move against its benefit before
doing it.

### Root Application

Keep the root `app.ts` (or `app.component.ts`) minimal. It should set up routing, apply global layout structure, and delegate everything else to feature modules or standalone component routes. No business logic, no API calls, no feature-specific concerns belong here.

---

## Components

### Standalone Components

Prefer standalone components. Angular's standalone API eliminates the need for `NgModule` declarations for individual components and makes dependency relationships explicit at the component level.

- Use `standalone: true` in component metadata.
- Import only what the component directly uses — do not import entire modules to access one directive.
- Shared elements used across many components (common pipes, directives, form modules) can be re-exported from a shared import barrel if the repetition becomes impractical — but keep the barrel small and purposeful.

### Smart vs Presentational Components

- **Presentational components** receive data via `@Input()` and communicate events via `@Output()`. They do not inject services, do not access the NgRx store, and do not make API calls. Their behaviour is entirely determined by their inputs.
- **Smart components** (pages and container components) inject services and selectors, dispatch actions, and manage data flow. They compose presentational components and wire them to application state.

A presentational component that begins injecting a service or accessing the store has become a smart component. This is sometimes appropriate — but it should be a deliberate decision, not a drift. When a component needs to access state, consider whether it should be promoted to a container or whether the parent should pass the data down as an input.

### Component Encapsulation

A component should be drop-in reusable: given the right inputs, it must function correctly in any context. Design for this from the start.

- Do not reach into a parent's state from a child component.
- Do not assume specific routing structure from within a component.
- Do not embed fixed screen dimensions, layout assumptions, or z-index values that couple the component to a specific placement.

---

## Services

- Services handle data access, API communication, and shared application behaviour.
- Feature-scoped services live in the feature's `services/` folder. Application-wide services live in `common/services/`.
- Inject services via the constructor. Use Angular's DI system — do not instantiate services directly.
- Services that communicate with the API should return `Observable` streams. Avoid subscribing inside a service; return the observable and let the caller decide when to subscribe.
- Services should not manage component lifecycle or UI state directly. State belongs in NgRx; UI behaviour belongs in components.

---

## Directives

Directives encapsulate reusable DOM behaviour — conditional visibility, access control, formatting, interaction patterns. If the same DOM manipulation or attribute behaviour is applied in more than one place, it belongs in a directive.

Common cases for directives in this project:

- **Permission directives** — show, hide, or disable elements based on the current user's permissions. A `[hasPermission]="'Permission.Payments.Invoices.View'"` directive is more expressive and more consistent than duplicating permission checks in every component.
- **Feature gate directives** — hide elements when a feature is disabled. Mirrors the server-side feature gate in the UI.
- **Loading state directives** — apply a loading class or skeleton state to a host element while an async operation is pending.

---

## Pipes

Pipes encapsulate reusable value transformations. If a transformation is applied in more than one template, extract it as a pipe.

- Pipes should be pure by default. Impure pipes re-run on every change detection cycle; they are expensive and should be used only when necessary.
- Name pipes after what they do to their input: `InvoiceStatusLabelPipe`, `RelativeDatePipe`, `CurrencyDisplayPipe`.
- Document the pipe's input type, output type, and any parameters in a documentation comment above the class.

---

## State Management (NgRx)

NgRx is the standard for application state management. Feature state is co-located with the feature under `state/`.

- **Actions** — named after what happened, not what should happen. `InvoiceLoaded`, `InvoiceLoadFailed`, `InvoiceSubmitRequested`.
- **Reducers** — pure functions. No side effects. No API calls.
- **Effects** — handle side effects: API calls, navigation, notifications. An effect listens for an action, performs a side effect, and dispatches a result action.
- **Selectors** — composable, memoised. Never select raw slice state from a component — always go through a selector.
- **Store updates after write operations** — after a successful write, update the store to reflect the new state. Do not rely on a subsequent read to refresh the UI; update local state optimistically and reconcile if the server returns a different value.

---

## Routing and Lazy Loading

Organise routes so that feature areas can be lazy loaded. Each feature should be loadable as an independent chunk — loaded on first navigation to the feature and cached thereafter.

```typescript
// In the root router:
{
  path: 'payments',
  loadChildren: () =>
    import('./features/payments/payments.routes').then(m => m.PAYMENTS_ROUTES)
}
```

- Features must not have hard imports from other feature modules. Cross-feature dependencies create coupling that prevents effective lazy loading. If Feature A depends on Feature B's service, extract the shared service to `common/`.
- If a feature cannot be lazy loaded due to existing cross-feature coupling, document the dependency as a concern in the feature's `README.md`.
- Shared common infrastructure (guards, interceptors, common services) is eagerly loaded as part of the application shell. Do not lazy load it.

---

## Guards

Route guards enforce the authentication, permission, and feature gate reflection described in `.agents/standards/client.md`. They prevent navigation to a protected route before content is rendered.

- **`AuthGuard`** — redirects unauthenticated users to the login flow before any protected route is activated. Apply to all authenticated routes.
- **`PermissionGuard`** — checks whether the current user holds the permission required for the route. Redirects or shows an access-denied state if not.
- **`FeatureGuard`** — checks whether the feature governing the route is enabled. Redirects if the feature is disabled, consistent with the API's 404 (unreleased) or 503 (operational kill switch) response.

Guards are the routing-level equivalent of the API's enforcement order: authentication first, feature gate second, permission third.

---

## HTTP Interceptors

Interceptors handle cross-cutting HTTP concerns:

- **Auth interceptor** — attaches the current user's authentication token to outgoing requests. Detects 401 responses and triggers the re-authentication flow.
- **Error interceptor** — catches HTTP errors globally, maps them to structured error states, and dispatches appropriate NgRx actions or triggers global notification behaviour.
- **Loading interceptor** — tracks in-flight requests to drive global loading state if a global indicator is used in addition to component-level feedback.

Interceptors should be registered in the application's HTTP provider configuration, not scattered across services.

---

## Forms

- Use Angular Reactive Forms for any form with validation logic, dynamic fields, or programmatic control. Template-driven forms are acceptable only for trivially simple, static forms.
- Validators should be extracted as reusable validator functions when used in more than one form.
- Display validation errors at the field level and in context. A form-level error summary may supplement field-level errors but should not replace them.
- Disable the submit control while a form is invalid or while a submission is in progress. Never allow a submit action to proceed with invalid data.
- On submission, disable all form controls to prevent editing while the request is in flight.

---

## Styling

Angular is configured to use **SCSS** as the default stylesheet format (`"style": "scss"` in `angular.json`). Do not use LESS or plain CSS for new files.

Component stylesheets are co-located with the component (`.component.scss`). Global styles, design tokens, and theme definitions live under `src/styles/`. The full design token architecture — primitives, semantic tokens, component tokens, and theme switching — is documented in `.agents/standards/styling.md`.

Angular's component encapsulation (`ViewEncapsulation.Emulated`, the default) scopes component styles to the component. CSS custom properties (Layer 2 and Layer 3 tokens) pierce this boundary through inheritance, which is why they are the correct mechanism for theming across encapsulated components. Do not disable `ViewEncapsulation` to work around styling scoping issues — use CSS custom properties instead.

---

## Environment Configuration

Angular's environment file system is the standard mechanism for environment-specific configuration. All values that differ between environments — API base URLs, auth provider endpoints, feature flag overrides for local development — must be in the environment file, not hardcoded in source.

```
src/environments/
├── environment.ts           ← Local development defaults
├── environment.staging.ts
└── environment.production.ts
```

- Never hardcode a URL, API key, or environment identifier in a component, service, or module.
- The `environment.ts` file should be complete enough that a new developer can clone the repository and run the application locally without modifying any source files beyond their environment file.
- Sensitive values (API keys, client secrets) must not be committed to source. Reference them via placeholders or CI-injected variables.

---

## Documentation

- Every feature folder must have a `README.md` describing what the feature does, its primary pages and components, and any non-obvious design or state management decisions.
- Shared components in `common/components/` should have documentation comments on their `@Input()` and `@Output()` properties — what they accept, what they emit, and any constraints.
- Pipes and directives in `common/` should document their contract: what they transform or apply, what inputs they accept, and any side effects.
- Do not document the obvious. A comment that restates what the code already says adds noise. Comment on intent, constraints, and non-obvious decisions.
