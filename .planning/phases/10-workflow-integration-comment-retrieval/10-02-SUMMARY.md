---
phase: 10-workflow-integration-comment-retrieval
plan: 02
subsystem: workflow-integration
tags: [notion, workflows, user-interaction, feedback-loop]
dependency_graph:
  requires:
    - 10-01 (comment-retriever module)
  provides:
    - milestone-completion-notion-sync
    - comment-triage-workflow
  affects:
    - complete-milestone workflow (added prompt_notion_sync step)
    - user feedback loop (bidirectional Notion integration)
tech_stack:
  added: []
  patterns:
    - Interactive triage workflow with AskUserQuestion gates
    - Sequential step execution (no subprocess spawning)
    - Dated output files for historical tracking
key_files:
  created:
    - commands/gsd/notion-comments.md
    - get-shit-done/workflows/notion-comments.md
  modified:
    - get-shit-done/workflows/complete-milestone.md
decisions:
  - "Sequential prompt pattern (not subprocess spawning) matches established GSD conventions"
  - "Prompt inserted after git_tag, before git_commit_milestone to ensure milestone finalized before Notion sync"
  - "Sync errors don't fail milestone completion (best-effort convenience)"
  - "Dated triage files use ISO 8601 format (YYYY-MM-DD) with counter suffix if multiple runs per day"
  - "Theme clustering targets 2-5 themes for manageable triage discussion"
metrics:
  duration_seconds: 221
  duration_formatted: "3m 41s"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  completed_date: "2026-02-11"
---

# Phase 10 Plan 02: Workflow Integration and Comment Retrieval Summary

**One-liner:** Integrated Notion sync prompt into milestone completion and built interactive comment triage workflow with theme clustering

## What Was Built

### Task 1: Notion Sync Prompt in Milestone Completion
Added `prompt_notion_sync` step to `complete-milestone.md` workflow:
- Positioned between `git_tag` and `git_commit_milestone` steps
- Checks for Notion configuration before prompting
- Automatically runs `bin/notion-sync.js sync` if user confirms
- Handles both "yes" and "skip" responses gracefully
- Sync errors don't block milestone completion (best-effort)

**Commit:** 453693a

### Task 2: Interactive Comment Triage Workflow
Created `/gsd:notion-comments` command and workflow:
- **fetch_comments** step: Calls `bin/notion-sync.js comments` to retrieve unresolved comments from all synced Notion pages
- **cluster_themes** step: Analyzes comments and groups into 2-5 themes with severity and affected phase mapping
- **triage_discussion** step: Walks user through each theme with accept/defer/dismiss/discuss options
- **save_results** step: Writes dated `.planning/notion-comments-YYYY-MM-DD.md` file and commits to git

**Pattern:** Uses AskUserQuestion at decision gates (not subprocess spawning) to match GSD interactive workflow conventions

**Commit:** c638238

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `get-shit-done/workflows/complete-milestone.md` | Added Notion sync prompt step | +59 |
| `commands/gsd/notion-comments.md` | Command entry point for comment triage | 12 |
| `get-shit-done/workflows/notion-comments.md` | 4-step interactive triage workflow | 214 |

## Architecture Decisions

### 1. Sync Prompt Placement
**Decision:** Insert `prompt_notion_sync` after `git_tag`, before `git_commit_milestone`

**Rationale:**
- Milestone must be fully finalized (tagged) before offering to push to Notion
- Any sync state changes can be included in the final milestone commit
- If sync fails, milestone is already complete (not blocked)

**Trade-off:** Sync happens late in workflow, but this ensures data integrity

### 2. Interactive Pattern (Not Subprocess)
**Decision:** Use AskUserQuestion for triage discussion instead of spawning subagents

**Rationale:**
- Matches established GSD patterns (`complete-milestone`, `new-project`, etc.)
- User stays in same conversation context
- No subprocess coordination complexity

**Trade-off:** Less parallelizable, but more appropriate for conversational triage

### 3. Theme Clustering Target
**Decision:** Group comments into 2-5 themes

**Rationale:**
- Too few themes (1-2): Loses nuance, mixes unrelated feedback
- Too many themes (6+): Triage discussion becomes tedious
- 2-5 is sweet spot for actionable clustering

**Trade-off:** Requires AI judgment to group meaningfully

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification checks passed:

**Task 1:**
- [x] `prompt_notion_sync` step exists in workflow
- [x] Step positioned after `git_tag` and before `git_commit_milestone`
- [x] All existing steps remain unchanged (14 total steps)

**Task 2:**
- [x] Command file exists and references workflow
- [x] Workflow file exists with all 4 required steps
- [x] Workflow calls `node bin/notion-sync.js comments`
- [x] Workflow mentions dated output file pattern

## Self-Check: PASSED

**Created files verified:**
```bash
[ -f "commands/gsd/notion-comments.md" ] && echo "FOUND: commands/gsd/notion-comments.md"
# FOUND: commands/gsd/notion-comments.md

[ -f "get-shit-done/workflows/notion-comments.md" ] && echo "FOUND: get-shit-done/workflows/notion-comments.md"
# FOUND: get-shit-done/workflows/notion-comments.md
```

**Modified files verified:**
```bash
grep -q "prompt_notion_sync" get-shit-done/workflows/complete-milestone.md && echo "FOUND: prompt_notion_sync step"
# FOUND: prompt_notion_sync step
```

**Commits verified:**
```bash
git log --oneline --all | grep -q "453693a" && echo "FOUND: 453693a"
# FOUND: 453693a

git log --oneline --all | grep -q "c638238" && echo "FOUND: c638238"
# FOUND: c638238
```

All files created, commits exist, and content verified.

## Integration Notes

### Milestone Completion Flow (Updated)
1. User completes all phase plans
2. Runs `/gsd:complete-milestone`
3. Workflow archives, reviews PROJECT.md, tags release
4. **NEW:** Checks for Notion config, prompts to sync planning docs
5. If user confirms: automatically pushes to Notion
6. Final commit includes milestone artifacts

### Comment Retrieval Flow (New)
1. User shares Notion pages with stakeholders
2. Stakeholders add comments on Notion pages
3. User runs `/gsd:notion-comments`
4. Claude fetches all unresolved comments
5. Groups into themes, maps to roadmap phases
6. Interactive triage discussion (accept/defer/dismiss)
7. Saves dated triage results to `.planning/`

**This closes the bidirectional feedback loop:**
- Planning docs → Notion (sync)
- Stakeholder comments ← Notion (comments)
- Triage results → Roadmap updates

## Testing Recommendations

### Manual Testing
1. **Notion sync prompt:**
   - Complete a test milestone
   - Verify prompt appears after git tag
   - Test both "yes" and "skip" responses
   - Verify sync runs automatically on "yes"

2. **Comment triage workflow:**
   - Add test comments to synced Notion pages
   - Run `/gsd:notion-comments`
   - Verify comments grouped into themes
   - Test all triage options (accept/defer/dismiss/discuss)
   - Verify dated file created and committed

### Edge Cases
- No Notion config → prompt skipped silently
- No comments found → workflow exits with clear message
- Multiple triage runs same day → counter appended to filename
- Sync errors during milestone → reported but don't block completion

## Dependencies Satisfied

**Depends on:**
- 10-01 (comment-retriever module) — Provides `bin/notion-sync.js comments` subcommand
- Phase 8 sync-orchestrator — Provides `bin/notion-sync.js sync` subcommand

**Provides to:**
- v1.1 Milestone completion — Full bidirectional Notion integration
- Future feedback iterations — Historical triage records in `.planning/`

## What's Next

This completes Phase 10 (Workflow Integration - Comment Retrieval) and the **v1.1 Notion Integration milestone**.

**Milestone deliverables complete:**
1. ✓ Notion SDK integration and auth (Phase 6)
2. ✓ Markdown-to-Notion conversion (Phase 7)
3. ✓ Sync orchestrator with hierarchy (Phase 8)
4. ✓ Image/asset handling (Phase 9)
5. ✓ Workflow integration + comment retrieval (Phase 10)

**Ready for:**
- `/gsd:complete-milestone` to archive v1.1
- User testing of full Notion integration flow
- Planning v1.2 or next feature set
