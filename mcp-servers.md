# MCP Servers

Human-readable index of the MCP servers this solution expects, declared in [`.mcp.json`](.mcp.json)
at the repository root. Keep this file and `.mcp.json` in lockstep — every server declared there
has an entry here, and vice versa. See [`.agents/standards/mcp.md`](.agents/standards/mcp.md) for
the full format, security rules, and the human-owned-boundary requirement on `.mcp.json`.

If you are starting a session in a new environment, install/configure the servers below before
relying on agent capabilities that depend on them.

| Server | Purpose | Documentation |
|---|---|---|
| `azure-devops` | Work items, repos, pipelines, wikis, and test plans in this solution's Azure DevOps organisation. | https://github.com/microsoft/azure-devops-mcp |
