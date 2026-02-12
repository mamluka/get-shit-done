---
phase: 16-phase-integration-user-control
plan: 01
subsystem: workflows
tags: [notion-integration, comment-processing, planning-automation, user-control]
dependency_graph:
  requires: [15-01]
  provides: [phase-integration-workflow, comment-driven-planning]
  affects: [notion-comments-workflow, roadmap-updates, requirements-updates]
tech_stack:
  patterns: [workflow-rewrite, two-path-decision, artifact-mutation]
key_files:
  created: []
  modified:
    - get-shit-done/workflows/notion-comments.md
decisions:
  - Replace theme clustering with direct phase mapping
  - User choice between discuss vs auto-incorporate (CTRL-01)
  - Both paths converge on artifact modification (ROADMAP.md, REQUIREMENTS.md)
metrics:
  duration_seconds: 128
  completed: 2026-02-12T16:21:28Z
---

# Phase 16 Plan 01: Phase Integration & User Control Summary

Replace notion-comments workflow's old triage flow with phase-integration workflow that directly modifies ROADMAP.md and REQUIREMENTS.md based on comment feedback.

## Overview

**One-liner:** Transform notion-comments from passive triage tool into active planning driver with discuss/auto-incorporate paths and direct artifact mutation

**What was built:**
- Replaced cluster_themes, triage_discussion, and save_results steps with analyze_and_recommend and incorporate_changes
- analyze_and_recommend reads ROADMAP.md/REQUIREMENTS.md, maps each comment to existing phase update or new phase creation, presents structured recommendations
- incorporate_changes handles both discuss path (per-change review) and auto path (all changes applied), modifies planning artifacts directly
- Updated purpose, required_reading, and success_criteria to reflect new functionality

**Why it matters:**
This completes the comment-driven planning loop. Instead of just presenting comments for manual action, the workflow now automates the incorporation of feedback into the project's planning artifacts, with user control over the process.

## Tasks Completed

| Task | Name | Commit | Files Modified |
|------|------|--------|----------------|
| 1 | Replace cluster_themes, triage_discussion, and save_results with analyze_and_recommend and incorporate_changes steps | 9ff581f | get-shit-done/workflows/notion-comments.md |
| 2 | Update required_reading and validate workflow integrity | d11e5ef | get-shit-done/workflows/notion-comments.md |

## Implementation Details

### Task 1: Main Workflow Rewrite

**Changes:**
- Removed old steps: cluster_themes (theme grouping), triage_discussion (accept/defer/dismiss), save_results (dated triage file)
- Added analyze_and_recommend step: reads ROADMAP.md/REQUIREMENTS.md, analyzes each comment for update-existing vs create-new, presents structured recommendations with rationale, prompts user with discuss/auto choice
- Added incorporate_changes step: handles both discuss path (per-change accept/modify/skip) and auto path (all applied), modifies ROADMAP.md (add/update phases), modifies REQUIREMENTS.md (add requirements with traceability), commits changes with gsd-tools
- Updated purpose tag to reflect new functionality: "analyze them against the current roadmap, recommend planning changes (update existing phases or create new ones), and let the user choose between interactive discussion or auto-incorporation"
- Updated success_criteria to match new flow: comment interpretation → roadmap analysis → user choice → artifact modification → git commit
- Updated interpret_comments note to reference incorporate_changes instead of save_results

**Patterns:**
- Two-path decision pattern: discuss (interactive) vs auto (autonomous)
- Convergent execution: both paths merge at artifact modification step
- Structured recommendations: change type, affected artifact, rationale
- Direct artifact mutation: workflow modifies ROADMAP.md and REQUIREMENTS.md in-place

### Task 2: Cleanup and Validation

**Changes:**
- Added REQUIREMENTS.md to required_reading (workflow now reads and modifies it)
- Updated "Nothing to triage" message to "No comments to process" for terminology consistency
- Verified no orphaned references to themes, triage, severity, or old triage flow remain
- Verified exactly 4 steps: fetch_comments, interpret_comments, analyze_and_recommend, incorporate_changes
- Verified AskUserQuestion usage: discuss/auto prompt, per-change review in discuss mode

**Validation:**
- Structure check: 4 steps in correct order
- No theme clustering or severity assessment logic
- No dated triage file generation
- fetch_comments and interpret_comments completely unchanged from Phase 15

## Deviations from Plan

None — plan executed exactly as written.

## Must-Haves Verification

All 6 requirements from plan satisfied:

**PINT-01:** ✓ analyze_and_recommend reads ROADMAP.md and recommends update-existing vs create-new for each comment
**PINT-02:** ✓ For existing phase updates, identifies specific phase + what changes are needed (add requirement, add success criterion, update goal, modify requirements)
**PINT-03:** ✓ For new phase creation, proposes name, goal, requirements, success criteria in roadmap format, suggests placement in milestone
**CTRL-01:** ✓ User prompted with exactly two options: "Discuss changes" or "Let Claude decide"
**CTRL-02:** ✓ Discuss path walks through each change individually with accept/modify/skip options
**CTRL-03:** ✓ Auto path incorporates all recommended changes automatically without per-change review

## Key Decisions

1. **Remove theme clustering entirely** — Old flow grouped comments into themes before triage. New flow analyzes each comment directly against roadmap phases. Simpler, more precise mapping.

2. **Two-path decision (discuss vs auto)** — User chooses control level upfront. Discuss path for careful review, auto path for rapid incorporation. Both paths converge on artifact modification.

3. **Direct artifact mutation** — Workflow modifies ROADMAP.md and REQUIREMENTS.md in-place rather than generating dated triage files. Comments directly drive planning changes.

4. **Preserve Phase 15 steps unchanged** — fetch_comments and interpret_comments remain identical. Phase 16 only replaces steps 3-5, maintaining backward compatibility.

## Integration Points

**Depends on:**
- Phase 15 (15-01): Comment interpretation and output routing
- Phase 10: Comment retrieval infrastructure (notion-sync.js comments command)

**Provides:**
- Complete comment-driven planning loop: fetch → interpret → analyze → incorporate
- User control over planning changes (discuss vs auto)
- Direct roadmap/requirements updates from Notion feedback

**Affects:**
- ROADMAP.md: Can add new phases or update existing phases
- REQUIREMENTS.md: Can add new requirements with traceability
- .planning/phases/: Can create new phase directories

## Testing Notes

**Validation performed:**
- Verified 4 steps in workflow (fetch, interpret, analyze_and_recommend, incorporate_changes)
- Confirmed no orphaned references to old triage flow (themes, severity, accept/defer/dismiss)
- Verified AskUserQuestion usage for user prompts
- Confirmed required_reading includes all necessary files (ROADMAP.md, STATE.md, REQUIREMENTS.md)

**To test in practice:**
1. Run `/gsd:notion-comments` with actual Notion comments
2. Verify analyze_and_recommend correctly maps comments to phases
3. Test discuss path: accept, modify, skip changes
4. Test auto path: all changes applied automatically
5. Verify ROADMAP.md and REQUIREMENTS.md correctly updated
6. Verify git commit includes both files

## Self-Check

Verifying implementation claims:

**File existence:**
```bash
[ -f "get-shit-done/workflows/notion-comments.md" ] && echo "FOUND: get-shit-done/workflows/notion-comments.md"
```
FOUND: get-shit-done/workflows/notion-comments.md

**Commits:**
```bash
git log --oneline --all | grep -q "9ff581f" && echo "FOUND: 9ff581f"
git log --oneline --all | grep -q "d11e5ef" && echo "FOUND: d11e5ef"
```
FOUND: 9ff581f
FOUND: d11e5ef

## Self-Check: PASSED

All files exist and all commits verified.

## Next Steps

1. **Test the workflow** with real Notion comments to validate phase mapping logic
2. **Plan Phase 17** if additional comment-driven planning features are needed
3. **Update documentation** if workflow usage patterns emerge from testing
4. **Consider Phase 16 Plan 02** if traceability updates need refinement

---
*Generated by gsd-plan-executor on 2026-02-12*
