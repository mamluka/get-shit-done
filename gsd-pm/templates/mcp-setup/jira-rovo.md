# Jira Integration Setup: Atlassian Cloud

For teams using Atlassian Cloud (*.atlassian.net).

## Prerequisites

- Atlassian Cloud account with Jira access
- Claude Code installed and running

## Setup Steps

### 1. Add the Atlassian Rovo MCP Server

Run this command in your terminal:

```bash
claude mcp add --transport http atlassian-rovo https://mcp.atlassian.com/
```

### 2. Authenticate

In Claude Code, type:

```
/mcp
```

Select the `atlassian-rovo` server and follow the OAuth authentication flow. You will be redirected to Atlassian to authorize access.

### 3. Verify

Run this in your terminal to confirm the server is listed:

```bash
claude mcp list
```

You should see `atlassian-rovo` in the output.

## What This Enables

Once configured, GSD can optionally validate planning artifacts against your Jira board:
- Look up existing Jira tickets during requirements definition
- Cross-reference project plans with Jira epics

## Troubleshooting

**"Server not responding"**: Check your internet connection and Atlassian Cloud status at https://status.atlassian.com

**"Authentication failed"**: Re-run `/mcp` in Claude Code and re-authenticate with Atlassian.

**"Server not found after adding"**: Restart Claude Code after adding the MCP server.

---

*This guide is for Atlassian Cloud users. For Jira Server or Data Center, see jira-community.md.*
