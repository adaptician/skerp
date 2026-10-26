# Solution Preparation — Epic overview (AB#1428)

Prepare Skerp for feature development. When this Epic is done, a contributor can clone the repository
and start the .NET 10 API and the Angular 21 client with one command. They can build against an approved
Figma design system. They land on a branded shell: background, navigation header with emblem, wordmark,
menu and Demo Mode toggle, and a welcome landing screen. Every quality-gate check runs and none is skipped.

Human-authored brief: [`brief.md`](brief.md). Deliverable vision:
[`../../deliverables/erp-web-app/README.md`](../../deliverables/erp-web-app/README.md).

## Features

| Feature | ADO | Plan |
|---|---|---|
| Initialize repository | AB#1430 | Already delivered by the scaffold commits; not re-planned here. |
| Development preparation | AB#1431 | [`features/development-preparation/README.md`](features/development-preparation/README.md) |
| Client Shell and Landing | AB#1432 | [`features/client-shell-and-landing/README.md`](features/client-shell-and-landing/README.md) |

**Order.** Development preparation comes first: its Design item (AB#1463) gates every UI Story in both
Epics. Client Shell and Landing comes next, and the Purchase Order Management Epic (AB#1429) builds on it.
