---
phase: 19-epic-ticket-creation
plan: 01
subsystem: jira
tags: [jira, epic, tickets, notion-links, preview, workflow, mcp]

# Dependency graph
requires:
  - phase: 17-jira-mcp-detection-prerequisites
    provides: Jira MCP detection, config storage (cloud_id, project_id, project_key), notion-sync.json prerequisite check
  - phase: 18-granularity-strategy-ticket-mapping
    provides: ticket-mapper.js that generates ticket data structures with descriptions, Notion page IDs, and planning content
provides:
  - issue-creator.js module with buildPreview/createEpicAndTickets/formatPreviewDisplay functions
  - Extended sync-jira workflow with preview+approve gate (step 6) and Jira creation logic (step 7)
  - Epic creation via mcp__jira__createJiraIssue with Epic issue type
  - Child ticket creation with parent linkage to epic
  - Notion page links embedded in ticket descriptions
  - Full preview display before any Jira writes
affects: [20-team-assignment, 21-update-semantics-tracking, jira-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: [preview-approve-gate, epic-parent-child-linkage, notion-link-embedding, mcp-tool-orchestration]

key-files:
  created: [lib/jira/issue-creator.js]
  modified: [get-shit-done/workflows/sync-jira.md]

key-decisions:
  - "Preview+approve gate in step 6 ensures user sees full ticket preview before any Jira API writes"
  - "Epic created first, then child tickets created with parent field set to epic key"
  - "Notion page links embedded directly in ticket descriptions using buildNotionUrl helper"
  - "Issue type discovery via mcp__jira__getJiraProjectIssueTypesMetadata to handle different Jira project configurations"
  - "Cancel path stops execution cleanly with clear messaging before any Jira changes"

patterns-established:
  - "Preview+approve pattern: build preview → display → prompt user → execute or abort based on response"
  - "Epic-first creation: create parent epic, extract key, use key as parent for all child tickets"
  - "Notion link embedding: prepend ticket descriptions with formatted Notion page link if page_id available"
  - "MCP tool orchestration: workflow instructs Claude to call MCP tools iteratively (not bash/node calls)"

# Metrics
duration: ~15min
completed: 2026-02-18
---

# Phase 19 Plan 01: Epic & Ticket Creation Summary

**Jira sync workflow creates epics and child tickets with Notion links via MCP, with full preview+approve gate before writes**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-18T08:07:00Z
- **Completed:** 2026-02-18T08:22:44Z
- **Tasks:** 3 (2 auto, 1 human-verify checkpoint)
- **Files modified:** 2 (1 created, 1 extended)

## Accomplishments

- Created issue-creator.js module (281 lines) with buildPreview, createEpicAndTickets, and formatPreviewDisplay
- Extended sync-jira workflow from 6 steps to 7 steps with preview+approve gate and Jira creation logic
- Epic creation via mcp__jira__createJiraIssue with automatic issue type discovery
- Child tickets created with parent linkage to epic key
- Notion page links embedded in ticket descriptions when page_id available
- User verified end-to-end: epic created in Jira, child tickets created correctly, parent-child relationships correct, Notion links present in descriptions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create issue-creator module for epic and ticket creation** - `3f42a48` (feat)
2. **Task 2: Extend sync-jira workflow with preview-approve gate and ticket creation steps** - `b152d80` (feat)
3. **Task 3: Verify Jira sync end-to-end** - Human verification approved (no code changes)

**Plan metadata:** (to be committed after SUMMARY creation)

## Files Created/Modified

- `lib/jira/issue-creator.js` (281 lines) - Issue creation orchestration: buildPreview generates preview with epic and tickets including Notion links; createEpicAndTickets prepares MCP call instructions; formatPreviewDisplay renders terminal-friendly preview
- `get-shit-done/workflows/sync-jira.md` (507 lines) - Extended from 6 to 7 steps: step 6 replaced with preview+approve gate using AskUserQuestion; step 7 added with epic creation and child ticket iteration via mcp__jira__createJiraIssue

## Decisions Made

**Preview+approve gate design:**
- Step 6 builds preview, displays formatted output, prompts user for "yes" or "cancel"
- Cancel path stops cleanly with clear messaging before any Jira writes
- Approve path continues to step 7 for actual creation

**Epic creation pattern:**
- Create epic first via mcp__jira__createJiraIssue with Epic issue type
- Extract epic key from response
- Use epic key as parent field for all child tickets
- Ensures correct parent-child hierarchy in Jira

**Notion link embedding:**
- Prepend ticket descriptions with "**📎 Notion Page:** [View in Notion](URL)" if notion_page_id available
- buildNotionUrl helper converts page_id to Notion URL format (removes dashes)
- Falls back to ticket-mapper description if no page_id

**Issue type discovery:**
- Step 7 calls mcp__jira__getJiraProjectIssueTypesMetadata to discover available issue types
- Finds Epic type dynamically (handles different Jira project configurations)
- Uses "Task" or "Story" for child tickets based on metadata

## Deviations from Plan

None - plan executed exactly as written.

All TICK requirements met:
- TICK-01: Epic created per milestone via mcp__jira__createJiraIssue ✓
- TICK-02: Tickets created as children with parent field ✓
- TICK-03: Notion page URLs embedded in descriptions ✓
- TICK-04: Planning content included (inherited from ticket-mapper) ✓
- TICK-05: Full preview displayed before writes with approve/cancel gate ✓

## Issues Encountered

None.

## User Verification

Task 3 was a checkpoint:human-verify. User ran `/gsd:sync-jira` end-to-end and confirmed:
- Preview displayed correctly with epic and all tickets
- Cancel path aborted cleanly (no Jira changes)
- Approve path created epic and child tickets successfully
- Parent-child relationships correct in Jira
- Notion page links present in ticket descriptions
- Planning content included in descriptions

User response: "approved" - all verification passed.

## Next Phase Readiness

**Ready for Phase 20 (Team Assignment):**
- Epic and tickets created in Jira with correct structure
- Ticket keys available for assignment operations
- Notion links embedded for team visibility

**Ready for Phase 21 (Update Semantics & Tracking):**
- jira-sync.json state tracking pattern established (from Phase 17)
- Epic key and ticket keys available for update detection

## Self-Check: PASSED

All claimed artifacts verified:

- FOUND: lib/jira/issue-creator.js
- FOUND: 3f42a48 (Task 1 commit)
- FOUND: b152d80 (Task 2 commit)

---
*Phase: 19-epic-ticket-creation*
*Completed: 2026-02-18*
