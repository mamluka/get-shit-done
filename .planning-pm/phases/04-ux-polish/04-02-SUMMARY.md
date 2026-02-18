---
phase: 04-ux-polish
plan: 02
subsystem: ux
tags: [documentation, terminology, user-experience, business-language]
dependency_graph:
  requires: [03-03]
  provides: [pm-friendly-language]
  affects: [all-commands, all-workflows]
tech_stack:
  added: []
  patterns: [terminology-consistency]
key_files:
  created: []
  modified:
    - commands/gsd/execute-phase.md
    - commands/gsd/progress.md
    - get-shit-done/workflows/switch-project.md
    - get-shit-done/workflows/progress.md
    - get-shit-done/workflows/new-project.md
decisions:
  - Use "planning tool" terminology in tombstones to set clear expectations
  - Replace "Error:" with "Problem:" prefix for consistency
  - Rename "Execution" to "Plan Processing" to avoid confusion with code execution
  - Remove all execute-phase routing from workflows
metrics:
  duration_minutes: 1
  tasks_completed: 2
  files_modified: 5
  commits: 2
  completed_date: 2026-02-11
---

# Phase 04 Plan 02: Business Language Updates Summary

**One-liner:** Updated all command descriptions and workflow routing to use PM-friendly business terminology, replacing developer concepts with planning-focused language.

## What Was Accomplished

### Task 1: Execute-Phase Tombstone Update
Updated the execute-phase.md tombstone from a terse "REMOVED" notice to a helpful, PM-friendly redirect that:
- Explains GSD's planning-only nature in business terms
- Provides clear alternatives (plan-phase, progress, discuss-phase, complete-milestone)
- Includes rationale for why the change was made
- Follows Pattern 4 from 04-RESEARCH.md

**Commit:** 9995c9f

### Task 2: Command and Workflow Business Language Updates
Updated command descriptions and workflow files to eliminate developer terminology:

**Command files updated:**
- `progress.md`: Changed description from "route to next action (execute or plan)" to "recent work and what to do next"

**Workflow files updated:**
- `switch-project.md`: Removed execute-phase from "Next steps" section
- `progress.md`:
  - Replaced execute-phase routing with plan-phase in Route A
  - Removed execute-phase from Route E "Also available" section
  - Updated success criteria to "smart routing to appropriate planning command"
- `new-project.md`:
  - Changed "Error:" to "Problem:" for auto-mode message
  - Renamed "Execution" header to "Plan Processing"
  - Changed question from "Run plans in parallel?" to "Process plans in parallel?"
  - Updated verifier description from "After phase execution" to "After phase planning is complete"

**Commit:** 15617d4

## Deviations from Plan

None - plan executed exactly as written. All specified files were updated with the exact changes described in the task actions.

## Verification Results

All verification criteria passed:

1. ✓ `execute-phase` only appears in execute-phase.md tombstone (except historical comment in audit-milestone.md)
2. ✓ No workflow routes to execute-phase as an available command
3. ✓ No command descriptions use developer jargon (frontmatter, YAML, git branch)
4. ✓ execute-phase.md contains clear redirect to planning commands
5. ✓ progress.md routes to planning commands only
6. ✓ All "Next steps" sections reference planning commands

## Key Decisions Made

1. **Planning tool framing**: Used "This Is a Planning Tool" as the main header for execute-phase tombstone to immediately set expectations
2. **Consistency prefix**: Changed "Error:" to "Problem:" to maintain consistent, less technical messaging
3. **Semantic accuracy**: "Plan Processing" better describes what the system does (processes planning artifacts) vs "Execution" (which suggests code execution)
4. **Verifier timing clarity**: Updated from "After phase execution" to "After phase planning is complete" to correctly describe when the verifier runs

## Impact

**User-facing improvements:**
- PMs see business-focused language throughout the system
- Command descriptions use familiar concepts (plan, review, check) instead of technical terms (execute, parse, validate)
- Tombstone redirects are helpful rather than abrupt
- All workflow routing points to planning commands

**Consistency gains:**
- Unified terminology across all command descriptions
- Consistent error/problem messaging
- No mixed signals about GSD's planning-only nature

## Files Modified

| File | Lines Changed | Type |
|------|--------------|------|
| commands/gsd/execute-phase.md | ~20 | Tombstone rewrite |
| commands/gsd/progress.md | 1 | Description update |
| get-shit-done/workflows/switch-project.md | -1 | Remove execute-phase |
| get-shit-done/workflows/progress.md | 4 | Replace execution routing |
| get-shit-done/workflows/new-project.md | 3 | Terminology updates |

## Testing Notes

Verified by grep commands:
- No workflow files route to execute-phase
- No command descriptions contain developer jargon
- execute-phase tombstone contains planning-only language and redirects
- All next-steps sections point to planning commands

## Next Steps

Phase 04 Plan 01 should follow to complete the UX polish phase.

---

*Completed in 1 minute on 2026-02-11*


## Self-Check: PASSED

All claimed artifacts verified:
- ✓ SUMMARY.md created
- ✓ Commit 9995c9f exists (Task 1)
- ✓ Commit 15617d4 exists (Task 2)
- ✓ All modified files exist on disk
- ✓ All verification commands passed
