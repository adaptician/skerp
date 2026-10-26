The deliverable solution is a small web application which will be for internal demonstration purposes only.
It should be simple, well-structured, and easy to run with minimal setup.

The README.md at the solution root must include a concise onboarding overview and setup instructions.

# Objective:
The app is targeted at a small internal sales team that needs to create and manage customer purchase orders and track their statuses.

# Actions:
- View, search, and filter purchase orders from a paginated list screen, including line items.
- Capture new purchase orders with line items.
- Update existing purchase orders and line items.
- Delete purchase orders and associated line items.

# Technology Overview:
- Client-server architecture
- Backend: C# with ASP.NET Core (.NET 10) using minimal APIs with a REST-style.
- Frontend: Angular 21 with Typescript 5 using SCSS; disable SSR.
- Mobile-friendly: all client components should use responsive breakpoints and a token design system (.agents\standards\styling.md). 
- Storage: SQLite with Entity Framework Core using code-first migrations.
- Include Swagger and Swagger UI for API testing.
- Use SignalR when live updates need to be sent to the client-side.
- Use XUnit for unit tests with FluentAssertions, NSubstitute and Vitest with Angular Testing Library.

# Out of Scope:
- User Identity
- Authorization and Authentication
- Tax calculations such as VAT
- Currency conversions
- Rate limiting
- Deployments - the solution will be used for local demonstration only.
- Concurrency safety.

# Architecture

The solution should be structured using a Clean Screaming Architecture (.agents\standards\architecture.md) with a mirrored structured for unit tests (.agents\standards\testing.md).

Include logical tests in the Angular client. Never rely on config, data contents, or text copy for tests - substitute with mock data where needed. 

Focus test coverage on logical changes and constraints.

You may include tests to confirm client look-and-feel - flag them with comments when raising a PR and a reviewer will choose if they stay.

# Solution setup in root README.md

The README should cover:

- Prerequisites, using the versions pinned in global.json and .tool-versions.
- One command to run the API and the Angular client together.
- Migrations and seed data applied on startup.
- Where the SQLite file lives and how to reset it.
- The Swagger URL.
- How to toggle Demo Mode.
- Test commands.