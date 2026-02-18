---
phase: 08-page-hierarchy-incremental-sync
plan: 01
subsystem: notion-sync
tags: [infrastructure, incremental-sync, file-hashing, hierarchy-mapping]
dependency_graph:
  requires: [phase-07-converter, phase-06-client, phase-06-sync-state]
  provides: [hierarchy-builder, change-detector, page-manager]
  affects: [phase-08-plan-02-sync-orchestrator]
tech_stack:
  added: []
  patterns: [streaming-hash, tree-traversal, parent-validation, block-batching]
key_files:
  created:
    - lib/notion/hierarchy.js
    - lib/notion/change-detector.js
    - lib/notion/page-manager.js
  modified: []
decisions: []
metrics:
  duration: "2m 30s"
  completed_date: "2026-02-11"
---

# Phase 08 Plan 01: Foundation Modules for Page Hierarchy & Incremental Sync Summary

**One-liner:** Built three foundation modules for Notion sync - hierarchy builder (maps .planning/ folder structure to parent/child page tree), change detector (streaming SHA-256 hash comparison for incremental sync), and page manager (create/update/validate Notion pages with block batching and parent validation).

## What Was Built

### hierarchy.js
- `buildHierarchy(planningDir)` function that scans .planning/ directory and produces parent/child tree structure
- PROJECT.md becomes root node
- Priority files (ROADMAP.md, REQUIREMENTS.md, STATE.md) become direct children in specified order
- Phase folders become intermediate "virtual" grouping nodes with formatted titles (e.g., "Phase 08 - Page Hierarchy Incremental Sync")
- All .md files in phase folders become leaf nodes, sorted alphabetically
- Skips hidden directories (`.`, `_` prefixes) and non-.md files
- Returns tree structure with absolute paths and formatted titles

### change-detector.js
- `hashFile(filePath)` - Computes SHA-256 hash using streaming for memory efficiency
- `needsSync(filePath, syncState, projectSlug)` - Compares current file hash against stored hash to determine sync necessity
- Four possible outcomes:
  - `unmapped` - No page_id mapping exists (new file)
  - `no_hash` - Mapping exists but no hash stored (first sync after upgrade)
  - `changed` - Hash differs from stored (file was modified)
  - `unchanged` - Hash matches (skip sync)
- Backward compatible with old sync-state format (string page_id) and new format (object with page_id, hash, syncedAt)

### page-manager.js
- `validatePageExists(notion, pageId)` - Checks if Notion page exists and is accessible
  - Returns `{ exists: true, page }` on success
  - Returns `{ exists: false, error: 'not_found' }` for deleted pages (404)
  - Returns `{ exists: false, error: 'unauthorized' }` for permission issues (403)
  - Throws on network/unexpected errors
- `createPage(notion, { parentPageId, title, blocks })` - Creates new Notion page with parent relationship
  - Validates parent exists before creating child (prevents invalid parent errors)
  - Handles >100 block batching (first 100 in create call, remaining via append)
  - Handles empty blocks array (creates page with title only)
- `updatePage(notion, { pageId, title, blocks })` - Replaces all content of existing page
  - Three-step process: update title → delete all child blocks → append new blocks
  - Pagination for block deletion (handles pages with >100 existing blocks)
  - Batching for block appending (respects 100-block API limit)
  - Throws descriptive error if page not found (404)

## Verification Results

All verification tests passed:

1. **Module loading:** All three modules load without errors
2. **Hierarchy builder:** Produces correct tree for current .planning/ directory
   - Root: PROJECT.md
   - Children: 12 (3 priority files + 8 phase folders + 1 other .md file)
3. **Change detector:** Produces consistent 64-character SHA-256 hashes
4. **Exports:** All functions exported correctly and are of type `function`

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies

**Requires:**
- Phase 06: `@notionhq/client` SDK (for `isNotionClientError`, `APIErrorCode` in page-manager.js)
- Phase 06: `sync-state.js` schema (doc_pages structure for change-detector.js)
- Phase 07: converter module (for eventual integration with sync orchestrator)

**Provides:**
- Hierarchy mapping for Plan 02 sync orchestrator
- Change detection for incremental sync logic
- Page CRUD operations for sync orchestrator

## Technical Notes

### Design Decisions

1. **Synchronous fs operations in hierarchy.js:** Matches existing codebase patterns (sync-state.js, converter.js)
2. **Streaming hash computation:** Memory-efficient for large files, follows Node.js best practices
3. **Parent validation before child creation:** Prevents Notion API "invalid parent.page_id" errors
4. **Delete-all-append-new update pattern:** Simpler than block-level diffing, sufficient for Phase 8 MVP
5. **Type-safe error handling:** Uses `isNotionClientError` and `APIErrorCode` from SDK (consistent with client.js)

### Block Batching Strategy

Both `createPage` and `updatePage` respect Notion's 100-block-per-request limit:
- **createPage:** First 100 blocks in `children` parameter of create call, remaining blocks appended sequentially
- **updatePage:** New blocks appended in 100-block batches after deletion

### Backward Compatibility

`needsSync` handles both old and new sync-state formats:
- Old: `doc_pages[path] = "page_id_string"`
- New: `doc_pages[path] = { page_id: string, hash: string, syncedAt: string }`

This ensures Phase 8 works with existing notion-sync.json files from Phase 7.

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| lib/notion/hierarchy.js | 145 | Directory tree to page hierarchy mapping |
| lib/notion/change-detector.js | 94 | SHA-256 hashing and sync decision logic |
| lib/notion/page-manager.js | 168 | Notion page CRUD operations |

## Next Steps

Plan 02 (Sync Orchestrator) will compose these three modules:
1. Use `buildHierarchy()` to determine page creation order (parents before children)
2. Use `needsSync()` to skip unchanged files (incremental sync)
3. Use `createPage()` / `updatePage()` to sync files to Notion
4. Update sync-state with new hash format after each successful sync

## Self-Check: PASSED

**Created files:**
```
FOUND: lib/notion/hierarchy.js
FOUND: lib/notion/change-detector.js
FOUND: lib/notion/page-manager.js
```

**Commits:**
```
FOUND: 99fb766
FOUND: 2c77437
```

All files created and commits exist as documented.
