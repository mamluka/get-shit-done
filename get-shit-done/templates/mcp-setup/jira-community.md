# Jira Integration Setup: Jira Server / Data Center

For teams using Jira Server or Jira Data Center (self-hosted).

## Prerequisites

- Jira Server or Data Center instance with API access
- Jira API token (generated from your Jira profile)
- Python 3.12+ with `uvx` installed
- Claude Code installed and running

## Setup Steps

### 1. Generate a Jira API Token

1. Log in to your Jira instance
2. Go to your Profile > Security > API Tokens
3. Click "Create API Token"
4. Copy the generated token (you will not see it again)

### 2. Add the Community MCP Server

Run this command in your terminal, replacing the placeholder values:

```bash
claude mcp add --transport stdio mcp-atlassian -- \
  uvx mcp-atlassian \
  --jira-url https://your-jira-instance.example.com \
  --jira-username your-email@example.com \
  --jira-api-token YOUR_API_TOKEN
```

Replace:
- `https://your-jira-instance.example.com` with your Jira URL
- `your-email@example.com` with your Jira login email
- `YOUR_API_TOKEN` with the token from Step 1

### 3. Verify

Run this in your terminal to confirm the server is listed:

```bash
claude mcp list
```

You should see `mcp-atlassian` in the output.

## What This Enables

Once configured, GSD can optionally validate planning artifacts against your Jira board:
- Look up existing Jira tickets during requirements definition
- Cross-reference project plans with Jira epics

## Troubleshooting

**"uvx: command not found"**: Install uvx via `pip install uvx` or `pipx install uvx`. Requires Python 3.12+.

**"Connection refused"**: Verify your Jira URL is correct and accessible from your machine. Check VPN if your Jira is behind a corporate network.

**"Authentication failed"**: Regenerate your API token and update the MCP server configuration.

**"Server not found after adding"**: Restart Claude Code after adding the MCP server.

---

*This guide is for Jira Server/Data Center users. For Atlassian Cloud, see jira-rovo.md.*
