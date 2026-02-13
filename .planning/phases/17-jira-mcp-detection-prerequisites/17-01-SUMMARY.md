---
phase: 17-jira-mcp-detection-prerequisites
plan: 01
subsystem: infra
tags: [jira, mcp, configuration, workflow]

# Dependency graph
requires:
  - phase: 14-notion-sync-integration
    provides: notion-sync.json for Jira ticket page links
provides:
  - /gsd:sync-jira command entry point
  - Jira MCP detection and validation workflow
  - Notion sync prerequisite check
  - Jira project selection and config persistence
affects: [18-granularity-strategy, 19-epic-ticket-creation, 20-team-assignment, 21-update-semantics]

# Tech tracking
tech-stack:
  added: [Jira MCP tools integration]
  patterns: [MCP availability detection, multi-step prerequisite validation, config persistence]

key-files:
  created:
    - commands/gsd/sync-jira.md
    - get-shit-done/workflows/sync-jira.md
  modified: []

key-decisions:
  - "Store cloud_id alongside project_id and project_key for MCP call requirements"
  - "Block sync if notion-sync.json missing to ensure page links available for tickets"
  - "Use multi-project-aware path resolution for notion-sync.json (matches lib/notion/sync-state.js)"

patterns-established:
  - "MCP detection pattern: check-jira-mcp tool returns JSON with available/serverName fields"
  - "Prerequisite blocking: Display clear banner with exact commands needed when requirements not met"
  - "Config persistence pattern: Use config-set with dot notation (jira.cloud_id, jira.project_id, jira.project_key)"

# Metrics
duration: 2min
completed: 2026-02-13
---

# Phase 17 Plan 01: Jira MCP Detection & Prerequisites Summary

**Jira sync entry point with MCP availability detection, Notion sync validation, and project selection workflow**

## Performance

- **Duration:** 1 min 56 sec
- **Started:** 2026-02-13T07:08:12Z
- **Completed:** 2026-02-13T07:10:09Z
- **Tasks:** 2 (1 implementation + 1 validation)
- **Files created:** 2

## Accomplishments
- Created `/gsd:sync-jira` command with all Jira MCP tools in allowed-tools
- Implemented 4-step workflow: MCP detection → Notion sync check → Project selection → Config persistence
- Validated cross-file consistency and gsd-tools integration
- Established foundation for Phases 18-21 ticket creation workflows

## Task Commits

Each task was committed atomically:

1. **Task 1: Create sync-jira command and workflow files** - `efd44c3` (feat)
2. **Task 2: Validate workflow references and cross-file consistency** - No commit (validation passed, no changes needed)

## Files Created/Modified
- `commands/gsd/sync-jira.md` - Slash command entry point with Jira MCP tools allowed
- `get-shit-done/workflows/sync-jira.md` - 4-step orchestration workflow (MCP check, Notion check, project select, config save)

## Decisions Made

**1. Store cloud_id alongside project selection**
- Rationale: All Jira MCP calls require cloudId parameter, not just project selection

**2. Block if notion-sync.json missing or empty**
- Rationale: Jira tickets will include Notion page links, requires prior sync completion

**3. Multi-project-aware notion-sync.json path resolution**
- Rationale: Matches existing lib/notion/sync-state.js resolveSyncStatePath pattern for consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all cross-file references validated successfully, gsd-tools.js check-jira-mcp subcommand exists at expected location (line 5997).

## User Setup Required

None - no external service configuration required. Users will configure Jira MCP via the install command shown in step 1 when they run `/gsd:sync-jira`.

## Next Phase Readiness

**Ready for Phase 18 (Granularity Strategy & Ticket Mapping):**
- `/gsd:sync-jira` entry point exists
- Config persistence pattern established (jira.cloud_id, jira.project_id, jira.project_key)
- Workflow extensible (Phase 18 can add steps 5+ for granularity selection)

**No blockers.** Phase 18 can extend the workflow with milestone/phase/plan selection logic after step 4.

## Self-Check: PASSED

All claims verified:
- FOUND: commands/gsd/sync-jira.md
- FOUND: get-shit-done/workflows/sync-jira.md
- FOUND: efd44c3 (Task 1 commit)

---
*Phase: 17-jira-mcp-detection-prerequisites*
*Completed: 2026-02-13*
