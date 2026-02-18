# Phase 7: Markdown-to-Notion Conversion Pipeline - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform .planning/ markdown files into Notion block format. Handles GSD-specific patterns (XML tags, details/summary, checkboxes, tables), character limits, payload sizes, and nesting constraints. This phase builds the conversion engine only — page hierarchy, sync logic, and image handling are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Conversion fidelity
- All element types (tables, checklists, code blocks) are equally important — no sacrificing any category
- Custom XML-like tags (`<domain>`, `<decisions>`, `<specifics>`, `<deferred>`) convert to Notion callout blocks with labels
- `<details>`/`<summary>` tags map to Notion toggle/heading blocks (collapsible)
- Inline formatting (bold, italic, inline code, links, strikethrough) is best-effort — edge cases that drop formatting are acceptable
- Horizontal rules (`---`) map to Notion divider blocks
- Checkboxes (`- [x]`, `- [ ]`) map to Notion to_do blocks with checked state preserved

### Unsupported element handling
- Unsupported content (raw HTML, footnotes, math blocks) wraps in a code block as fallback — preserved as-is
- Rich text segments exceeding 2000 characters split at sentence boundaries

### Document chunking
- Section-aware batching: split at heading boundaries so each API request contains complete sections
- If a single section exceeds ~100 blocks, force-split within the section at logical points (row boundaries for tables, item boundaries for lists)
- Deep nesting (3+ levels) flattens to 2 levels — third-level items become second-level with indent markers (e.g., `└` prefix)
- Directory-aware batch processing: all .planning/ files processed together with awareness of relationships (e.g., ROADMAP references plans)

### Conversion feedback
- File-level progress output: "Converting ROADMAP.md (3/8)..."
- Dry-run mode (`--dry-run` flag) shows what would be converted without API calls
- Lossy element warnings written to a conversion log file (console stays clean)
- Incremental state tracking: notion-sync.json updated after each file so conversion can resume from where it stopped on error

### Claude's Discretion
- Choice of markdown parsing library (martian vs custom)
- Exact callout block styling for XML tag sections
- Log file format and location
- Batch size tuning within Notion API limits

</decisions>

<specifics>
## Specific Ideas

- notion-sync.json from Phase 6 must be updated per-file during conversion, not just at the end — this enables resume-on-error
- The converter should work as a module that Phase 8 (sync) can call, not just as a standalone script
- Code block fallback for unsupported elements means no content is ever silently dropped

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-markdown-to-notion-conversion*
*Context gathered: 2026-02-11*
