# Phase 5: Jira Integration - Research

**Researched:** 2026-02-10
**Domain:** Model Context Protocol (MCP), Jira integration, graceful degradation patterns
**Confidence:** HIGH

## Summary

Phase 5 integrates optional Jira MCP validation into the GSD project creation workflow. The core challenge is implementing a soft prerequisite check that warns users if Jira MCP is missing but allows project creation to proceed without blocking. This requires understanding MCP server discovery, configuration validation, and graceful degradation patterns.

MCP (Model Context Protocol) provides standardized integration between Claude Code and external services like Jira. The protocol uses JSON-RPC 2.0 messaging over stdio, HTTP, or SSE transports. Claude Code provides both command-line tools (`claude mcp list`, `claude mcp get`) and programmatic access through built-in tools that can inspect configured MCP servers.

Jira MCP integration enables PMs to validate planning artifacts against existing Jira tickets, but this is strictly a validation-only feature — not ticket creation or syncing. Core GSD planning features must work identically whether Jira MCP is installed or not.

**Primary recommendation:** Use `Bash` tool to execute `claude mcp list` command and parse JSON output to detect Jira MCP availability during project creation. Display informational warning with setup instructions if missing, but proceed without blocking. Implement check at Step 1.5 of new-project workflow (after git check, before brownfield offer).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| MCP Protocol | 2025-11-25 spec | Integration protocol | Official standard for AI-tool integrations, maintained by Anthropic |
| JSON-RPC | 2.0 | MCP transport layer | Protocol backbone, widely supported |
| Claude Code CLI | Current | MCP server management | Built-in tooling for server discovery and configuration |
| Node.js child_process | Native (>=16.7.0) | Execute CLI commands | Already used throughout gsd-tools.js |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Atlassian Rovo MCP Server | Latest Cloud | Official Jira/Confluence MCP | Recommended for Atlassian Cloud users with OAuth |
| mcp-atlassian (sooperset) | Latest | Community Jira/Confluence MCP | Alternative for Server/Data Center or API token auth |
| Python uvx | >=3.12 | MCP server runtime | Required for community Python-based MCP servers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CLI commands | Direct config file parsing | CLI provides validated, version-safe server list; direct parsing risks format changes |
| Official Rovo MCP | Community mcp-atlassian | Rovo requires OAuth and Cloud; community server supports API tokens and Server/DC |
| Blocking check | No check at all | Blocking prevents adoption; no check leaves users confused when features don't work |

**Installation:**

Users install MCP servers themselves. Phase 5 only checks availability and provides setup guidance.

For official Atlassian Rovo MCP Server:
```bash
claude mcp add --transport http atlassian-rovo https://mcp.atlassian.com/
# Then authenticate via /mcp in Claude Code
```

For community mcp-atlassian:
```bash
claude mcp add --transport stdio mcp-atlassian -- uvx mcp-atlassian \
  --env JIRA_URL=https://your-domain.atlassian.net \
  --env JIRA_USERNAME=your-email@example.com \
  --env JIRA_API_TOKEN=your-api-token
```

## Architecture Patterns

### Recommended Project Structure

Phase 5 adds optional MCP checking logic to existing workflow:

```
.claude/get-shit-done/
├── bin/
│   └── gsd-tools.js          # Add: check-mcp-server command
├── workflows/
│   └── new-project.md        # Modify: inject MCP check at Step 1.5
└── templates/
    └── mcp-setup/
        ├── jira-rovo.md      # Setup guide for official Rovo MCP
        └── jira-community.md # Setup guide for community mcp-atlassian
```

### Pattern 1: Soft Prerequisite Check

**What:** Check for optional dependency, warn if missing, but continue execution

**When to use:** External integrations that enhance but don't block core functionality

**Example:**
```javascript
// Source: Derived from graceful degradation best practices
async function checkJiraMcp() {
  try {
    const output = execSync('claude mcp list --format json 2>&1', {
      encoding: 'utf8',
      timeout: 5000
    });
    const servers = JSON.parse(output);

    // Check for any Jira-related server
    const jiraServer = servers.find(s =>
      s.name.toLowerCase().includes('jira') ||
      s.name.toLowerCase().includes('atlassian')
    );

    return {
      available: !!jiraServer,
      serverName: jiraServer?.name,
      serverType: jiraServer?.type
    };
  } catch (error) {
    // Claude CLI not available or command failed
    return {
      available: false,
      error: error.message
    };
  }
}
```

### Pattern 2: Capability-Based Feature Gating

**What:** Features check for required capabilities before exposing functionality

**When to use:** Optional features that depend on external services

**Example:**
```javascript
// In future Jira validation features
function getAvailableFeatures(config) {
  const features = {
    core: ['project_creation', 'planning', 'roadmap'], // Always available
    optional: []
  };

  if (config.jiraMcpAvailable) {
    features.optional.push('jira_validation', 'ticket_lookup');
  }

  return features;
}
```

### Pattern 3: Informational Warning (Non-Blocking)

**What:** Display setup guidance without interrupting workflow

**When to use:** Optional integrations that users might want but don't need immediately

**Example:**
```markdown
## MCP Check Output (in new-project workflow)

ℹ️  Jira MCP Not Detected

Jira MCP integration provides ticket validation and lookup features.

Setup guides:
  • Atlassian Cloud: .claude/get-shit-done/templates/mcp-setup/jira-rovo.md
  • Jira Server/DC: .claude/get-shit-done/templates/mcp-setup/jira-community.md

Core planning features work without Jira MCP.
Continuing project creation...
```

### Anti-Patterns to Avoid

- **Blocking on optional dependencies:** Phase 5 must never prevent project creation if Jira MCP is unavailable. The check is informational only.
- **Silent failure:** If Jira MCP check fails, don't hide the error. Show it as informational context so users understand what's unavailable.
- **Assuming MCP server names:** Don't hardcode exact server names like "jira" or "atlassian-rovo". Users may configure custom names. Search for jira/atlassian keywords instead.
- **Long timeouts:** MCP check should fail fast (5 seconds max). Don't make users wait for slow network calls during project init.
- **Exposing internal errors:** If `claude mcp list` fails, translate technical errors into user-friendly messages about MCP setup.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP server discovery | Config file parser, manual ~/.claude.json parsing | `claude mcp list` CLI command | CLI handles scope merging (local/project/user), version compatibility, and format changes |
| JSON-RPC communication | Custom HTTP/stdio client | Claude Code's built-in MCP runtime | Already integrated, handles auth, retries, error formatting |
| Jira API integration | Direct REST API calls | MCP Jira servers (Rovo or community) | MCP provides standardized interface, handles auth, rate limiting, error mapping |
| OAuth flows | Custom OAuth implementation | Atlassian Rovo MCP with built-in OAuth | OAuth is complex; delegate to official implementation |

**Key insight:** MCP exists to abstract external service integration. Building direct integrations bypasses the entire value proposition and creates maintenance burden. Always use MCP servers for external service access.

## Common Pitfalls

### Pitfall 1: Blocking Project Creation on MCP Availability

**What goes wrong:** Requiring Jira MCP during project creation prevents users from using GSD if they don't have Jira or can't configure MCP immediately.

**Why it happens:** Treating MCP integration as a hard dependency instead of an enhancement.

**How to avoid:**
- Check MCP availability but never block on results
- Show informational warnings, not errors
- Ensure all code paths work with `jiraMcpAvailable: false`

**Warning signs:**
- Error messages that say "Cannot continue without Jira MCP"
- Workflow exits early when MCP check fails
- Features that throw errors instead of gracefully degrading

### Pitfall 2: Assuming MCP CLI Availability

**What goes wrong:** Executing `claude mcp list` fails if Claude CLI isn't in PATH or user has older version without MCP commands.

**Why it happens:** Development environment has latest Claude CLI, but users may have older versions or alternative installations.

**How to avoid:**
- Wrap CLI calls in try-catch with timeout
- Check for command existence before executing
- Handle "command not found" gracefully
- Fall back to "MCP check skipped" state, not error state

**Warning signs:**
- Uncaught exceptions from execSync
- Hanging on CLI calls without timeout
- Generic "command failed" messages instead of actionable guidance

### Pitfall 3: Parsing Unreliable Output Formats

**What goes wrong:** Parsing human-readable output from `claude mcp list` breaks when CLI output format changes.

**Why it happens:** Relying on text parsing instead of structured data formats.

**How to avoid:**
- Always use `--format json` flag if available
- Parse JSON.parse() in try-catch
- Handle missing/malformed JSON gracefully
- Document CLI version requirements

**Warning signs:**
- Regex patterns for parsing CLI output
- String splitting on whitespace/newlines
- Brittle parsing that breaks with extra whitespace

### Pitfall 4: Verbose MCP Server Names

**What goes wrong:** Looking for exact match on "jira" fails when users configure as "my-company-jira" or "atlassian-prod".

**Why it happens:** Assuming standard naming conventions that users can override.

**How to avoid:**
- Search for keywords (jira, atlassian) instead of exact names
- Case-insensitive matching
- Document that any Jira-related MCP server will be recognized

**Warning signs:**
- `servers.find(s => s.name === 'jira')`
- Not handling custom server names
- Tests only cover standard names

### Pitfall 5: Exposing MCP Implementation Details

**What goes wrong:** Error messages mention JSON-RPC, stdio transports, or MCP protocol specifics that confuse PMs.

**Why it happens:** Surfacing technical internals instead of translating to user-facing concepts.

**How to avoid:**
- Translate technical errors to business language
- "Jira integration" not "Jira MCP server"
- "Setup required" not "stdio transport failed"
- Reference Phase 4 UX terminology dictionary

**Warning signs:**
- Errors containing "JSON-RPC", "transport", "MCP protocol"
- Stack traces shown to users
- Technical jargon in informational messages

## Code Examples

Verified patterns from official sources:

### Checking MCP Server Availability

```bash
# Source: https://code.claude.com/docs/en/mcp
# List all configured MCP servers
claude mcp list

# Get details for specific server
claude mcp get jira

# Within Claude Code, check server status
/mcp
```

### Node.js Implementation for gsd-tools.js

```javascript
// Source: Derived from Node.js child_process documentation and MCP CLI patterns
const { execSync } = require('child_process');

/**
 * Check if Jira MCP server is configured
 * Returns: { available: boolean, serverName?: string, message: string }
 */
function checkJiraMcp() {
  try {
    // Execute claude mcp list with timeout
    const output = execSync('claude mcp list 2>&1', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: 'pipe'
    });

    // Parse output looking for Jira-related servers
    // CLI output format (as of 2026): one server per line, format: "name (type)"
    const lines = output.split('\n').filter(l => l.trim());
    const jiraServer = lines.find(line => {
      const lower = line.toLowerCase();
      return lower.includes('jira') || lower.includes('atlassian');
    });

    if (jiraServer) {
      // Extract server name from line (format: "server-name (stdio)")
      const match = jiraServer.match(/^([^\(]+)/);
      const serverName = match ? match[1].trim() : 'unknown';

      return {
        available: true,
        serverName,
        message: `Jira MCP detected: ${serverName}`
      };
    }

    return {
      available: false,
      message: 'No Jira MCP server configured'
    };

  } catch (error) {
    // Claude CLI not available or command failed
    return {
      available: false,
      message: 'MCP check skipped (Claude CLI not available)',
      error: error.message
    };
  }
}
```

### Display Warning in Workflow

```markdown
## Workflow Integration (new-project.md Step 1.5)

**Check for Jira MCP (non-blocking):**

```bash
JIRA_CHECK=$(node ./.claude/get-shit-done/bin/gsd-tools.js check-jira-mcp)
```

Parse JSON: `available`, `server_name`, `message`

**If `available` is false:**

Display informational banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️  JIRA MCP NOT DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jira MCP integration enables ticket validation and lookup.

Setup Guides:
  • Atlassian Cloud users:
    .claude/get-shit-done/templates/mcp-setup/jira-rovo.md

  • Jira Server/Data Center users:
    .claude/get-shit-done/templates/mcp-setup/jira-community.md

Core GSD planning works without Jira MCP.
Continuing project creation...
```

**If `available` is true:**

Silent success (no banner needed). Store in config for future features:

```bash
# Record Jira MCP availability in project config
node ./.claude/get-shit-done/bin/gsd-tools.js config-set jira_mcp_available true
node ./.claude/get-shit-done/bin/gsd-tools.js config-set jira_mcp_server "$SERVER_NAME"
```
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct API integration | MCP servers | 2024-2025 | Standardized integration layer, reduced custom code |
| SSE transport | Streamable HTTP | 2025-11-25 spec | SSE deprecated, HTTP is recommended transport |
| Manual OAuth | MCP built-in OAuth | 2025-2026 | Simplified authentication, delegated to MCP layer |
| claudeConfig.json | .mcp.json + ~/.claude.json | 2025-2026 | Scope-based configuration (local/project/user) |

**Deprecated/outdated:**
- **SSE (Server-Sent Events) transport:** MCP spec 2025-11-25 deprecated SSE in favor of streamable HTTP with chunked encoding. Still supported but not recommended for new integrations.
- **claude_desktop_config.json format:** Claude Desktop legacy config. Claude Code uses .mcp.json (project scope) and ~/.claude.json (local/user scope).

## Open Questions

1. **CLI Output Format Stability**
   - What we know: `claude mcp list` exists and shows configured servers
   - What's unclear: Whether JSON output format (`--format json`) is supported or if we must parse text
   - Recommendation: Implement text parsing with defensive error handling. Test against multiple CLI versions. Update if JSON format becomes available.

2. **MCP Version Compatibility**
   - What we know: MCP spec 2025-11-25 is current, multiple server implementations exist
   - What's unclear: Minimum/maximum MCP server versions that should be accepted
   - Recommendation: Accept any detected Jira MCP server. If validation features fail due to version mismatch, handle gracefully and suggest upgrade.

3. **Configuration Scopes for GSD**
   - What we know: MCP supports local, project, and user scopes
   - What's unclear: Which scope is most appropriate for GSD's Jira MCP detection (user-level vs project-level)
   - Recommendation: Check all scopes (user-level Jira MCP should work for any GSD project). Users may configure per-project for multi-tenant Jira environments.

4. **Future Jira Validation Features**
   - What we know: Phase 5 adds prerequisite check only, no actual Jira integration
   - What's unclear: What specific Jira validation features PMs need (ticket lookup? requirement sync? status checks?)
   - Recommendation: Implement check in Phase 5, defer feature implementation to future phase. Gather user feedback on what validation would be valuable.

## Sources

### Primary (HIGH confidence)

- [Model Context Protocol Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) - Official MCP protocol requirements, JSON-RPC 2.0, transport methods
- [Connect Claude Code to tools via MCP - Claude Code Docs](https://code.claude.com/docs/en/mcp) - Official documentation for MCP integration in Claude Code, CLI commands, configuration scopes
- [MCP Atlassian (sooperset) GitHub](https://github.com/sooperset/mcp-atlassian) - Community Jira/Confluence MCP server implementation, environment variables, installation methods
- [Atlassian Rovo MCP Server](https://www.atlassian.com/platform/remote-mcp-server) - Official Atlassian MCP integration, OAuth authentication, Cloud requirements

### Secondary (MEDIUM confidence)

- [How to Setup & Use Jira MCP Server - Apidog Blog](https://apidog.com/blog/jira-mcp-server/) - Setup guide with configuration examples (verified against official docs)
- [Jira MCP Integration: Complete Step-by-Step Guide - Workato](https://www.workato.com/the-connector/jira-mcp/) - Integration patterns and best practices
- [Ultimate Guide to Claude MCP Servers & Setup | 2026 - Generect](https://generect.com/blog/claude-mcp/) - General MCP setup guidance (cross-referenced with official docs)

### Tertiary (LOW confidence)

- [Feature Request: CLI command to list available MCP tools - GitHub Issue #6574](https://github.com/anthropics/claude-code/issues/6574) - Community discussion about CLI improvements (feature request, not implemented yet)

## Metadata

**Confidence breakdown:**
- MCP Protocol & Architecture: HIGH - Official specification and Claude Code documentation provide complete implementation guidance
- CLI Commands: HIGH - Documented in official Claude Code docs with examples
- Jira MCP Servers: MEDIUM - Multiple implementations exist (official Rovo and community), documented but setup variations exist
- Graceful Degradation: HIGH - Standard software engineering pattern, well-documented in similar systems
- Integration Points: HIGH - GSD codebase already uses child_process extensively, pattern is established

**Research date:** 2026-02-10
**Valid until:** 2026-04-10 (60 days - MCP ecosystem is rapidly evolving but spec is stable)

## Implementation Notes for Planner

**Critical requirements for Phase 5 plans:**

1. **Non-blocking check:** Every code path must work with Jira MCP unavailable
2. **Fast failure:** MCP check timeout must be ≤5 seconds
3. **Clear messaging:** Use PM-friendly language (reference Phase 4 terminology dictionary)
4. **Setup guidance:** Template files must provide step-by-step instructions for both Rovo and community MCP servers
5. **Future-proof:** Store MCP availability in config.json for future Jira validation features

**Testing requirements:**

- MCP check with no Claude CLI installed
- MCP check with Claude CLI but no Jira MCP configured
- MCP check with Jira MCP configured (both Rovo and community servers)
- MCP check timeout (simulate slow CLI response)
- Project creation flow with each MCP state above

**Integration points:**

- `gsd-tools.js`: Add `check-jira-mcp` command that returns JSON
- `new-project.md`: Add Step 1.5 between git check and brownfield offer
- `templates/mcp-setup/`: Create setup guide markdown files
- `config.json`: Add `jira_mcp_available` and `jira_mcp_server` fields

**Success criteria validation:**

- Success criterion 1: "Before creating new project, system checks for Jira MCP and warns if missing but allows continuation" → MCP check must happen in Step 1.5, display warning banner if unavailable, workflow continues to Step 2
- Success criterion 2: "If Jira MCP unavailable, setup instructions are provided but project creation proceeds" → Warning banner includes paths to setup guide templates, project creation continues without blocking
- Success criterion 3: "Core planning features work identically whether Jira MCP is installed or not" → No conditional logic in core workflows (new-project, plan-phase, etc.) based on MCP availability; only affects future optional Jira validation features
