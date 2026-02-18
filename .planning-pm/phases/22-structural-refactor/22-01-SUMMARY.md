---
phase: 22-structural-refactor
plan: 01
subsystem: core-infrastructure
tags: [path-resolution, folder-structure, jira-integration]
dependency_graph:
  requires: []
  provides: [.planning-pm-base-path, versioned-jira-sync]
  affects: [gsd-tools, lib-jira, lib-notion, bin-install]
tech_stack:
  added: []
  patterns: [versioned-path-resolution, state-file-migration]
key_files:
  created: []
  modified:
    - get-shit-done/bin/gsd-tools.js
    - lib/jira/sync-state.js
    - lib/jira/issue-creator.js
    - lib/jira/ticket-mapper.js
    - lib/notion/client.js
    - lib/notion/sync-state.js
    - lib/notion/sync-orchestrator.js
    - lib/notion/hierarchy.js
    - bin/install.js
decisions:
  - "Renamed .planning to .planning-pm across all JavaScript source files"
  - "Relocated jira-sync.json from project root to versioned folder (.planning-pm/{slug}/v{N}/)"
  - "Jira modules read current_version from STATE.md for path resolution"
  - "Notion modules continue using project root for notion-sync.json (cross-version tracking)"
metrics:
  duration: "6m"
  tasks_completed: 2
  files_modified: 9
  completed_date: "2026-02-18"
---

# Phase 22 Plan 01: Rename .planning to .planning-pm in JavaScript Sources

**One-liner:** Renamed all .planning directory references to .planning-pm in JS source files (gsd-tools, lib/ modules, bin/install.js) and relocated jira-sync.json from project root to versioned project folder

## What Was Built

Renamed the planning directory from `.planning` to `.planning-pm` across all JavaScript source files to avoid collisions with other planning tools. This is the core infrastructure change that enables the broader `.planning` → `.planning-pm` migration.

**Key Changes:**

1. **PathResolver in gsd-tools.js (55+ references)**
   - Updated `this.planningRoot` to point to `.planning-pm`
   - Replaced all path.join calls from `.planning` to `.planning-pm`
   - Updated context references (@.planning → @.planning-pm)
   - Updated JSDoc comments and display strings

2. **Jira Integration Modules**
   - Updated `resolvePlanningPath` in sync-state.js, issue-creator.js, and ticket-mapper.js
   - Implemented versioned resolution for jira-sync.json:
     - Reads `current_version` from STATE.md
     - Resolves to `.planning-pm/{slug}/v{N}/jira-sync.json` (versioned folder)
     - Falls back to `.planning-pm/{slug}/jira-sync.json` (project root)
   - Updated Notion link lookups to use `.planning-pm/ROADMAP.md` and `.planning-pm/REQUIREMENTS.md`

3. **Notion Integration Modules**
   - Updated path resolution in client.js, sync-state.js, sync-orchestrator.js, hierarchy.js
   - Kept notion-sync.json at project root level (cross-version tracking)
   - Updated error messages to reference `.planning-pm/config.json`

4. **Installation Script (bin/install.js)**
   - Updated user-facing messages to reference `.planning-pm/config.json`
   - Updated inline comments

## Deviations from Plan

None - plan executed exactly as written.

## Testing & Verification

**Syntax Validation:**
- All 9 files passed `node -c` syntax checks

**Path Reference Verification:**
- Zero remaining `.planning/` references in path.join calls (excluding `.planning-pm`)
- gsd-tools.js has 38 `.planning-pm` references (down from 70 total .planning references)

**Module Exports:**
- sync-state.js exports verified: `loadSyncState`, `saveSyncState`, `diffTickets`
- loadSyncState() correctly returns null when no state file exists

## Dependencies

**Upstream (Blocks This):** None

**Downstream (This Blocks):**
- 22-02: Rename .planning to .planning-pm in Markdown Docs
- 22-03: Migrate .planning to .planning-pm on Disk

## Issues Found

None.

## Performance

- **Duration:** 6 minutes
- **Tasks Completed:** 2/2
- **Files Modified:** 9
- **Lines Changed:** ~130 (94 insertions, 34 deletions across both commits)

## Commits

- `f6cec4a`: refactor(22-01): rename .planning to .planning-pm in gsd-tools.js
- `61eac14`: feat(22-01): rename .planning to .planning-pm in lib/ and relocate jira-sync.json

## Self-Check

Verifying created files and commits exist:

**Files:**
- Modified files are present and syntax-valid (verified via node -c)

**Commits:**
- FOUND: f6cec4a
- FOUND: 61eac14

## Self-Check: PASSED
