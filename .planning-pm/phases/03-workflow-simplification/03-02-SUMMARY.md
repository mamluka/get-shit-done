---
phase: 03-workflow-simplification
plan: 02
subsystem: workflow-automation
one-liner: Auto-advance phase completion with validation and last-phase milestone handling
tags:
  - workflow
  - phase-completion
  - auto-advance
  - validation
dependency-graph:
  requires:
    - phase-management
    - state-tracking
  provides:
    - complete-phase-command
    - phase-validation
    - auto-advance-logic
  affects:
    - phase-complete-workflow
    - milestone-completion-workflow
tech-stack:
  added:
    - validatePhaseComplete function
    - cmdPhaseValidate function
    - complete-phase workflow
  patterns:
    - validation-before-completion
    - auto-advance-routing
    - last-phase-detection
key-files:
  created:
    - commands/gsd/complete-phase.md
    - get-shit-done/workflows/complete-phase.md
  modified:
    - get-shit-done/bin/gsd-tools.js
decisions:
  - title: "Validation is warning-only (allows override)"
    rationale: "PMs may need to force-complete phases with incomplete planning (e.g., requirements moved to different phase)"
    outcome: "validatePhaseComplete returns warnings array, workflow prompts for confirmation"
  - title: "Auto-advance provides guidance, not automatic execution"
    rationale: "Spawning plan-phase automatically would be over-engineering; PM should control when to plan next"
    outcome: "Workflow displays next-phase commands for PM to run manually"
  - title: "Last-phase detection triggers milestone prompt"
    rationale: "Clear end-of-roadmap signal prevents confusion about what to do next"
    outcome: "When is_last_phase=true, workflow suggests /gsd:complete-milestone"
metrics:
  duration: 3
  completed: 2026-02-10
---

# Phase 03 Plan 02: Auto-Advance Phase Completion Summary

**One-liner:** Auto-advance phase completion with validation and last-phase milestone handling

## Overview

Implemented the complete-phase workflow with pre-validation gates and automatic routing to either next-phase planning or milestone completion. This satisfies requirements WKFL-03, WKFL-04, and WKFL-06 by providing a streamlined phase completion flow that validates completeness, marks the phase complete, and guides the PM to the next action.

## What Was Built

### 1. Phase Validation System (Task 1)

**File:** `get-shit-done/bin/gsd-tools.js`

**Added Functions:**
- `validatePhaseComplete(cwd, phaseNum)` - Validates phase is ready for completion
  - Check 1: At least one PLAN.md exists in phase directory
  - Check 2: Requirements mapped to phase (from REQUIREMENTS.md traceability table)
  - Returns: `{ valid, warnings, errors }` structure
- `cmdPhaseValidate(cwd, phaseNum, raw)` - CLI command for `phase validate` subcommand

**Enhanced Functions:**
- `cmdPhaseComplete(cwd, phaseNum, raw)` - Now returns:
  - `validation` - Result of validatePhaseComplete()
  - `auto_advance` - true if next phase exists
  - `milestone_complete` - true if this is the last phase

**Registered Subcommand:**
- `phase validate {N}` - Standalone validation command for workflows

**Verification:**
```bash
node gsd-tools.js phase validate 1 --raw
# Returns: {"valid": false, "warnings": [], "errors": ["Phase 1 not found"]}
```

### 2. Complete-Phase Command and Workflow (Task 2)

**Command:** `commands/gsd/complete-phase.md`
- Name: `gsd:complete-phase`
- Description: Mark a phase as complete with validation and auto-advance
- Argument: `{phase-number}` (required)
- Delegates to workflow for orchestration

**Workflow:** `get-shit-done/workflows/complete-phase.md`

**Steps:**
1. **Load state** - Read STATE.md for context
2. **Normalize phase** - Handle phase number formats (3, 03, 3.1, etc.)
3. **Validate phase** - Run `phase validate {N}`, check for errors/warnings
   - Errors → STOP with helpful message
   - Warnings → Prompt for confirmation (or auto-approve in yolo mode)
   - No issues → Proceed
4. **Complete phase** - Run `phase complete {N}`, parse result
5. **Auto-advance or milestone** - Route based on result:
   - If `auto_advance === true`: Display "Run /gsd:plan-phase {next}" guidance
   - If `milestone_complete === true`: Display "Run /gsd:complete-milestone" guidance
6. **Commit completion** - Commit ROADMAP.md and STATE.md changes

**Key Design Choices:**
- Validation warns but doesn't block (override allowed)
- Auto-advance provides guidance, not automatic execution
- Last-phase detection triggers milestone completion prompt
- All operations synchronous (Phase 1 decision)

## Deviations from Plan

### Auto-Fixed Issues

**1. [Rule 3 - Blocking Issue] Fixed gitignored .claude/ directory**
- **Found during:** Task 1 execution
- **Issue:** Plan specified modifying `.claude/get-shit-done/bin/gsd-tools.js`, but `.claude/` directory is gitignored (line 9 in .gitignore: "# Local test installs"). Changes to gitignored files cannot be committed.
- **Fix:** Modified the source files in `get-shit-done/` directory instead (not gitignored). The `.claude/` directory is for local test installations; the actual source is in `get-shit-done/`.
- **Files modified:** `get-shit-done/bin/gsd-tools.js` (source), not `.claude/get-shit-done/bin/gsd-tools.js` (local install)
- **Commits:** 5180fa0, 29c6c86

## Implementation Details

### validatePhaseComplete Logic

```javascript
function validatePhaseComplete(cwd, phaseNum) {
  const result = { valid: true, warnings: [], errors: [] };
  const phaseInfo = findPhaseInternal(cwd, phaseNum);

  // Check 1: Phase exists
  if (!phaseInfo || !phaseInfo.found) {
    result.valid = false;
    result.errors.push(`Phase ${phaseNum} not found`);
    return result;
  }

  // Check 2: At least one plan exists
  if (!phaseInfo.plans || phaseInfo.plans.length === 0) {
    result.warnings.push('No plans created for this phase');
  }

  // Check 3: Requirements mapped (if REQUIREMENTS.md exists)
  const reqPath = resolvePlanning(cwd, 'REQUIREMENTS.md');
  if (fs.existsSync(reqPath)) {
    const reqContent = fs.readFileSync(reqPath, 'utf-8');
    // Find requirements mapped to this phase in traceability table
    // Pattern: | REQ-ID | Phase N | Status |
    const phasePattern = new RegExp(
      `\\|\\s*(\\w+-\\d+)\\s*\\|\\s*Phase\\s+${phaseNum}\\s*\\|\\s*(\\w+)\\s*\\|`,
      'gi'
    );
    let match;
    const pendingReqs = [];
    while ((match = phasePattern.exec(reqContent)) !== null) {
      if (match[2].toLowerCase() === 'pending') {
        pendingReqs.push(match[1]);
      }
    }
    if (pendingReqs.length > 0) {
      result.warnings.push(
        `${pendingReqs.length} requirement(s) still pending: ${pendingReqs.join(', ')}`
      );
    }
  }

  return result;
}
```

### cmdPhaseComplete Enhancements

Added three new fields to the result object:
- `validation` - Full validation result (valid, warnings, errors)
- `auto_advance` - Boolean: `!isLastPhase && nextPhaseNum !== null`
- `milestone_complete` - Boolean: `isLastPhase`

These fields enable the workflow to route correctly:
- Auto-advance: Guide to next phase planning
- Milestone complete: Guide to milestone completion

### Workflow Integration

The workflow uses these fields to provide contextual guidance:

```bash
COMPLETE_RESULT=$(node gsd-tools.js phase complete "${PHASE_NUM}" --raw)
# Parse: auto_advance, milestone_complete, next_phase, next_phase_name

if [ "$auto_advance" = "true" ]; then
  echo "Next: /gsd:plan-phase ${next_phase}"
elif [ "$milestone_complete" = "true" ]; then
  echo "Next: /gsd:complete-milestone"
fi
```

## Requirements Satisfied

| Requirement | Description | Implementation |
|-------------|-------------|----------------|
| WKFL-03 | Auto-advance after phase completion | Workflow displays next-phase guidance when auto_advance=true |
| WKFL-04 | Validate completeness before marking complete | validatePhaseComplete() checks plans exist and requirements mapped |
| WKFL-06 | Last-phase milestone handling | Workflow detects milestone_complete=true and prompts for /gsd:complete-milestone |

## Files Created

1. `commands/gsd/complete-phase.md` - Slash command entry point
2. `get-shit-done/workflows/complete-phase.md` - Orchestration workflow

## Files Modified

1. `get-shit-done/bin/gsd-tools.js`:
   - Added `validatePhaseComplete()` function (lines ~3309-3355)
   - Added `cmdPhaseValidate()` function (lines ~3357-3363)
   - Enhanced `cmdPhaseComplete()` to call validatePhaseComplete and return auto_advance/milestone_complete fields (lines ~3485-3499)
   - Registered 'validate' subcommand in phase case handler (line ~5629)

## Testing

**Verification Commands:**

```bash
# Test phase validate
node get-shit-done/bin/gsd-tools.js phase validate 1 --raw
# Expected: JSON with valid, warnings, errors fields

# Test phase complete error handling
node get-shit-done/bin/gsd-tools.js phase complete
# Expected: "Error: phase number required for phase complete"

# Test validatePhaseComplete call count
grep -c "validatePhaseComplete" get-shit-done/bin/gsd-tools.js
# Expected: 3 (function def + 2 calls)

# Test auto_advance field exists
grep "auto_advance" get-shit-done/bin/gsd-tools.js
# Expected: "auto_advance: !isLastPhase && nextPhaseNum !== null,"
```

All verifications passed.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 5180fa0 | feat(03-02): add validatePhaseComplete() and enhance cmdPhaseComplete() |
| 2 | 29c6c86 | feat(03-02): create complete-phase command and workflow |

## Self-Check

**Files exist:**

```bash
# Check created files
[ -f "commands/gsd/complete-phase.md" ] && echo "FOUND: commands/gsd/complete-phase.md" || echo "MISSING: commands/gsd/complete-phase.md"
[ -f "get-shit-done/workflows/complete-phase.md" ] && echo "FOUND: get-shit-done/workflows/complete-phase.md" || echo "MISSING: get-shit-done/workflows/complete-phase.md"

# Check modified file
[ -f "get-shit-done/bin/gsd-tools.js" ] && echo "FOUND: get-shit-done/bin/gsd-tools.js" || echo "MISSING: get-shit-done/bin/gsd-tools.js"
```

**Commits exist:**

```bash
git log --oneline --all | grep -q "5180fa0" && echo "FOUND: 5180fa0" || echo "MISSING: 5180fa0"
git log --oneline --all | grep -q "29c6c86" && echo "FOUND: 29c6c86" || echo "MISSING: 29c6c86"
```

**Results:**

```
FOUND: commands/gsd/complete-phase.md
FOUND: get-shit-done/workflows/complete-phase.md
FOUND: get-shit-done/bin/gsd-tools.js
FOUND: 5180fa0
FOUND: 29c6c86
```

## Self-Check: PASSED

All files created, all commits exist, all verifications passed.
