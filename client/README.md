# Sharp ERP client

The Angular 21 client, with every Node file of the solution. `npm start` here runs it together with
the API; see the root
[`README.md`](../README.md).

## Layout

| Path | Holds |
|---|---|
| `src/styles/` | The design tokens, mirrored from the Figma variables: `_colors.scss` (Layer 1 primitives), `_themes.scss`, `_spacing.scss`, `_typography.scss`, `_elevation.scss` (Layer 2), and global Layer 3 partials such as `_buttons.scss` |
| `src/app/common/` | Shared code used by more than one feature: `components/` (`a-` prefix), `services/`, `interceptors/`, `models/` |
| `src/app/features/<feature>/` | One folder per feature, each with its own `README.md` |
| `public/icons/` | The `Icon/*` set exported verbatim from Figma, drawn by `a-icon` |

## Talking to the API

Use `ApiClient` (`common/services/api-client.ts`). It prefixes `/api/v1`, unwraps the Result envelope,
and errors with an `ApiError`. Failures appear in the error popup automatically; pass
`{ errorTitle: 'Could not …' }` to name the operation, or `{ suppressErrorPopup: true }` when the screen
shows the failure itself (for example beside a form field).

## Commands

Run from `client/`.

| Command | Does |
|---|---|
| `npm start` | The API on <http://localhost:5000> and the dev server on <http://localhost:4200> together |
| `npm run start:client` / `npm run start:api` | One side only |
| `npm test` | Vitest unit and component tests, once |
| `npm run lint` | angular-eslint |
| `npm run format` / `npm run format:check` | Prettier |
