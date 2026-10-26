# Skerp

A slice of an ERP system that showcases managing customer purchase orders. Users know it as
**Sharp ERP**; *Skerp* is the code name used in the repository (see [`solution-identity.md`](solution-identity.md)).

It is a client–server app for local demonstration:

- `src/` — the .NET 10 API (ASP.NET Core minimal APIs, EF Core with SQLite) in Clean Architecture:
  `Skerp.Domain`, `Skerp.Application`, `Skerp.Infrastructure`, `Skerp.Api`.
- `tests/` — `Skerp.Unit.Tests` and `Skerp.Integration.Tests` (xUnit, FluentAssertions, NSubstitute).
- `client/` — the Angular 21 client (TypeScript, SCSS, Vitest with Angular Testing Library).

## Video Walkthrough

[Introductory Loom Video](https://www.loom.com/share/99a176d72b54478ea1ad7d62c87d8d87)

[More detailed walk-through](https://drive.google.com/file/d/1rWnovp1RU-uAkR0BqaFl7XGPh-na7d8C/view?usp=sharing)

## Prerequisites

| Tool | Version | Pinned in |
|---|---|---|
| .NET SDK | 10.0.100 or a later 10.0 feature band | [`global.json`](global.json) |
| Node.js | 24.19.0 (npm comes with it) | [`.tool-versions`](.tool-versions), [`.node-version`](.node-version) |

Nothing else is needed: the database is a SQLite file the API creates for you.

## Run it

From the `client/` folder:

```bash
cd client
```

```bash
npm install
```

```bash
npm start
```

`npm install` installs the client's packages. `npm start` runs the API and the client together; stop
both with Ctrl+C.

| What | Where |
|---|---|
| The app | <http://localhost:4200> |
| The API | <http://localhost:5000/api/v1> (the client proxies `/api` to it) |
| Swagger UI | <http://localhost:5000/swagger> |
| Health probes | <http://localhost:5000/health> (liveness), <http://localhost:5000/alive> (readiness) |

## The database

- On startup the API applies every pending EF Core migration and then runs every registered seeder
  (none yet; the purchase order work adds sample data), so a fresh clone needs no manual database step.
- The SQLite file lives at `src/Skerp.Api/App_Data/skerp.db` (git ignores it).
- **To reset it**, stop the app, delete `src/Skerp.Api/App_Data/skerp.db` and its `-shm` and `-wal`
  files if present, then run `npm start` in `client/` again. The API recreates it.

## Demo Mode

Demo Mode is the switch at the right of the navigation header. It is off on a first visit and
remembered in the browser (local storage) after that. When it is on, some screens deliberately relax
their client-side guard rails so a reviewer can watch the server refuse invalid changes on its own;
each relaxed behaviour is labelled with a "Demo note". To start again from off, switch it off or clear
the site's local storage.

## Tests and checks

| Check | Command |
|---|---|
| Backend build and format | `dotnet build`, `dotnet format --verify-no-changes` |
| Backend tests | `dotnet test` |
| Client tests | `npm test` (in `client/`) |
| Client lint | `npm run lint` (in `client/`) |
| Client formatting | `npm run format:check` (in `client/`) |

`node .agents/scripts/verify.mjs` runs all of the checks above as one quality gate, together with the
agent-governance checks (see [`AGENTS.md`](AGENTS.md)).

More about the local environment, ports and configuration:
[`.build/development/development-setup.md`](.build/development/development-setup.md).
