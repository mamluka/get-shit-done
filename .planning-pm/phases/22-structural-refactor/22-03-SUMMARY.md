---
phase: 22-structural-refactor
plan: 03
subsystem: core-infrastructure
tags: [migration, folder-rename, backward-compatibility]

# Dependency graph
requires:
  - phase: 22-01
    provides: JavaScript files use .planning-pm paths
  - phase: 22-02
    provides: Markdown docs and tests reference .planning-pm paths
provides:
  - migratePlanningFolder function for safe directory migration
  - CLI subcommand 'project migrate-folder'
  - Idempotent migration with backup creation
  - Existing projects can upgrade from .planning to .planning-pm safely
affects: [all existing gsd-pm installations, new-project workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Idempotent migration with backup creation
    - Safe rename with verification steps
    - Automatic migration check in new-project workflow

key-files:
  created: []
  modified:
    - get-shit-done/bin/gsd-tools.js
    - get-shit-done/workflows/new-project.md
    - bin/notion-sync.js (gap fix)
    - get-shit-done/commands/gsd/edit-phase.md (gap fix)

key-decisions:
  - "Migration creates timestamped backup before rename, cleans up on success"
  - "Migration is idempotent: no-op if already migrated, error if both directories exist"
  - "new-project workflow includes automatic migration check for existing .planning folders"
  - "Gap fix: Updated notion-sync.js path reference missed in 22-02"
  - "Gap fix: Updated edit-phase.md path reference missed in 22-02"

patterns-established:
  - Safe migration pattern with backup/verify/cleanup flow
  - Automatic upgrade path for existing installations

# Metrics
duration: 8min
completed: 2026-02-18
tasks_completed: 2
files_modified: 4
---

# Phase 22 Plan 03: Add Safe Migration from .planning to .planning-pm

**One-liner:** Implemented idempotent migratePlanningFolder function with backup creation and CLI subcommand, verified complete end-to-end .planning → .planning-pm rename across codebase with all tests passing

## Performance

- **Duration:** 8 min (estimate from checkpoint flow)
- **Started:** 2026-02-18
- **Completed:** 2026-02-18
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 4

## Accomplishments

1. **Migration Function Implementation**
   - Added `migratePlanningFolder(cwd)` function to gsd-tools.js
   - Creates timestamped backup before rename
   - Safe rename using fs.renameSync
   - Cleans up backup on success
   - Idempotent: detects already-migrated state, handles both-exist error case

2. **CLI Integration**
   - Registered `project migrate-folder` subcommand
   - Returns structured JSON result (success/error/already_migrated)
   - Follows existing CLI patterns (migrateToNested style)

3. **Workflow Integration**
   - Added migration check to new-project.md workflow
   - Automatic migration on first GSD command execution
   - Silent continuation if already migrated
   - Error prompt if both .planning and .planning-pm exist

4. **End-to-End Verification (Checkpoint Task 2)**
   - Migration command successfully renamed .planning to .planning-pm
   - All 74 tests pass with .planning-pm paths
   - gsd-tools init commands return planning_exists: true with .planning-pm paths
   - No stale .planning references remain (only intentional migration-related refs)
   - jira-sync resolution works without errors

5. **Gap Fixes (During Verification)**
   - Fixed notion-sync.js path reference (missed in 22-02)
   - Fixed edit-phase.md path reference (missed in 22-02)
   - Committed as 410d4d4

## Task Commits

Each task was committed atomically:

1. **Task 1: Add migratePlanningFolder function and CLI subcommand** - `6500376` (feat)
   - Added migratePlanningFolder function to gsd-tools.js
   - Registered 'project migrate-folder' CLI subcommand
   - Updated new-project.md workflow with migration check
   - Files: get-shit-done/bin/gsd-tools.js, get-shit-done/workflows/new-project.md

2. **Task 2: Verify end-to-end rename and migration** - N/A (checkpoint:human-verify)
   - User verified: directory renamed successfully
   - User verified: 74/74 tests pass
   - User verified: init commands work with .planning-pm paths
   - User verified: no stale references (only migration-related)
   - User verified: jira-sync resolution returns null (no errors)
   - User status: "approved"

3. **Gap Fix: Update missed path references** - `410d4d4` (fix)
   - Fixed lib/notion/sync-state.js path reference
   - Fixed commands/gsd-pm/edit-phase.md path reference
   - Found during checkpoint verification

## Files Created/Modified

**Core Infrastructure:**
- get-shit-done/bin/gsd-tools.js - Added migratePlanningFolder function and CLI routing

**Workflows:**
- get-shit-done/workflows/new-project.md - Added automatic migration check

**Gap Fixes:**
- bin/notion-sync.js - Updated .planning reference to .planning-pm
- get-shit-done/commands/gsd/edit-phase.md - Updated .planning reference to .planning-pm

## Decisions Made

1. **Backup Strategy**: Create timestamped backup before rename, clean up on success. Backup failures are critical (block migration), cleanup failures are non-critical (log and continue)

2. **Idempotency**: Migration detects three states:
   - Already migrated (.planning-pm exists, .planning doesn't) → no-op
   - Both exist → error (user must resolve manually)
   - Not migrated (.planning exists) → proceed with backup and rename

3. **Workflow Integration**: Automatic migration check in new-project workflow ensures existing projects upgrade transparently on first use

4. **Gap Fix Inclusion**: During verification, discovered two files missed in 22-02 bulk rename. Fixed immediately per deviation Rule 1 (auto-fix bugs)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missed path references in notion-sync.js and edit-phase.md**
- **Found during:** Task 2 (checkpoint verification - grep for stale references)
- **Issue:** Two files still referenced .planning instead of .planning-pm (missed in 22-02 bulk rename)
- **Fix:** Updated bin/notion-sync.js and get-shit-done/commands/gsd/edit-phase.md to use .planning-pm
- **Files modified:** bin/notion-sync.js, get-shit-done/commands/gsd/edit-phase.md
- **Verification:** grep confirmed zero remaining .planning references (excluding .planning-pm and migration-related strings)
- **Commit:** 410d4d4

---

**Total deviations:** 1 auto-fixed (1 bug - missed path references)
**Impact on plan:** Gap fix was necessary to complete the rename properly. No scope creep.

## Checkpoint Details

**Type:** checkpoint:human-verify (Task 2)

**Verification Steps Completed by User:**
1. Ran migration command: `node ./.claude/get-shit-done/bin/gsd-tools.js project migrate-folder`
   - Result: .planning-pm/ exists with all files, .planning/ removed
2. Ran test suite: `node --test get-shit-done/bin/gsd-tools.test.js`
   - Result: 74/74 tests pass
3. Ran init command: `node ./.claude/get-shit-done/bin/gsd-tools.js init plan-phase 22`
   - Result: planning_exists: true, phase_dir contains .planning-pm
4. Checked stale references: `grep -r "\.planning/" get-shit-done/ commands/ agents/ lib/ bin/`
   - Result: Only migration-related references remain (intentional)
5. Verified jira-sync resolution: `node -e 'var ss = require("./lib/jira/sync-state.js"); console.log(ss.loadSyncState(process.cwd()));'`
   - Result: Returns null (no errors)

**Outcome:** All verification steps passed. User approved with "approved" status.

## Issues Encountered

None - migration worked cleanly. Gap fixes were straightforward (two missed files from 22-02).

## User Setup Required

None - migration is automatic on first GSD command execution for existing projects.

## Next Phase Readiness

- FOLD-05 requirement fully satisfied: existing .planning folders can migrate to .planning-pm safely
- Migration is idempotent and includes backup creation
- All tests pass with .planning-pm paths
- No stale references remain in codebase
- Phase 22 complete: all 3 plans executed successfully
- Ready for v1.5 milestone completion

## Self-Check

Verifying all claimed files and commits exist:

**Files:**
- ✓ FOUND: get-shit-done/bin/gsd-tools.js
- ✓ FOUND: get-shit-done/workflows/new-project.md
- ✓ FOUND: bin/notion-sync.js
- ✓ FOUND: get-shit-done/commands/gsd/edit-phase.md

**Commits:**
- ✓ FOUND: 6500376 (Task 1: feat - migration function)
- ✓ FOUND: 410d4d4 (Gap fix: fix - missed path references)

## Self-Check: PASSED
