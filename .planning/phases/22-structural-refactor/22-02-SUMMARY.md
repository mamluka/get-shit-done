---
phase: 22-structural-refactor
plan: 02
subsystem: documentation
tags: [path-resolution, refactoring, workflow-infrastructure]

# Dependency graph
requires:
  - phase: 22-01
    provides: PathResolver module that resolves to .planning-pm
provides:
  - All workflow markdown files reference .planning-pm paths
  - All template markdown files reference .planning-pm paths
  - All reference markdown files reference .planning-pm paths
  - All command markdown files reference .planning-pm paths
  - All agent markdown files reference .planning-pm paths
  - All test assertions validate .planning-pm paths
affects: [all future phases, workflow execution, agent behavior, testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Consistent .planning-pm path references across all markdown content
    - Sed-based bulk find-and-replace for framework-wide refactoring

key-files:
  created: []
  modified:
    - get-shit-done/workflows/*.md (31 files)
    - get-shit-done/templates/*.md (30 files)
    - get-shit-done/references/*.md (7 files)
    - commands/gsd-pm/*.md (26 files)
    - agents/gsd-*.md (8 files)
    - get-shit-done/bin/gsd-tools.test.js

key-decisions:
  - Used sed with pattern `\.planning\([^-]\)` to avoid double-renaming .planning-pm
  - Updated .bak files to maintain consistency across all framework files
  - Committed markdown files and test file separately for clear atomic changes

patterns-established:
  - All framework markdown content uses .planning-pm for path references
  - Test assertions validate .planning-pm directory structure

# Metrics
duration: 3.5min
completed: 2026-02-18
---

# Phase 22 Plan 02: Content Path Migration Summary

**Renamed all .planning references to .planning-pm across 103 framework files (91 markdown + 1 test file + 11 references), aligning workflow instructions with PathResolver infrastructure**

## Performance

- **Duration:** 3.5 min
- **Started:** 2026-02-18T17:44:57Z
- **Completed:** 2026-02-18T17:48:26Z
- **Tasks:** 2
- **Files modified:** 103

## Accomplishments
- Bulk renamed .planning to .planning-pm in 31 workflow files
- Bulk renamed .planning to .planning-pm in 30 template files
- Bulk renamed .planning to .planning-pm in 7 reference files
- Bulk renamed .planning to .planning-pm in 26 command files
- Bulk renamed .planning to .planning-pm in 8 agent files
- Updated 157 test assertions in gsd-tools.test.js to validate .planning-pm paths
- Zero remaining .planning references across all framework markdown and test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename .planning to .planning-pm in all markdown content files** - `13b20ea` (refactor)
   - 90 files changed, 581 insertions(+), 581 deletions(-)
   - Updated workflows, templates, references, commands, agents, and .bak files

2. **Task 2: Rename .planning to .planning-pm in gsd-tools.test.js** - `4f4217f` (test)
   - 1 file changed, 157 insertions(+), 157 deletions(-)
   - All test assertions now validate .planning-pm paths

## Files Created/Modified

**Workflows (31 files):**
- get-shit-done/workflows/*.md - All path references updated to .planning-pm

**Templates (30 files):**
- get-shit-done/templates/*.md - All example paths and context references updated

**References (7 files):**
- get-shit-done/references/*.md - All path examples updated

**Commands (26 files):**
- commands/gsd-pm/*.md - All execution flow paths updated
- commands/gsd-pm/new-project.md.bak - Backup file also updated for consistency

**Agents (8 files):**
- agents/gsd-codebase-mapper.md
- agents/gsd-debugger.md
- agents/gsd-integration-checker.md
- agents/gsd-phase-researcher.md
- agents/gsd-planner.md
- agents/gsd-project-researcher.md
- agents/gsd-research-synthesizer.md
- agents/gsd-roadmapper.md

**Tests (1 file):**
- get-shit-done/bin/gsd-tools.test.js - 157 assertions updated

## Decisions Made

1. **Sed pattern strategy**: Used `\.planning\([^-]\)` pattern to match .planning followed by any non-hyphen character, preventing double-replacement of already-correct .planning-pm strings
2. **Backup file inclusion**: Updated .bak files to maintain consistency across all framework files
3. **Separate commits**: Committed markdown files (Task 1) and test file (Task 2) separately for clear atomic changes and easier rollback if needed
4. **Absolute paths**: Used absolute paths in sed commands to avoid any ambiguity about which files were being modified

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected directory paths**
- **Found during:** Task 1 initial execution
- **Issue:** Plan referenced `commands/gsd-pm/` but actual directory is `commands/gsd-pm/` at root level, not `.claude/commands/gsd-pm/`
- **Fix:** Corrected paths to use root-level directories (get-shit-done/, commands/, agents/) instead of .claude/ subdirectories
- **Files modified:** All 103 files
- **Verification:** grep confirmed zero remaining .planning/ references (excluding .planning-pm/)
- **Committed in:** 13b20ea and 4f4217f (both task commits)

---

**Total deviations:** 1 auto-fixed (1 blocking - path correction)
**Impact on plan:** Path correction was necessary to modify the correct framework files. The .claude/ directory is gitignored, so changes there would not have been tracked. No scope creep.

## Issues Encountered

None - bulk find-and-replace with sed worked cleanly across all files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All framework markdown content now references .planning-pm
- Combined with Plan 01 (PathResolver), the framework now has consistent .planning-pm path resolution across JS and markdown
- Combined with Plan 03 (actual directory rename), the structural refactor will be complete
- Ready for Plan 03 execution

## Self-Check

Verifying all claimed files and commits exist:

**Files:**
- ✓ get-shit-done/workflows/new-project.md
- ✓ get-shit-done/templates/state.md
- ✓ agents/gsd-planner.md
- ✓ get-shit-done/bin/gsd-tools.test.js

**Commits:**
- ✓ 13b20ea (Task 1: markdown files)
- ✓ 4f4217f (Task 2: test file)

**Self-Check Result: PASSED** ✓

---
*Phase: 22-structural-refactor*
*Plan: 02*
*Completed: 2026-02-18*
