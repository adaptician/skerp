# Development setup

From nothing to a running Sharp ERP on your machine.

1. Install the **.NET SDK** that satisfies [`global.json`](../../global.json) (10.0.100, or a later 10.0
   feature band).
2. Install **Node.js 24.19.0** ([`.tool-versions`](../../.tool-versions)). With a version manager such as
   fnm, nvm or mise, run its `use` command in the repository root to pick it up.
3. Clone the repository, then run `npm install` in `client/`. Every Node package, including
   `concurrently` for the combined start, belongs to the client.
4. Run `npm start` in `client/`. The first start restores NuGet packages, builds the API, creates
   `src/Skerp.Api/App_Data/skerp.db` and applies the migrations.
5. Open <http://localhost:4200>.

## Working on one side only

| Task | Command |
|---|---|
| API only | `npm run start:api` in `client/` (or `dotnet run --project src/Skerp.Api --launch-profile http` from the root) |
| Client only | `npm run start:client` in `client/` (API calls fail with the "Could not reach Sharp ERP" popup) |
| Add a migration | `dotnet tool restore`, then `dotnet ef migrations add <Name> --project src/Skerp.Infrastructure --startup-project src/Skerp.Api --output-dir Persistence/Migrations` |

## Troubleshooting

- **Port already in use.** Another app holds 4200 or 5000. Stop it, or change the ports as described in
  [`development-environment.md`](development-environment.md).
- **A corrupt or outdated local database.** Stop the app and delete the files under
  `src/Skerp.Api/App_Data/`; the next start recreates them.
