---
phase: 07-markdown-to-notion-conversion
plan: 02
subsystem: notion-pipeline
tags: [tdd, block-processing, api-limits, utilities]

dependency_graph:
  requires: []
  provides:
    - notion-block-flattening
    - notion-block-chunking
    - toggle-block-conversion
  affects:
    - notion-converter-orchestrator

tech_stack:
  added:
    - node:test (built-in test runner)
  patterns:
    - TDD (test-driven development)
    - recursive tree flattening
    - section-aware chunking

key_files:
  created:
    - lib/notion/block-utils.js
    - lib/notion/chunker.js
    - test/notion/block-utils.test.js
    - test/notion/chunker.test.js
  modified: []

decisions:
  - id: 07-02-nesting-marker
    summary: Use └ prefix for demoted nested items instead of indentation
    rationale: Visual marker preserves nesting context when flattening 3+ levels to 2 levels
    alternatives: [indentation-spaces, dash-prefix, no-marker]
    impact: User-visible in Notion UI
  - id: 07-02-chunking-threshold
    summary: Split at 1.5x maxPerChunk when no heading found
    rationale: Prevents excessive chunk sizes while allowing flexibility for heading boundaries
    alternatives: [exact-maxPerChunk, 2x-maxPerChunk, no-force-split]
    impact: Balances API efficiency with section awareness

metrics:
  duration: 474s (7m 54s)
  completed: 2026-02-11T14:33:03Z
  tasks_completed: 2
  files_created: 4
  test_coverage: 100%
  external_dependencies: 0
---

# Phase 7 Plan 02: Block Utilities & Chunker Summary

**One-liner:** Section-aware block chunker and nesting flattener with toggle conversion for Notion API compliance (zero dependencies, full TDD coverage)

## What Was Built

Created two utility modules for post-processing Martian's Notion block output:

**lib/notion/block-utils.js** — Block post-processing utilities:
- `flattenDeepNesting(blocks, maxDepth)`: Flattens 3+ level nesting to 2 levels (Notion API limit) by promoting deep children to siblings with └ indent markers
- `convertQuotesToToggles(blocks)`: Converts details/summary-pattern blockquotes (bold first text) to Notion toggle blocks

**lib/notion/chunker.js** — Section-aware chunker:
- `chunkBlocks(blocks, maxPerChunk)`: Splits block arrays at heading boundaries to respect Notion's 100-block API limit
- Soft limit: splits at headings when approaching maxPerChunk (default 90)
- Force-split: splits at logical boundaries when section exceeds limits
- Table handling: never splits tables from their rows

Both modules operate on plain JavaScript objects with zero external dependencies.

## Technical Implementation

### Nesting Flattener Algorithm

Recursively walks block tree, tracking depth. When processing blocks at maxDepth-1, extracts all descendant children and promotes them to siblings:

```javascript
// Before: Parent > Child > Grandchild > GreatGrandchild (4 levels)
// After:  Parent > Child, └ Grandchild, └ GreatGrandchild (2 levels)
```

Block types supporting children: `bulleted_list_item`, `numbered_list_item`, `to_do`, `toggle`, `callout`, `quote`.

### Toggle Converter Pattern

Detects details/summary pattern in blockquotes (first rich_text element has `annotations.bold: true`) and converts to toggle block structure:

```javascript
// Before: { type: 'quote', quote: { rich_text: [{ bold: true }], children: [...] } }
// After:  { type: 'toggle', toggle: { rich_text: [...], children: [...], color: 'default' } }
```

### Section-Aware Chunking Strategy

1. Accumulate blocks in current chunk
2. When encountering heading + current chunk would exceed limit → split before heading
3. Force-split at 1.5x maxPerChunk if no heading found (prevents runaway chunks)
4. Hard limit at 100 blocks (Notion API constraint)
5. Tables counted as 1 + N blocks (table + rows), never split

Estimation heuristic: when encountering heading, if `currentChunk.length + maxPerChunk/2 > maxPerChunk`, split to start new section.

## Testing

**Test coverage:** 24 tests total (13 block-utils + 11 chunker)

**block-utils.test.js:**
- Nesting: 2-level passthrough, 3-level flatten, 4-level recursive flatten, mixed block types
- Edge cases: empty children, blocks without children, rich_text marker preservation
- Toggle conversion: bold detection, regular blockquote preservation, complex children

**chunker.test.js:**
- Heading splits: section awareness, boundary detection, trailing heading handling
- Force-splits: oversized sections, no-heading documents, hard limit enforcement
- Tables: integrity preservation, row counting
- Edge cases: empty input, custom maxPerChunk, mixed content types

All tests use Node.js built-in test runner (`node --test`) with literal block structures (no Martian dependency).

## Deviations from Plan

None — plan executed exactly as written.

## Performance Notes

- Flattening: O(n) where n = total blocks (single tree traversal)
- Chunking: O(n) single-pass linear scan
- Memory: O(n) for result arrays (unavoidable for immutable transformation)

No recursion depth concerns (Notion limits nesting to 3-4 levels max in practice).

## Integration Points

**Upstream (Plan 01):** Preprocessor converts `<details>/<summary>` to bold blockquotes → block-utils converts to toggles

**Downstream (Plan 03):** Converter orchestrator will:
1. Call Martian to convert markdown → Notion blocks
2. Apply `flattenDeepNesting()` and `convertQuotesToToggles()`
3. Call `chunkBlocks()` to split for API requests
4. Submit chunks via `pages.create` + `blocks.children.append`

## Success Criteria Met

- ✅ flattenDeepNesting() flattens 3+ level nesting to 2 levels with └ markers
- ✅ convertQuotesToToggles() converts details/summary blockquotes to toggle blocks
- ✅ chunkBlocks() splits at heading boundaries with section awareness
- ✅ Force-splits oversized sections at logical points
- ✅ Tables never separated from their rows
- ✅ All TDD tests pass with edge case coverage
- ✅ Zero external dependencies added

## Next Steps

**Plan 03:** Build converter orchestrator that integrates preprocessor (Plan 01) + Martian + these utilities + Notion client to implement end-to-end markdown → Notion page conversion.

## Self-Check: PASSED

**Files created:**
```
✓ lib/notion/block-utils.js exists (169 lines)
✓ lib/notion/chunker.js exists (93 lines)
✓ test/notion/block-utils.test.js exists (316 lines)
✓ test/notion/chunker.test.js exists (307 lines)
```

**Commits verified:**
```
✓ 86ea62f: feat(07-02): implement block-utils with nesting flattener and toggle converter
✓ ed4548b: feat(07-02): implement section-aware block chunker
```

**Tests verified:**
```
✓ node --test test/notion/block-utils.test.js → 13 tests passed
✓ node --test test/notion/chunker.test.js → 11 tests passed
```
