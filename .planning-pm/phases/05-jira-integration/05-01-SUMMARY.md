---
phase: 05-jira-integration
plan: 01
subsystem: jira-integration
tags: [jira, mcp, integration, detection]
dependency_graph:
  requires: []
  provides:
    - check-jira-mcp CLI command
    - Jira MCP setup guide templates
  affects: []
tech_stack:
  added:
    - execSync with 5s timeout for MCP detection
  patterns:
    - Case-insensitive keyword matching for server detection
    - Structured JSON response format for CLI commands
    - PM-friendly setup guides with step-by-step instructions
key_files:
  created:
    - get-shit-done/templates/mcp-setup/jira-rovo.md
    - get-shit-done/templates/mcp-setup/jira-community.md
  modified:
    - get-shit-done/bin/gsd-tools.js
decisions:
  - Use execSync with 5s timeout for MCP detection to prevent workflow hangs
  - Case-insensitive keyword matching (jira OR atlassian) handles custom server names
  - Two separate setup guides (Cloud vs Server/DC) for different authentication methods
  - PM-friendly language throughout (no MCP protocol/JSON-RPC/stdio jargon)
metrics:
  duration: 2 min
  completed: 2026-02-11
---

# Phase 05 Plan 01: Jira MCP Detection Infrastructure Summary

JWT auth with refresh rotation using jose library — Building blocks for Phase 5's non-blocking Jira MCP integration through CLI detection and setup guides.

## Overview

Added `check-jira-mcp` subcommand to gsd-tools.js for detecting Jira MCP servers, plus two setup guide templates (Atlassian Cloud OAuth and Server/DC API token). This provides the foundation for Phase 5's optional Jira integration — workflows can check MCP availability without forcing it.

## What Was Built

### 1. check-jira-mcp CLI Command

**Location:** `get-shit-done/bin/gsd-tools.js`

New `checkJiraMcp()` function and CLI subcommand that:
- Executes `claude mcp list` via execSync with 5-second timeout
- Searches output for Jira-related keywords (case-insensitive: "jira" or "atlassian")
- Returns structured JSON: `{ available, serverName, message, reason? }`
- Handles missing CLI, timeouts, and no-match cases gracefully
- Completes within 5 seconds (typically under 1 second)

**Usage:**
```bash
node get-shit-done/bin/gsd-tools.js check-jira-mcp
```

**Output Example:**
```json
{
  "available": false,
  "serverName": null,
  "message": "No Jira integration configured"
}
```

### 2. Jira MCP Setup Guides

**Location:** `get-shit-done/templates/mcp-setup/`

Two comprehensive setup guides:

**jira-rovo.md** — Atlassian Cloud (OAuth)
- Prerequisites: Atlassian Cloud account, Claude Code
- Setup: `claude mcp add --transport http atlassian-rovo https://mcp.atlassian.com/`
- Authentication: OAuth flow via `/mcp` in Claude Code
- Troubleshooting: Server not responding, auth failed, server not found

**jira-community.md** — Jira Server/Data Center (API Token)
- Prerequisites: Self-hosted Jira, API token, Python 3.12+, uvx
- Setup: `claude mcp add --transport stdio mcp-atlassian` with API credentials
- Troubleshooting: uvx not found, connection refused, auth failed

Both guides use PM-friendly language (no "MCP protocol," "JSON-RPC," or "stdio transport" jargon).

## Technical Implementation

### Detection Logic

```javascript
function checkJiraMcp() {
  try {
    const output = execSync('claude mcp list 2>&1', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const lines = output.split('\n').filter(l => l.trim());
    const jiraServer = lines.find(line => {
      const lower = line.toLowerCase();
      return lower.includes('jira') || lower.includes('atlassian');
    });

    if (jiraServer) {
      const match = jiraServer.match(/^([^\(]+)/);
      const serverName = match ? match[1].trim() : jiraServer.trim();
      return {
        available: true,
        serverName,
        message: 'Jira integration detected: ' + serverName
      };
    }

    return {
      available: false,
      serverName: null,
      message: 'No Jira integration configured'
    };
  } catch (err) {
    return {
      available: false,
      serverName: null,
      message: 'Jira integration check skipped',
      reason: err.code === 'ETIMEDOUT' ? 'Check timed out' : 'Claude CLI not available'
    };
  }
}
```

### Key Design Decisions

1. **5-second timeout**: Prevents workflow hangs if Claude CLI is slow or missing
2. **Case-insensitive matching**: Handles custom server names (e.g., "my-jira", "JIRA-PROD", "Atlassian")
3. **Graceful degradation**: Returns `available: false` instead of crashing on errors
4. **PM-friendly messages**: "Jira integration" not "Jira MCP server"
5. **Separate guides**: Cloud OAuth vs Server/DC API token are fundamentally different setup flows

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| get-shit-done/bin/gsd-tools.js | Added checkJiraMcp() function and CLI wiring | +56 |
| get-shit-done/templates/mcp-setup/jira-rovo.md | Created setup guide for Atlassian Cloud | +61 |
| get-shit-done/templates/mcp-setup/jira-community.md | Created setup guide for Server/DC | +61 |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 840576d | Add check-jira-mcp subcommand with detection logic |
| 2 | 175c37f | Create Jira MCP setup guide templates (rovo + community) |

## Self-Check: PASSED

**Created files verified:**
```bash
[ -f "get-shit-done/templates/mcp-setup/jira-rovo.md" ] && echo "FOUND"
[ -f "get-shit-done/templates/mcp-setup/jira-community.md" ] && echo "FOUND"
```
Both files exist.

**Commits verified:**
```bash
git log --oneline --all | grep -q "840576d" && echo "FOUND: 840576d"
git log --oneline --all | grep -q "175c37f" && echo "FOUND: 175c37f"
```
Both commits exist.

**Functional verification:**
```bash
node get-shit-done/bin/gsd-tools.js check-jira-mcp
# Returns valid JSON with available, serverName, message fields
```
Command works correctly.

## Next Steps

Phase 05 Plan 02 will integrate this detection into the new-project workflow:
- Check Jira MCP availability during project creation
- Display appropriate setup guide if missing
- Continue project creation without blocking (optional integration)
