---
title: MCP Configuration
tier: 2
enforced-by: [hook, prose-only]
applies-when: >
  Adding or changing an MCP server declaration in .mcp.json.
disposition: >
  keep — the file-write itself is hook-blocked pending human approval (owned-by-humans.md); the
  content conventions here (scoping, credential handling) remain review-only.
last-reviewed: 2026-09-08
---
# MCP Configuration

Model Context Protocol (MCP) servers extend an agent's capabilities by exposing additional tools, data sources, and integrations. This project declares its expected MCP servers in `.mcp.json` at the repository root.

## Purpose

`.mcp.json` is the manifest of MCP servers the project expects an agent to have available. It serves three purposes:

1. **Discoverability** — a contributor cloning the repo can see at a glance which MCP servers the work assumes.
2. **Reproducibility** — the same set of servers can be configured across machines without re-discovering them.
3. **Documentation** — the file is a record of which integrations the project has been built against.

The relationship to `package.json` is intentional: just as `package.json` declares runtime and library dependencies, `.mcp.json` declares *agent capability* dependencies.

A companion file, `mcp-servers.md`, also lives at the repository root: a human-readable index with one entry per server declared in `.mcp.json` (name, one-line purpose, link to its documentation). Keep the two in lockstep — every addition or removal in `.mcp.json` gets a matching entry change in `mcp-servers.md` in the same change. See `.agents/standards/repository-structure.md`. If a solution that should have a `.mcp.json` is missing one, ask for it rather than proceeding without it.

## Location

`.mcp.json` lives at the repository root. This is the convention recognized by Claude Code (which loads it automatically) and is a sensible default regardless of which client is used.

## Cross-tool compatibility

Different MCP-aware clients have different configuration conventions:

| Client | Configuration location |
|---|---|
| Claude Code | `.mcp.json` at repo root |
| Cursor | `.cursor/mcp.json` |
| Windsurf | `mcp_config.json` in the workspace |
| Codex | check current Codex documentation; the format is broadly compatible |

When working across multiple clients on the same project, keep `.mcp.json` at the root as the canonical source. Other tools' config files may reference or mirror it. Avoid duplicating server definitions in multiple places — it leads to drift.

## File format

`.mcp.json` is a JSON document with a single top-level key, `mcpServers`, mapping server names to their launch configuration:

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "<executable>",
      "args": ["<arg1>", "<arg2>"],
      "env": {
        "EXAMPLE_VAR": "value"
      }
    }
  }
}
```

- `command` is the executable to launch (a binary, `npx`, `uvx`, etc.).
- `args` is the argument vector passed to the command.
- `env` is optional and sets environment variables for the server process.

Some clients also support remote MCP servers via HTTP (`"type": "http"`, `"url": "..."`). When mixing local and remote servers, follow the receiving client's specific schema.

## Adding a server

1. Identify the MCP server you want to add and its launch instructions (typically published in the server's README).
2. Add an entry under `mcpServers` keyed by a short, stable name.
3. Prefer reproducible launch commands — `npx`, `uvx`, or other registry-fetched invocations — over paths to locally installed binaries.
4. If the server requires secrets (API keys, tokens), do **not** put them in `.mcp.json`. Reference an environment variable from the `env` block and document the required variable in the project README or in a `.env.example` file.
5. Commit the change. Other contributors and CI will pick up the server on their next session.

## Removing a server

When removing a server, capture the rationale: in the commit message for routine removals, or in an ADR under `.agents/adrs/` if the integration was load-bearing or its retirement constitutes an architectural decision.

## Security

- Never commit secrets directly into `.mcp.json`. Use environment variable references.
- Treat any MCP server with broad capability (file system access, shell execution, network egress to private infrastructure) as a sensitive dependency. Vetting a new server is similar in scope to vetting a new third-party library — read its source, check its provenance, and avoid hastily adopting servers that lack a clear maintainer.
- If the project has a file-ownership / no-go list at `.agents/owned-by-humans.md`, include `.mcp.json` there so changes require explicit human review before merging.
