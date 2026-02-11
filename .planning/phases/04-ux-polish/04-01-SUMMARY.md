---
phase: 04-ux-polish
plan: 01
subsystem: ux-error-messages
tags: [ux, terminology, error-messages, pm-friendly]
dependency_graph:
  requires: []
  provides: [pm-friendly-errors, terminology-dictionary, progressive-disclosure]
  affects: [all-commands, user-experience]
tech_stack:
  added: []
  patterns: [CLEAR-framework, progressive-disclosure]
key_files:
  created:
    - get-shit-done/references/terminology.md
  modified:
    - get-shit-done/bin/gsd-tools.js
decisions:
  - "Use 'Problem:' prefix instead of 'Error:' for less alarming error messages"
  - "Technical details hidden by default, shown only when GSD_VERBOSE=true"
  - "All JSON error outputs include 'action' field for consuming workflows"
  - "Keep function names, variables, and code comments unchanged (only user-facing strings)"
metrics:
  duration: 9
  completed: 2026-02-11
---

# Phase 04 Plan 01: PM-Friendly Error Messages Summary

**One-liner:** Rewrote 80+ error messages from developer jargon to PM-friendly business language with actionable guidance and progressive disclosure

## What Was Built

### Core Deliverables

1. **Terminology Dictionary** (`get-shit-done/references/terminology.md`)
   - Developer-to-business term mapping reference
   - CLEAR framework documentation (Context, Location, Explanation, Action, Resources)
   - Progressive disclosure guidance
   - Examples of good vs bad error messages

2. **Enhanced error() Function**
   - Changed prefix from "Error:" to "Problem:"
   - Added optional `technicalDetails` parameter for progressive disclosure
   - Technical details only shown when `GSD_VERBOSE=true` environment variable is set
   - Backward compatible with existing single-argument calls

3. **Rewritten Error Messages (80+ changes)**
   - All user-facing strings in gsd-tools.js converted to business language
   - Every error includes what to do next (actionable guidance)
   - No blame language (invalid, failed, illegal) in user-facing output
   - JSON error outputs enhanced with `action` fields

### Key Term Translations

| Before (Developer) | After (Business) | Context |
|--------------------|------------------|---------|
| frontmatter | project header | YAML block at top of .md files |
| git branch | project workspace | Branch isolation |
| invalid | (describe what's needed instead) | Blame language removal |
| failed | couldn't complete | Blame language removal |
| STATE.md not found | Project state not found. Run /gsd:new-project... | Actionable guidance |
| path required | Please specify which folder to check | Friendly request |

## Task Breakdown

| Task | Commit | Duration | Files Changed |
|------|--------|----------|---------------|
| 1. Create terminology dictionary and enhance error() function | 1027c2b | ~2 min | terminology.md (new), gsd-tools.js |
| 2. Rewrite all user-facing error messages | e61aa61 | ~7 min | gsd-tools.js |

**Total Duration:** 9 minutes

## Implementation Details

### Task 1: Foundation
- Created comprehensive terminology dictionary with 20+ term mappings
- Enhanced error() function to support progressive disclosure
- Changed "Error:" prefix to "Problem:" for less alarming tone
- Added GSD_VERBOSE environment variable check for technical details

### Task 2: Systematic Message Rewrite
Rewrote error messages in these sections:
- PathResolver (3 messages)
- Utility commands (7 messages)
- History/phases (4 messages)
- State management (8+ messages, including JSON error outputs)
- Commit/verify (5 messages)
- Frontmatter CRUD (6 messages)
- Verification suite (4 messages)
- Phase operations (8 messages)
- Phase/milestone complete (3 messages)
- Todo/scaffold (4 messages)
- Init commands (3 messages)
- Command router subcommands (11 messages)
- Misc (plan file path, phase not found, etc.)

**Critical Rule Followed:** Only changed user-facing string literals passed to `error()`, `throw new Error()`, and `output({ error: ... })`. Did NOT rename variables, function names, JSON keys, or code comments.

## Deviations from Plan

None - plan executed exactly as written. All 80+ error messages successfully rewritten with no functional changes to code logic.

## Verification Results

1. ✅ `frontmatter` count reduced to 22 (only in function names, variables, comments - not user-facing)
2. ✅ "project header" appears in validation messages
3. ✅ No blame language ("invalid", "failed") in user-facing error() calls
4. ✅ "Problem:" prefix confirmed in error function
5. ✅ `node gsd-tools.js` runs without syntax errors
6. ✅ Test error message shows PM-friendly format

## Impact

**Before:**
```
Error: frontmatter YAML invalid - missing required field: phase
```

**After:**
```
Problem: The project header is missing the 'phase' field
```

**With GSD_VERBOSE=true:**
```
Problem: Couldn't save project settings. Check folder permissions and try again.

Technical details:
EACCES: permission denied, open '.planning/config.json'
```

### Benefits
- PMs never see developer jargon (frontmatter, YAML, git branch, invalid, failed)
- Every error tells them what to do next
- Technical users can enable verbose mode when needed
- Consuming workflows can use `action` fields from JSON errors
- More approachable, less intimidating error experience

## Next Steps

Recommended follow-ups:
1. Update command help text and documentation to use new terminology
2. Consider applying same pattern to workflow files (non-code documentation)
3. Add user testing to validate PM comprehension of new error messages
4. Create style guide for future error message additions

## Files Modified

- **get-shit-done/references/terminology.md** (created): 88 lines - terminology dictionary
- **get-shit-done/bin/gsd-tools.js**: 83 changes (80+ error message rewrites, error function enhancement)

## Self-Check: PASSED

✅ Created files exist:
- get-shit-done/references/terminology.md

✅ Commits exist:
- 1027c2b: terminology dictionary and error() enhancement
- e61aa61: all user-facing error messages rewritten

✅ Verification tests passed:
- Tool runs without syntax errors
- Error messages show PM-friendly format
- No blame language in user-facing strings
- Progressive disclosure works
