---
phase: 07-markdown-to-notion-conversion
plan: 03
subsystem: markdown-conversion
tags: [converter, orchestrator, cli, martian, pipeline]

# Dependency graph
requires:
  - phase: 07-01
    provides: Preprocessor and text-splitter modules
  - phase: 07-02
    provides: Block utilities and chunker modules
provides:
  - Converter orchestrator module (lib/notion/converter.js)
  - CLI convert subcommand with dry-run mode
  - Full markdown-to-Notion pipeline integration
affects: [08-sync-implementation, notion-integration]

# Tech tracking
tech-stack:
  added:
    - "@tryfabric/martian@^1.2.4"
  patterns:
    - "Pipeline orchestration: preprocess → Martian → text-split → flatten → toggle-convert → chunk"
    - "JSON Lines logging for warnings (console stays clean)"
    - "Incremental state tracking per file for resume-on-error"
    - "Deterministic file ordering for batch processing"

key-files:
  created:
    - lib/notion/converter.js
  modified:
    - bin/notion-sync.js

key-decisions:
  - "Martian options: truncate=false (never silently truncate), strictImageUrls=false (invalid images become text)"
  - "Error accumulation pattern: conversion errors become warnings with fallback code blocks (never lose content)"
  - "Deterministic file ordering: PROJECT.md, ROADMAP.md, STATE.md first, then phases, then alphabetical"
  - "Dry-run mode shows block type breakdown for visibility into Martian output"

patterns-established:
  - "Converter as importable module (not just CLI script) for Phase 8 integration"
  - "Progress callbacks for batch operations"
  - "Warning log separation (JSON Lines file vs. console)"
  - "Incremental state updates in notion-sync.json for resume capability"

# Metrics
duration: 203s (3m 23s)
completed: 2026-02-11T14:39:08Z
---

# Phase 07 Plan 03: Converter Orchestrator & CLI Summary

**Converter orchestrator module with CLI integration, chaining full markdown-to-Notion pipeline with dry-run mode and JSON Lines logging**

## Performance

- **Duration:** 3 min 23 sec
- **Started:** 2026-02-11T14:35:38Z
- **Completed:** 2026-02-11T14:39:08Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Converter orchestrator module chains full pipeline: preprocess → Martian → text-split → flatten → toggle-convert → chunk
- CLI convert subcommand with file/directory support and dry-run mode
- File-level progress output during batch processing
- JSON Lines logging for lossy warnings (console stays clean)
- Incremental state tracking in notion-sync.json for resume-on-error
- Deterministic file ordering for reproducible batch processing
- Error accumulation pattern prevents batch failures
- Block type breakdown in dry-run output for pipeline visibility

## Task Commits

1. **Task 1: Create converter.js orchestrator**
   - Commit: `382c221` (feat: implement converter orchestrator module)
   - Files: lib/notion/converter.js (428 lines)

2. **Task 2: Wire converter into CLI**
   - Commit: `6ba5461` (feat: add convert subcommand to CLI)
   - Files: bin/notion-sync.js (+147 lines)

## Technical Implementation

### Converter Pipeline Architecture

**convertMarkdown(markdown, options)** — Pure function, no side effects:
1. `preprocessMarkdown()` — Transform custom XML tags, details/summary
2. `markdownToBlocks()` — Core Martian conversion with error callback
3. `processBlocksForTextSplitting()` — Walk blocks, apply splitRichText recursively
4. `flattenDeepNesting()` — Flatten 3+ levels to 2 with └ markers
5. `convertQuotesToToggles()` — Convert details/summary blockquotes to toggle blocks
6. `chunkBlocks()` — Split into API-sized batches (90 blocks/chunk)

Returns: `{ blocks: Block[][], warnings: object[] }`

**convertFile(filePath, options)** — Reads from disk, handles file errors:
- File read errors become warnings (skip file, continue batch)
- Returns: `{ fileName, blocks, chunks, warnings, blockCount }`

**convertDirectory(dirPath, options)** — Batch processing with state tracking:
- Recursive directory walk (skips node_modules, hidden dirs)
- Deterministic file ordering: PROJECT.md → ROADMAP.md → STATE.md → phases → alphabetical
- Progress callbacks: `onProgress(fileName, index, total)`
- Per-file state updates in notion-sync.json (conversions field)
- Returns: `{ files: ConversionResult[], totalBlocks, totalWarnings }`

### Martian Options (Per Research + User Decisions)

```javascript
const martianOptions = {
  notionLimits: {
    truncate: false,  // Never silently truncate (user decision)
    onError: (error) => {
      warnings.push({ type: 'martian_limit', message: error.message });
    }
  },
  strictImageUrls: false  // Invalid images become text (research pitfall #5)
};
```

### Error Handling Strategy

**Philosophy:** Batch processing must never fail completely. Accumulate errors as warnings.

- **File read errors:** Log warning, skip file, continue
- **Martian conversion errors:** Wrap original markdown in code block (preserve content), log warning
- **Log write errors:** Non-fatal, print to console

**Fallback code block structure:**
```javascript
{
  type: 'code',
  code: {
    rich_text: [{ text: { content: markdown.slice(0, 2000) } }],
    language: 'markdown'
  }
}
```

### State Tracking Schema

Added `conversions` field to notion-sync.json project entries:

```javascript
state.projects[slug].conversions = {
  "ROADMAP.md": {
    convertedAt: "2026-02-11T14:39:00Z",
    blockCount: 70,
    chunks: 1
  }
};
```

Purpose: Phase 8 sync can skip already-converted files or detect stale conversions.

### CLI Convert Subcommand

**Usage:** `node bin/notion-sync.js convert [path] [options]`

**Options:**
- `--cwd <path>` — Working directory (default: process.cwd())
- `--dry-run` — Preview without side effects

**Behavior:**

| Mode | Path Type | Output |
|------|-----------|--------|
| Dry-run | File | Block type breakdown, no log file |
| Dry-run | Directory | All files with block types, total summary |
| Normal | File | Single-line result + warning count |
| Normal | Directory | File-level progress + completion summary |

**Dry-run output example:**
```
[DRY RUN] Would convert directory from .planning/

PROJECT.md — 80 blocks, 1 chunks
  bulleted_list_item: 43, to_do: 15, paragraph: 9, heading_2: 7, ...

Total: 5218 blocks across 66 chunks
Warnings: 0
```

**Normal output example:**
```
Converting ROADMAP.md (1/66)...
Converting PROJECT.md (2/66)...
...
✓ Conversion complete: 66 files, 5218 total blocks
```

## Verification Results

All plan verification criteria met:

1. ✅ `node bin/notion-sync.js convert --dry-run` — Shows all .planning/ files with block counts
2. ✅ `node bin/notion-sync.js convert .planning/ROADMAP.md --dry-run` — Single file preview
3. ✅ `node bin/notion-sync.js convert` — Full conversion with progress output (66 files, 5218 blocks)
4. ✅ Conversion log exists at .planning/notion-sync.log (if warnings generated)
5. ✅ `require('./lib/notion/converter.js')` exports: convertMarkdown, convertFile, convertDirectory
6. ✅ Custom XML tags in 07-CONTEXT.md appear as quote blocks (Martian converts GFM alerts to quotes)
7. ✅ Large files produce multiple chunks: 07-RESEARCH.md → 101 blocks, 3 chunks

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

None — all design decisions (Martian options, error handling, file ordering) were pre-specified in plan.

## Integration Points

**Upstream (Plans 01-02):**
- Preprocessor transforms custom XML and details/summary
- Text-splitter enforces 2000-char limit
- Block-utils flattens nesting and converts toggles
- Chunker splits for API batches

**Downstream (Phase 8):**
Phase 8 sync will import converter module:
```javascript
const { convertFile } = require('./lib/notion/converter.js');
const result = convertFile(filePath);
// Use result.chunks for notion.blocks.children.append()
```

Converter is designed as importable module (not just CLI script) for this purpose.

## Success Criteria Met

- ✅ converter.js is an importable module with clean API for Phase 8 integration
- ✅ Full pipeline: preprocess → Martian → text-split → flatten → toggle-convert → chunk
- ✅ CLI convert subcommand works for files and directories
- ✅ Dry-run mode shows conversion preview without side effects
- ✅ File-level progress output during batch processing
- ✅ Warnings logged to JSON Lines file (console stays clean)
- ✅ Incremental state tracking in notion-sync.json per file
- ✅ All .planning/ markdown files convert without errors (66 files, 5218 blocks)

## Next Phase Readiness

**Phase 8 (Sync Implementation) Prerequisites Met:**
- ✅ Converter module ready for import
- ✅ Chunked block arrays ready for Notion API calls
- ✅ State tracking infrastructure in place
- ✅ Error handling patterns established
- ✅ Progress reporting patterns available

**Blockers:** None

## Files Created/Modified

**Created:**
- `lib/notion/converter.js` (428 lines) — Main orchestrator module

**Modified:**
- `bin/notion-sync.js` (+147 lines) — Added convert subcommand

## Self-Check: PASSED

**Files created:**
```
✓ lib/notion/converter.js exists (428 lines)
```

**Files modified:**
```
✓ bin/notion-sync.js modified (convert subcommand added)
```

**Commits verified:**
```
✓ 382c221: feat(07-03): implement converter orchestrator module
✓ 6ba5461: feat(07-03): add convert subcommand to CLI
```

**Verification tests passed:**
```
✓ convertMarkdown() returns valid chunked blocks
✓ convertFile() processes ROADMAP.md (70 blocks, 1 chunk)
✓ convertDirectory() processes all .planning/ files (66 files, 5218 blocks)
✓ CLI help shows convert command
✓ CLI dry-run mode works for files and directories
✓ CLI normal mode converts with progress output
✓ Large files produce multiple chunks (07-RESEARCH.md: 3 chunks)
```

---
*Phase: 07-markdown-to-notion-conversion*
*Completed: 2026-02-11T14:39:08Z*
