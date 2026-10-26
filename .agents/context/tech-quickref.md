# Tech quickref

How to operate the solution. The stack and layout are in the root `README.md`; this file is the
command list an agent needs to verify its work.

| Task | Command (repository root unless noted) |
|---|---|
| Install | `npm install` in `client/` (all Node packages live there) |
| Run API + client | `npm start` in `client/` → client <http://localhost:4200>, API <http://localhost:5000>, Swagger `/swagger` |
| Run one side | `npm run start:api` · `npm run start:client` (in `client/`) |
| Quality gate | `node .agents/scripts/verify.mjs` (backend build/format/test, client lint/test/format) |
| Backend tests | `dotnet test` |
| Client tests / lint / format | `npm test` · `npm run lint` · `npm run format:check` (in `client/`) |
| Add a migration | `dotnet tool restore` then `dotnet ef migrations add <Name> --project src/Skerp.Infrastructure --startup-project src/Skerp.Api --output-dir Persistence/Migrations` |
| Reset the database | stop the app, delete `src/Skerp.Api/App_Data/skerp.db*` |

- Node 24.19.0 is pinned; with fnm in Git Bash: `eval "$(fnm env --shell bash)" && fnm use 24.19.0`.
- Configuration keys: `.build/config/env-variables.md`.
- Figma: file `yzLk80i2s6D2NaP0CO0Irc`; frames are cited from `.agents/standards/solution/figma-screen-index.json`.
