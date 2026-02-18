---
phase: 18-granularity-strategy-ticket-mapping
plan: 01
subsystem: jira
tags: [jira, ticket-mapping, granularity, workflow]

# Dependency graph
requires:
  - phase: 17-jira-mcp-detection-prerequisites
    provides: sync-jira workflow foundation and config persistence
provides:
  - lib/jira/ticket-mapper.js module
  - Three granularity strategies (phase, category, requirement)
  - Extended sync-jira workflow with granularity selection and ticket preview
affects: [19-epic-ticket-creation, 20-team-assignment, 21-update-semantics]

# Tech tracking
tech-stack:
  added: [ticket-mapper module, multi-project path resolution]
  patterns: [ROADMAP/REQUIREMENTS parsing, in-progress milestone detection, requirement-to-phase mapping]

key-files:
  created:
    - lib/jira/ticket-mapper.js
  modified:
    - get-shit-done/workflows/sync-jira.md

key-decisions:
  - "Phase-level mapping includes all requirements in description with phase goal and success criteria"
  - "Category-level mapping only includes categories with requirements mapped to current milestone phases"
  - "Requirement-level mapping includes phase context (number, name, goal) for each ticket"
  - "Notion page links extracted from notion-sync.json using multi-project-aware path resolution"
  - "Step 6 displays preview only, does not create tickets (Phase 19 responsibility)"

patterns-established:
  - "Ticket mapper pattern: mapTickets(cwd, granularity) returns { granularity, milestone, ticket_count, tickets }"
  - "Graceful fallback: Return { error: '...' } instead of throwing on missing files"
  - "Multi-project path resolution: Check .active-project file, resolve nested path if present"
  - "In-progress milestone detection: Parse sections outside <details> blocks, look for rocket emoji"

# Metrics
duration: 2min 38sec
completed: 2026-02-13
---

# Phase 18 Plan 01: Granularity Strategy & Ticket Mapping Summary

**Ticket mapper module with three granularity strategies and extended sync-jira workflow with selection and preview**

## Performance

- **Duration:** 2 min 38 sec
- **Started:** 2026-02-13T11:11:14Z
- **Completed:** 2026-02-13T11:13:53Z
- **Tasks:** 2 (module creation + workflow extension)
- **Files created:** 1
- **Files modified:** 1

## Accomplishments
- Created `lib/jira/ticket-mapper.js` with `mapTickets(cwd, granularity)` function
- Implemented ROADMAP.md parser to extract in-progress milestone phases
- Implemented REQUIREMENTS.md parser to extract v1.4 requirement categories
- Built three mapping strategies: phase-level (5 tickets), category-level (5 tickets), requirement-level (18 tickets)
- Added Notion page link support using multi-project-aware path resolution
- Extended sync-jira workflow with steps 5 (granularity selection) and 6 (ticket preview)
- Validated all three granularity levels produce correct ticket structures

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ticket-mapper module** - `3e24805` (feat)
2. **Task 2: Extend sync-jira workflow** - `3a29e2b` (feat)

## Files Created/Modified

**Created:**
- `lib/jira/ticket-mapper.js` - Exports mapTickets function with three granularity strategies (541 lines)

**Modified:**
- `get-shit-done/workflows/sync-jira.md` - Added steps 5-6 (granularity selection + ticket preview)

## Decisions Made

**1. Phase-level ticket structure**
- Rationale: Include phase goal, all requirements with descriptions, and success criteria for complete context

**2. Category-level filtering**
- Rationale: Only include categories that have requirements mapped to current milestone phases (avoid empty tickets)

**3. Requirement-level context inclusion**
- Rationale: Include phase number, name, and goal so each requirement ticket has full context

**4. Notion page link extraction**
- Rationale: Use multi-project-aware path resolution matching lib/notion/sync-state.js pattern for consistency

**5. Step 6 preview-only behavior**
- Rationale: Phase 19 handles actual Jira API calls, this phase validates mapping is correct

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed parseRequirements to skip <details> blocks**
- **Found during:** Task 1 verification
- **Issue:** Phase-level tickets were showing v1.2 requirements (from completed milestone) instead of v1.4 requirements (in-progress milestone)
- **Fix:** Added insideDetailsBlock tracking to skip content inside <details> tags when parsing REQUIREMENTS.md
- **Files modified:** lib/jira/ticket-mapper.js
- **Commit:** 3e24805 (included in Task 1 commit)

## Issues Encountered

None - all verification passed, all three granularity strategies produce correct ticket counts and structures.

## User Setup Required

None - module uses Node.js built-ins only (fs, path), no external dependencies.

## Next Phase Readiness

**Ready for Phase 19 (Epic & Ticket Creation):**
- Ticket mapper module exists and tested
- All three granularity strategies validated
- Workflow extends cleanly (Phase 19 can add step 7+ for Jira API calls)
- Ticket structure includes notion_page_id field ready for remote link creation

**No blockers.** Phase 19 can consume the ticket structure from step 6 and create Jira issues via MCP tools.

## Self-Check: PASSED

All claims verified:
- FOUND: lib/jira/ticket-mapper.js
- FOUND: 3e24805 (Task 1 commit)
- FOUND: 3a29e2b (Task 2 commit)
- VERIFIED: mapTickets function exports correctly
- VERIFIED: Phase-level produces 5 tickets for v1.4 milestone
- VERIFIED: Category-level produces 5 tickets (only current milestone categories)
- VERIFIED: Requirement-level produces 18 tickets (only current milestone requirements)
- VERIFIED: Workflow has 6 steps total (steps 1-4 preserved, steps 5-6 added)

---
*Phase: 18-granularity-strategy-ticket-mapping*
*Completed: 2026-02-13*
