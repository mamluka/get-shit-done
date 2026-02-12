---
phase: 13-auto-discuss-before-planning
plan: 01
subsystem: planning-workflows
tags: [workflow, discussion-gate, auto-advance, context-capture]
dependency-graph:
  requires:
    - gsd-tools init plan-phase --include context
    - get-shit-done/workflows/discuss-phase.md
  provides:
    - Auto-discussion gate in plan-phase workflow
    - --skip-discussion flag support
  affects:
    - All future plan-phase invocations
    - Auto-advance loop behavior when CONTEXT.md missing
tech-stack:
  added: []
  patterns:
    - AskUserQuestion for binary gate (matches complete-milestone.md pattern)
    - Task() spawn for workflow delegation (matches researcher spawn in step 5)
    - Init reload after subagent modifies filesystem (matches new-project.md pattern)
key-files:
  created: []
  modified:
    - get-shit-done/workflows/plan-phase.md
    - commands/gsd/plan-phase.md
decisions:
  - name: Step 3b positioned between step 4 and step 4b
    rationale: Ensures discussion happens after CONTEXT.md is loaded (step 4) but before phase is marked in-progress (step 4b), preventing premature status changes
    alternatives: ["Insert as step 3a before Load CONTEXT.md - would require duplicate context loading"]
  - name: Three skip conditions (has_context, --skip-discussion, --gaps)
    rationale: has_context prevents redundant prompts, --skip-discussion enables fast-path, --gaps mode is gap closure (context not needed)
    alternatives: ["Single skip condition - less flexible"]
  - name: Init reload after discuss-phase completes
    rationale: Original init from step 1 has context_content null; reload picks up CONTEXT.md created by discuss-phase for downstream agents
    alternatives: ["Re-read CONTEXT.md directly - doesn't update has_context flag or other init metadata"]
metrics:
  duration: 95 seconds
  completed: 2026-02-12
---

# Phase 13 Plan 01: Auto-Discuss Before Planning Summary

Auto-discussion gate integrated into plan-phase workflow, offering interactive context capture when CONTEXT.md is missing.

## What Was Built

Added step 3b to plan-phase workflow that:
- Checks if CONTEXT.md exists for the phase (via `has_context` from init)
- Offers "Discuss context" or "Plan directly" when missing
- Spawns discuss-phase workflow via Task() if user chooses discussion
- Reloads init after discussion to pick up newly-created CONTEXT.md
- Skips gate if `--skip-discussion`, `--gaps`, or CONTEXT.md already exists

Updated plan-phase command metadata to document `--skip-discussion` flag in argument-hint and flags list.

## Tasks Completed

| Task | Name                                            | Commit  | Files Modified                                     |
| ---- | ----------------------------------------------- | ------- | -------------------------------------------------- |
| 1    | Add discussion gate step 3b and update metadata | 7d5cd8a | get-shit-done/workflows/plan-phase.md, commands/gsd/plan-phase.md |

## Technical Implementation

### Discussion Gate Flow

1. **Skip conditions checked first** (step 3b):
   - `has_context === true` → skip (CONTEXT.md already exists)
   - `--skip-discussion` flag → skip (user wants fast path)
   - `--gaps` flag → skip (gap closure mode doesn't need context)

2. **If no skip conditions met**:
   - Display banner explaining discussion purpose (UI/UX decisions, behavior preferences, control areas)
   - AskUserQuestion with two options: "Discuss context" or "Plan directly"

3. **If "Discuss context"**:
   - Spawn discuss-phase via Task() with phase number, STATE.md, ROADMAP.md
   - After Task() returns, reload init to update `has_context` and `context_content`
   - Display confirmation: "Using phase context from: ${PHASE_DIR}/*-CONTEXT.md"
   - If reload still shows `has_context === false`, log warning and proceed

4. **If "Plan directly"**:
   - Proceed to step 4b (Mark Phase In Progress) without context
   - No warning needed — valid user choice

### Integration Points

**Task() spawn pattern:**
```
Task(
  prompt="First, read ~/.claude/get-shit-done/workflows/discuss-phase.md...",
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Discuss Phase {phase} context"
)
```

**Init reload after discussion:**
```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init plan-phase "${PHASE}" --include state,roadmap,requirements,context,research,verification,uat,planning-status)
```

This reload is critical — the original init from step 1 has `context_content: null` because CONTEXT.md didn't exist yet. The reload ensures all downstream agents (researcher, planner, checker) receive the discussion output via the refreshed `context_content` and `has_context` flag.

### Step Numbering

Preserved non-sequential step numbering pattern used throughout GSD workflows:
- Step 1, 2, 3, 4 (Load CONTEXT.md)
- **Step 3b** (Offer Discussion) — inserted between step 4 and step 4b
- Step 4b (Mark Phase In Progress)
- Step 5, 6, 7, 8...

This numbering indicates step 3b logically belongs to the "validate and prepare" phase (steps 1-4) but must execute after step 4 (CONTEXT.md check) to avoid redundant work.

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Verification

From plan verification section:

- ✅ Step numbering is consistent: 1, 2, 3, 4, 3b, 4b, 5, 6, 7, 8...
- ✅ SC1: AskUserQuestion gate when CONTEXT.md missing (step 3b)
- ✅ SC2: Task() spawns full discuss-phase workflow (step 3b "Discuss context" path)
- ✅ SC3: CONTEXT.md created by discuss-phase, verified via init reload
- ✅ SC4: Reloaded context_content passed to researcher/planner/checker via updated INIT variable
- ✅ SC5: "Plan directly" option skips discussion, --skip-discussion flag bypasses gate entirely
- ✅ No anti-patterns: no double-prompting, no forced discussion, has_context checked before prompting
- ✅ Requirements coverage: PLAN-01 (auto-advance loop runs discuss-phase when CONTEXT.md missing) and PLAN-02 (discuss-phase runs full interactive flow — already satisfied by existing workflow)

From plan must_haves:

- ✅ When plan-phase runs and CONTEXT.md is missing, user is asked 'Discuss this phase first or plan directly?'
- ✅ If user chooses discuss, full interactive discussion runs before planning proceeds
- ✅ CONTEXT.md is created and saved before planning steps (research, plan, check) receive it
- ✅ Planning steps receive CONTEXT.md content via reloaded init JSON after discussion
- ✅ User can skip discussion and plan directly if context is already clear
- ✅ --skip-discussion flag bypasses the discussion gate entirely without prompting

From plan key_links:

- ✅ Link from plan-phase.md to discuss-phase.md via Task() spawn (pattern: "discuss-phase")
- ✅ Link from plan-phase.md to gsd-tools init reload (pattern: "init plan-phase.*--include.*context")

## Self-Check: PASSED

**Created files:**
None — this plan modified existing workflows only.

**Modified files verification:**
```
FOUND: get-shit-done/workflows/plan-phase.md
FOUND: commands/gsd/plan-phase.md
```

**Commits verification:**
```
FOUND: 7d5cd8a
```

**Key content verification:**
```
FOUND: Step 3b exists in get-shit-done/workflows/plan-phase.md (line 61)
FOUND: AskUserQuestion with "Discuss context" / "Plan directly" options (lines 86-91)
FOUND: Task() spawn of discuss-phase (lines 98-103)
FOUND: Init reload after Task() (line 109)
FOUND: Skip conditions (has_context, --skip-discussion, --gaps) (lines 64-66)
FOUND: --skip-discussion in argument-hint (commands/gsd/plan-phase.md line 4)
FOUND: --skip-discussion in flags documentation (commands/gsd/plan-phase.md line 37)
FOUND: Success criteria updated (get-shit-done/workflows/plan-phase.md line 490)
```

All verification checks passed.
