---
phase: 05-jira-integration
plan: 02
subsystem: jira-integration
tags: [jira, mcp, integration, workflow, new-project]
dependency_graph:
  requires:
    - check-jira-mcp CLI command (from 05-01)
    - Jira MCP setup guides (from 05-01)
  provides:
    - Jira MCP status in init new-project response
    - Step 1.5 Jira MCP check in new-project workflow
  affects:
    - new-project workflow (added non-blocking MCP check)
tech_stack:
  added: []
  patterns:
    - Non-blocking capability detection during project setup
    - Informational banners for optional features
    - Silent config storage for available integrations
key_files:
  created: []
  modified:
    - get-shit-done/bin/gsd-tools.js
    - get-shit-done/workflows/new-project.md
decisions:
  - Jira MCP check is non-blocking — project creation always proceeds
  - Banner shown only when MCP unavailable (silent when available)
  - Config storage happens automatically when MCP detected (no user action needed)
  - Setup guide paths embedded in workflow banner (no separate lookup needed)
metrics:
  duration: 1 min
  completed: 2026-02-11
---

# Phase 05 Plan 02: Jira MCP Integration in Project Setup Summary

Non-blocking Jira MCP check integrated into new-project workflow with informational banner when unavailable and silent config storage when available.

## Overview

Integrated Jira MCP detection into the project creation workflow so PMs are informed about Jira integration availability during new project setup, without blocking project creation. The workflow checks MCP status, displays an optional setup banner if unavailable, and silently stores availability for future features if present.

## What Was Built

### 1. Jira MCP Status in init new-project Response

**Location:** `get-shit-done/bin/gsd-tools.js` (cmdInitNewProject function)

Added `jira_mcp` field to the init new-project JSON response:

```javascript
// Detect Jira MCP availability
const jiraMcpStatus = checkJiraMcp();

// Added to result object:
jira_mcp: jiraMcpStatus,
```

**Output Shape:**
```json
{
  "jira_mcp": {
    "available": false,
    "serverName": null,
    "message": "No Jira integration configured"
  }
}
```

The check runs once during init (no duplicate CLI calls). Workflows read the result from the parsed JSON.

### 2. Step 1.5 Jira MCP Check in new-project Workflow

**Location:** `get-shit-done/workflows/new-project.md`

Inserted new Step 1.5 between Setup (Step 1) and Create Project (Step 2):

**Step 1 changes:**
- Updated parse list to include `jira_mcp` field from init JSON

**Step 1.5 logic:**

**When `jira_mcp.available` is false:**
- Display informational banner explaining Jira integration is optional
- Provide setup guide paths for both Atlassian Cloud and Server/DC
- Continue immediately to Step 2 (no blocking, no prompting)

**When `jira_mcp.available` is true:**
- No banner shown
- Silently store MCP availability in config.json via config-set
- Continue to Step 2

**Banner content (unavailable case):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 JIRA INTEGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jira integration is not currently set up.

This is optional — all planning features work without it.
When configured, it enables ticket lookup and validation.

Setup guides:
  Atlassian Cloud: .claude/get-shit-done/templates/mcp-setup/jira-rovo.md
  Jira Server/DC:  .claude/get-shit-done/templates/mcp-setup/jira-community.md

Continuing with project setup...
```

## Technical Implementation

### Detection Flow

1. **Init command runs:** `cmdInitNewProject` calls `checkJiraMcp()` (from 05-01)
2. **Workflow parses init JSON:** Reads `jira_mcp` field in Step 1
3. **Step 1.5 executes:** Evaluates `jira_mcp.available` and branches accordingly
4. **Non-blocking continuation:** Project creation proceeds regardless of MCP status

### Config Storage (Available Case)

When Jira MCP is detected:
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js config-set jira_mcp_available true
node ~/.claude/get-shit-done/bin/gsd-tools.js config-set jira_mcp_server "${jira_mcp.serverName}"
```

Uses existing `config-set` subcommand (line 5577 of gsd-tools.js). Creates config.json if it doesn't exist yet (first-time setup).

### Key Design Decisions

1. **Non-blocking check:** Project creation never stops for missing Jira MCP
2. **PM-friendly language:** "Jira integration" not "Jira MCP server"
3. **Informational only:** Banner explains optional feature, doesn't prompt user to install now
4. **Silent when available:** No banner clutter when MCP is already configured
5. **Embedded setup paths:** Banner includes direct file paths to setup guides
6. **Preserves workflow structure:** Step 1.5 uses decimal numbering to avoid renumbering entire workflow

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| get-shit-done/bin/gsd-tools.js | Added jira_mcp field to cmdInitNewProject | +6 |
| get-shit-done/workflows/new-project.md | Added Step 1.5 Jira MCP check | +43 |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 850ea7a | Add Jira MCP status to init new-project response |
| 2 | 739941f | Add Step 1.5 Jira MCP check to new-project workflow |

## Verification Results

All plan verification criteria passed:

1. ✓ Init new-project response includes `jira_mcp` field
2. ✓ new-project.md Step 1.5 reads jira_mcp from init JSON (no separate CLI call)
3. ✓ Warning banner uses PM-friendly language ("Jira integration" not "Jira MCP server")
4. ✓ No step in new-project.md blocks on Jira MCP status
5. ✓ Steps 2-9 of new-project.md are unchanged
6. ✓ Config storage (config-set) only happens when MCP is available (true case)

## Success Criteria Met

- ✓ Init new-project response includes jira_mcp status object
- ✓ new-project.md has Step 1.5 between Setup and Create Project
- ✓ Informational banner shown when Jira MCP unavailable (non-blocking)
- ✓ Setup guide file paths included in banner
- ✓ Silent config storage when Jira MCP is available
- ✓ No workflow behavior changes based on MCP status (detection only)
- ✓ Project creation proceeds identically regardless of MCP availability

## Self-Check: PASSED

**Modified files verified:**
```bash
[ -f "get-shit-done/bin/gsd-tools.js" ] && echo "FOUND: get-shit-done/bin/gsd-tools.js"
[ -f "get-shit-done/workflows/new-project.md" ] && echo "FOUND: get-shit-done/workflows/new-project.md"
```

**Commits verified:**
```bash
git log --oneline --all | grep -q "850ea7a" && echo "FOUND: 850ea7a"
git log --oneline --all | grep -q "739941f" && echo "FOUND: 739941f"
```

**Functional verification:**
```bash
node get-shit-done/bin/gsd-tools.js init new-project --raw 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('jira_mcp present:', 'jira_mcp' in d)"
# Output: jira_mcp present: True
```

All self-checks passed.

## Phase 5 Status

Phase 5 (Jira Integration) is now complete. Both plans have been executed:

**Plan 01 (05-01):** Jira MCP Detection Infrastructure
- Created `check-jira-mcp` CLI command
- Created setup guide templates (Cloud + Server/DC)
- Detection logic with 5-second timeout

**Plan 02 (05-02):** Jira MCP Integration in Project Setup (this plan)
- Integrated detection into init new-project
- Added Step 1.5 to new-project workflow
- Non-blocking informational flow

The system now checks for Jira MCP during project creation, informs PMs about optional integration, and stores availability for future features — all without blocking the core planning workflow.

## Next Steps

Phase 5 complete. Ready for milestone completion:
- Run `/gsd:complete-phase 5` to mark phase as done
- Consider creating v1.0 milestone if all planned phases are complete
