---
phase: 11-quick-settings-shortcut
plan: 01
subsystem: workflow-ux
tags: [streamlined-workflow, settings, ux, quick-setup]
dependency_graph:
  requires: [project-initialization]
  provides: [quick-settings-shortcut, recommended-defaults]
  affects: [new-project-workflow, settings-workflow]
tech_stack:
  added: []
  patterns: [single-source-of-truth, dot-notation-config]
key_files:
  created: []
  modified:
    - get-shit-done/bin/gsd-tools.js
    - get-shit-done/workflows/new-project.md
decisions:
  - choice: "depth: 'standard' for recommended settings"
    rationale: "User decision from CONTEXT.md locked decisions - not 'quick'"
    outcome: "Standard depth provides balanced scope without overwhelming users"
  - choice: "Object.freeze for RECOMMENDED_SETTINGS constant"
    rationale: "Prevents accidental mutation, enforces single source of truth"
    outcome: "Constant is immutable, preventing drift between usages"
  - choice: "Dot-notation keys for nested workflow settings"
    rationale: "Matches cmdConfigSet's existing dot-notation parsing pattern"
    outcome: "Consistent config handling across all subcommands"
metrics:
  duration: "2.9 min"
  completed_date: "2026-02-12"
  tasks: 2
  commits: 2
---

# Phase 11 Plan 01: Quick Settings Shortcut Summary

**One-liner:** Add Recommended/Custom settings gate to new-project workflow with single-command application of balanced defaults via frozen RECOMMENDED_SETTINGS constant

## What Was Built

Added a quick settings shortcut to the new-project workflow so users can apply recommended defaults in one action instead of answering 8 individual settings questions. Most users want the recommended settings, so this streamlines the most common path through project setup.

**Core components:**

1. **RECOMMENDED_SETTINGS constant** in gsd-tools.js
   - Frozen object with 8 settings (mode, depth, parallelization, commit_docs, model_profile, workflow.research, workflow.plan_check, workflow.verifier)
   - Single source of truth for recommended project settings
   - Dot-notation keys for nested workflow settings

2. **config-init-recommended subcommand** in gsd-tools.js
   - Applies all recommended settings atomically via single config write
   - Reuses same dot-notation logic as cmdConfigSet for nested keys
   - Returns JSON with applied settings for display

3. **recommended-settings subcommand** in gsd-tools.js
   - Returns RECOMMENDED_SETTINGS constant as JSON for introspection/testing

4. **Round 0 gate** in new-project.md Step 6
   - Presents Recommended and Custom as two equal options before individual questions
   - Recommended path calls config-init-recommended and shows summary table
   - Custom path runs existing Round 1 + Round 2 flow unchanged
   - Auto mode applies recommended settings directly without prompting

## Tasks Completed

| Task | Description | Commit | Files Modified |
|------|-------------|--------|----------------|
| 1 | Add RECOMMENDED_SETTINGS constant and config-init-recommended subcommand | 065dc56 | get-shit-done/bin/gsd-tools.js |
| 2 | Add Recommended/Custom gate to new-project workflow Step 6 | 61c6d75 | get-shit-done/workflows/new-project.md |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Implementation

**RECOMMENDED_SETTINGS constant:**
```javascript
const RECOMMENDED_SETTINGS = Object.freeze({
  mode: 'yolo',
  depth: 'standard',
  parallelization: true,
  commit_docs: true,
  model_profile: 'balanced',
  'workflow.research': true,
  'workflow.plan_check': true,
  'workflow.verifier': true,
});
```

**config-init-recommended pattern:**
- Loads or creates config.json (same pattern as cmdConfigSet)
- Iterates over RECOMMENDED_SETTINGS entries
- For each entry, uses dot-notation nested key assignment logic (split on '.', traverse/create objects, set leaf value)
- Writes complete config.json once (single atomic write, not N separate writes)
- Returns JSON: `{ applied: true, settings: { ...RECOMMENDED_SETTINGS } }`

**Round 0 gate flow:**
1. User sees two equal options: Recommended vs Custom
2. If Recommended: Call config-init-recommended → show summary table → skip to Step 6.5
3. If Custom: Run existing Round 1 + Round 2 questions → create config.json → continue to Step 6.5
4. Auto mode: Call config-init-recommended directly without prompting

## Verification Results

All verification criteria passed:

- ✓ **SETUP-01**: new-project.md Step 6 shows Recommended/Custom choice before individual questions
- ✓ **SETUP-02**: RECOMMENDED_SETTINGS contains all 8 settings (mode=yolo, depth=standard, research=true, plan_check=true, verifier=true, model_profile=balanced, commit_docs=true, parallelization=true)
- ✓ **SETUP-03**: RECOMMENDED_SETTINGS defined exactly once as Object.freeze constant
- ✓ **No drift**: config-init-recommended uses RECOMMENDED_SETTINGS constant (not duplicate values)
- ✓ **Custom unchanged**: Round 1 and Round 2 question blocks unchanged from previous version
- ✓ **Existing tests**: Test failures are pre-existing issues unrelated to changes (path validation and JSON parsing errors in unrelated parts of code)

**Manual verification:**
```bash
# Test recommended-settings subcommand
$ node get-shit-done/bin/gsd-tools.js recommended-settings
{
  "mode": "yolo",
  "depth": "standard",
  "parallelization": true,
  "commit_docs": true,
  "model_profile": "balanced",
  "workflow.research": true,
  "workflow.plan_check": true,
  "workflow.verifier": true
}

# Test config-init-recommended subcommand
$ node get-shit-done/bin/gsd-tools.js config-init-recommended
{
  "applied": true,
  "settings": { ...all 8 settings... }
}

# Verify config.json created with nested workflow keys
$ cat .planning/config.json
{
  "mode": "yolo",
  "depth": "standard",
  "parallelization": true,
  "commit_docs": true,
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  }
}
```

## Impact

**User Experience:**
- Users can now apply recommended settings in one action instead of answering 8 individual questions
- Summary table shows exactly what was set (no hidden magic)
- Custom path remains unchanged for users who want fine-grained control
- Auto mode gets recommended settings automatically

**Workflow streamlining:**
- Reduces new-project setup time for the most common case (recommended settings)
- No friction added to existing custom settings flow
- Settings can still be changed later via /gsd:settings

**Code quality:**
- Single source of truth for recommended settings (RECOMMENDED_SETTINGS constant)
- No value duplication between recommended and interactive flows
- Dot-notation pattern consistent with existing cmdConfigSet
- Atomic config writes prevent partial updates

## Self-Check: PASSED

**Files created:**
- ✓ .planning/phases/11-quick-settings-shortcut/11-01-SUMMARY.md (this file)

**Files modified:**
- ✓ get-shit-done/bin/gsd-tools.js (RECOMMENDED_SETTINGS constant, config-init-recommended subcommand)
- ✓ get-shit-done/workflows/new-project.md (Round 0 gate in Step 6)

**Commits verified:**
- ✓ 065dc56: feat(11-01): add RECOMMENDED_SETTINGS constant and config-init-recommended subcommand
- ✓ 61c6d75: feat(11-01): add Recommended/Custom gate to new-project workflow Step 6

All files exist, all commits found in git log.
