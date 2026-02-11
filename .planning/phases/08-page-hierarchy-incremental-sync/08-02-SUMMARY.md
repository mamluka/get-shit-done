---
phase: 08-page-hierarchy-incremental-sync
plan: 02
subsystem: notion-sync
tags: [sync-orchestration, cli, incremental-sync, progress-ui]
dependency_graph:
  requires: [phase-08-plan-01-foundation-modules, phase-07-converter, phase-06-client]
  provides: [sync-orchestrator, sync-cli]
  affects: [phase-09-future-enhancements]
tech_stack:
  added: []
  patterns: [breadth-first-traversal, atomic-state-persistence, progress-callbacks, dry-run-simulation]
key_files:
  created:
    - lib/notion/sync-orchestrator.js
  modified:
    - lib/notion/sync-state.js
    - bin/notion-sync.js
decisions:
  - title: "Dry-run state simulation for hierarchy traversal"
    rationale: "Dry-run mode needs to simulate state updates (root_page_id, phase_pages) so that child items can correctly determine their parent page IDs during preview, enabling accurate 'would sync' reporting for entire hierarchy"
    alternatives: ["Skip parent validation in dry-run (would produce incomplete preview)", "Separate dry-run traversal logic (code duplication)"]
    outcome: "Simulated state updates in dry-run path - provides complete preview without API calls"
metrics:
  duration: "3m 50s"
  completed_date: "2026-02-11"
---

# Phase 08 Plan 02: Sync Orchestrator & CLI Integration Summary

**One-liner:** Built complete sync pipeline orchestrator that coordinates hierarchy building, change detection, page creation/updates, and atomic state persistence, with CLI integration providing real-time progress indicators and dry-run preview mode.

## What Was Built

### lib/notion/sync-orchestrator.js

Main sync coordination module with `syncProject()` function that orchestrates the full pipeline:

**Algorithm:**
1. Load sync state from notion-sync.json
2. Build hierarchy tree from .planning/ directory structure
3. Flatten tree to breadth-first ordered list (parents before children)
4. Process each item sequentially:
   - Determine parent page ID based on item's position in hierarchy
   - For markdown files: check if sync needed via hash comparison → convert to blocks → create or update page
   - For phase folders: create virtual grouping pages (no content)
   - Update sync state atomically after each file
   - Emit progress events for UI feedback
5. Return results summary (created/updated/skipped/errors)

**Key features:**
- Breadth-first processing ensures parent pages exist before children
- Atomic per-file state persistence (resume-on-error resilience)
- Stale page ID detection via `validatePageExists` - removes invalid mappings and recreates
- Phase folder virtual pages as intermediate grouping nodes
- Dry-run mode for preview without Notion API calls
- Progress callback pattern: `onProgress({ file, status, index, total, pageId?, error? })`
- Sequential processing (respects Notion rate limits, ensures parent-child order)

**Hierarchy flattening:**
- Root file (PROJECT.md) → parentKey: 'workspace'
- Root-level files (ROADMAP.md, etc.) → parentKey: 'root'
- Phase folder virtual pages → parentKey: 'root'
- Phase folder children → parentKey: 'phase:{folderName}'

**Error handling:**
- Individual file errors logged but don't abort batch
- `errorDetails` array captures all failures for post-sync reporting

### lib/notion/sync-state.js (extended)

Added two new functions for rich page mappings:

**`getPageMapping(state, projectSlug, filePath)`**
- Returns full mapping object: `{ page_id, hash, syncedAt }`
- Backward compatible with legacy string format (returns `{ page_id: value, hash: null, syncedAt: null }`)
- Used by change detector and sync orchestrator

**`setPageMapping(state, projectSlug, filePath, mapping)`**
- Stores full mapping object in doc_pages
- Creates intermediate objects (projects[slug], doc_pages) if needed
- Used by sync orchestrator after successful page operations

**Backward compatibility:**
- `getPageId()` updated to handle both string and object formats
- Existing notion-sync.json files with string mappings continue to work
- New syncs create rich object mappings with hash tracking

### bin/notion-sync.js (sync subcommand)

Added `sync` subcommand with full CLI integration:

**Usage:** `node bin/notion-sync.js sync [options]`

**Options:**
- `--cwd <path>` - Working directory (default: process.cwd())
- `--parent-page <id>` - Notion parent page ID (overrides workspace_page_id)
- `--project <slug>` - Project slug for sync-state tracking (default: 'default')
- `--dry-run` - Preview what would sync without Notion API calls

**Handler logic (`handleSync`):**
1. Load sync state to check for workspace_page_id
2. Determine parent page ID (CLI flag → notion-sync.json → error if neither)
3. Save workspace_page_id if provided via CLI (persists for future runs)
4. Create Notion client (skip if dry-run)
5. Call `syncProject` with progress callback
6. Print per-file progress with color-coded indicators:
   - Green `●` for creating
   - Yellow `◐` for updating
   - Dim `○` for skipped
   - Red `✗` for errors (with error message)
7. Print completion summary

**Example output:**
```
[DRY RUN] Syncing .planning/ to Notion...

● Creating  .planning/PROJECT.md (1/66)
● Creating  .planning/ROADMAP.md (2/66)
○ Skipped   .planning/STATE.md (3/66)
◐ Updating  .planning/phases/08-page-hierarchy-incremental-sync (4/66)

[DRY RUN] Would sync 66 files: 60 new, 4 changed, 2 unchanged
```

**Error handling:**
- No parent page ID: prints clear error with instructions, exits code 1
- Sync errors: prints error message, exits code 1
- Partial failures: prints warning summary, exits code 0

## Verification Results

All verification tests passed:

1. **Module loading:** `syncProject` exports as function type
2. **sync-state exports:** Includes `setPageMapping` and `getPageMapping`
3. **Mapping objects:** Set/get round-trip works correctly
4. **Backward compatibility:** Legacy string format returns normalized object with null hash/syncedAt
5. **CLI help:** Shows sync command with all options
6. **Error handling:** Proper error message when no parent page specified
7. **Dry-run:** Previews 66 files from .planning/ directory (all shown as "would create")
8. **Module integration:** All Phase 8 modules load together without errors
9. **Legacy compatibility:** `getPageId` and `getPageMapping` both handle old string format

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed dry-run state simulation for hierarchy traversal**
- **Found during:** Task 2 verification (dry-run testing)
- **Issue:** Dry-run mode showed PROJECT.md as "creating" but all children as "error" with "Could not determine parent page ID". Root cause: in dry-run, `root_page_id` was never set in sync state, so `getItemParentPageId` returned null for all items with `parentKey: 'root'`.
- **Fix:** Added state simulation in dry-run paths:
  - After simulating PROJECT.md creation, set `syncState.projects[projectSlug].root_page_id = 'dry-run-root-page-id'`
  - After simulating phase folder creation, set `syncState.projects[projectSlug].phase_pages[folderName] = 'dry-run-phase-page'`
- **Files modified:** lib/notion/sync-orchestrator.js (2 locations: file processing, phase folder sync)
- **Commit:** 58ddb84 (included in Task 2 commit)
- **Rationale:** Dry-run needs to simulate state changes to enable full hierarchy preview. Without this, dry-run only previews root file, which defeats the purpose of "preview before sync".

## Dependencies

**Requires:**
- Phase 08 Plan 01: hierarchy.js, change-detector.js, page-manager.js
- Phase 07: converter.js (convertFile for markdown-to-blocks)
- Phase 06: client.js (Notion SDK instance), sync-state.js (state management)

**Provides:**
- Complete sync pipeline from .planning/ markdown to Notion pages
- Incremental sync with hash-based change detection
- CLI interface for user-facing sync operations
- Dry-run mode for safe preview

## Technical Notes

### Design Decisions

1. **Dry-run state simulation:** Dry-run mode updates in-memory sync state (but doesn't persist) to allow full hierarchy traversal and accurate preview of what would sync. Without this, parent page IDs would be null for all non-root items.

2. **Sequential processing:** Files synced one at a time (not parallel) to respect Notion rate limits and ensure parent pages exist before children are created. Performance trade-off for correctness and reliability.

3. **Atomic per-file persistence:** `saveSyncState` called after each successful file sync. Ensures sync can resume from last successful point if interrupted (network failure, rate limit, etc.).

4. **Progress callback pattern:** Sync orchestrator emits events rather than printing directly. Keeps orchestrator pure and testable, allows CLI to control presentation.

5. **Phase folder virtual pages:** Phase directories become intermediate Notion pages (no content, just title). Provides logical grouping that matches .planning/ folder structure when browsing in Notion.

6. **Stale page ID handling:** Validates existing page IDs before updating. If page was deleted in Notion, removes stale mapping and creates fresh page. Prevents "page not found" errors.

### Breadth-First Ordering

Files processed in this order:
1. PROJECT.md (root)
2. ROADMAP.md, REQUIREMENTS.md, STATE.md (root-level priority files)
3. Phase folders (e.g., "Phase 08 - Page Hierarchy Incremental Sync")
4. Phase folder children (all .md files in each phase directory)

This ordering ensures:
- Root page exists before creating children
- Phase folder pages exist before creating their children
- No "invalid parent.page_id" API errors

### State Schema Evolution

**Old format (Phase 6-7):**
```json
{
  "doc_pages": {
    ".planning/PROJECT.md": "page-id-string"
  }
}
```

**New format (Phase 8+):**
```json
{
  "doc_pages": {
    ".planning/PROJECT.md": {
      "page_id": "page-id-string",
      "hash": "sha256-hash",
      "syncedAt": "2026-02-11T15:33:00Z"
    }
  }
}
```

Backward compatibility ensures existing notion-sync.json files work without migration.

## Files Created/Modified

| File | Lines | Change Type | Purpose |
|------|-------|-------------|---------|
| lib/notion/sync-orchestrator.js | 378 | Created | Main sync pipeline coordination |
| lib/notion/sync-state.js | +75 | Modified | Rich page mapping functions |
| bin/notion-sync.js | +101 | Modified | CLI sync subcommand with progress UI |

**Total additions:** ~554 lines

## Usage Examples

**First sync with parent page:**
```bash
node bin/notion-sync.js sync --parent-page abc123
# Saves abc123 to notion-sync.json for future runs
```

**Subsequent syncs (uses saved parent page):**
```bash
node bin/notion-sync.js sync
# Uses workspace_page_id from notion-sync.json
```

**Preview before syncing:**
```bash
node bin/notion-sync.js sync --dry-run
# Shows what would be created/updated/skipped
```

**Sync specific project:**
```bash
node bin/notion-sync.js sync --project my-project
# Tracks separate state under projects.my-project
```

## Next Steps

Phase 8 is now complete. Phase 9 will add:
- Image/asset handling (GitHub raw URLs or Notion file upload)
- Webhook-based live sync (detect .planning/ changes → auto-sync)
- Conflict resolution (detect Notion-side edits vs local changes)

## Self-Check: PASSED

**Created files:**
```
FOUND: lib/notion/sync-orchestrator.js
```

**Modified files:**
```
FOUND: lib/notion/sync-state.js
FOUND: bin/notion-sync.js
```

**Commits:**
```
FOUND: 7fb257d (Task 1: sync orchestrator and sync-state extensions)
FOUND: 58ddb84 (Task 2: CLI sync subcommand with progress indicators)
```

All files created/modified and commits exist as documented.
