# Configuration keys and environment variables

The master list of every configuration value the solution reads. Any key can be overridden by an
environment variable, with `__` in place of `:` (for example `ConnectionStrings__Skerp`).

## API (`src/Skerp.Api/appsettings.json`)

| Key | Environment variable | Default | What it does |
|---|---|---|---|
| `ConnectionStrings:Skerp` | `ConnectionStrings__Skerp` | `Data Source=App_Data/skerp.db` | The SQLite database. A relative path resolves against the API's content root. |
| `Seeding:Enabled` | `Seeding__Enabled` | `true` | When `false`, migrations still run but no seeder does. |
| `SystemTime:OverrideEnabled` | `SystemTime__OverrideEnabled` | `false` | Outside Production, makes the API's clock return `SystemTime:UtcNow`. |
| `SystemTime:UtcNow` | `SystemTime__UtcNow` | unset | The fixed UTC time used when the override is on (ISO 8601). Required when the override is on. |
| `FeatureManagement:Feature_PurchaseOrders` | `FeatureManagement__Feature_PurchaseOrders` | `false` (`true` in the `http` launch profile) | Release toggle for Purchase Order Management (Epic AB#1429). Off: every purchase-order, customer and product endpoint answers 404 and the client shows the Purchase Orders placeholder. `GET /api/v1/features` lists the toggles that are on. |
| `ASPNETCORE_ENVIRONMENT` | same | `Development` (launch profile) | Development turns on Swagger UI and the configurable clock. |

## Client (`client/src/environments/`)

| Key | Default | What it does |
|---|---|---|
| `apiBaseUrl` | `/api/v1` | Base path of the API; `v1` is the API version segment (API version 1.0, the default, read by `Asp.Versioning`). In development the dev server proxies `/api` to `http://localhost:5000` (`client/proxy.conf.json`), so every version of the API is reached through it. |
