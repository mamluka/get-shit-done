# Requirements: GSD for PMs

**Defined:** 2026-02-11
**Core Value:** PMs can go from idea to fully planned, phase-by-phase project specification using a conversational AI workflow — producing artifacts that are version-controlled, historically preserved, and ready for handoff to engineering.

## v1.1 Requirements

Requirements for Notion integration milestone. Each maps to roadmap phases.

### Setup & Configuration

- [ ] **SETUP-01**: User can provide Notion API key during npx setup flow
- [ ] **SETUP-02**: Notion API key is saved to config.json in a `notion` section
- [ ] **SETUP-03**: CLI tool reads Notion API key from config.json to authenticate API calls

### Markdown Conversion

- [ ] **CONV-01**: Markdown headings (H1-H3) convert to Notion heading blocks; H4+ normalizes to H3
- [ ] **CONV-02**: Markdown paragraphs with inline formatting (bold, italic, strikethrough, inline code, links) convert to Notion rich text blocks
- [ ] **CONV-03**: Markdown lists (ordered, unordered, checkboxes) convert to Notion list blocks
- [ ] **CONV-04**: Markdown tables convert to Notion table blocks
- [ ] **CONV-05**: Markdown code blocks convert to Notion code blocks with language hints
- [ ] **CONV-06**: Documents exceeding 2000 chars per block are automatically chunked

### Page Management

- [ ] **PAGE-01**: User can create Notion pages from .planning/ markdown files
- [ ] **PAGE-02**: Pages are created in parent/child hierarchy matching .planning/ folder structure
- [ ] **PAGE-03**: User can update existing Notion pages without creating duplicates
- [ ] **PAGE-04**: Parent page is validated before child page creation (immutable after)

### Sync & State Tracking

- [ ] **SYNC-01**: notion-sync.json in each project folder tracks file-to-page-ID mapping
- [ ] **SYNC-02**: User can run `/gsd:sync-notion` to push .planning/ markdown files to Notion
- [ ] **SYNC-03**: Sync creates new pages for unmapped files and updates existing pages for mapped ones
- [ ] **SYNC-04**: CLI displays sync progress with status indicators during multi-file operations

### Image Handling

- [ ] **IMG-01**: External image URLs (https://) in markdown render as image blocks in Notion
- [ ] **IMG-02**: Local image files referenced in markdown are uploaded via Notion File Upload API
- [ ] **IMG-03**: Uploaded image block IDs are tracked in notion-sync.json

### Comment Retrieval & Triage

- [ ] **CMNT-01**: User can run `/gsd:notion-comments` to pull all open comments from synced Notion pages
- [ ] **CMNT-02**: Comments are grouped by theme (Claude identifies themes across all comments)
- [ ] **CMNT-03**: Themes are mapped to affected roadmap phases
- [ ] **CMNT-04**: Claude walks user through a triage discussion for each theme
- [ ] **CMNT-05**: Triage results are saved as a dated .md file in the project folder

### Workflow Integration

- [ ] **WKFL-01**: After `/gsd:complete-milestone`, user is prompted to upload planning docs to Notion
- [ ] **WKFL-02**: If user accepts the prompt, `/gsd:sync-notion` is triggered automatically
- [ ] **WKFL-03**: notion-sync.js CLI tool handles all Notion operations via @notionhq/client SDK

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Sync

- **ESYNC-01**: Smart change detection — only sync modified files based on hash comparison
- **ESYNC-02**: Internal link preservation — convert relative markdown links to Notion page links
- **ESYNC-03**: Selective sync filtering by path (only sync specific phases or files)
- **ESYNC-04**: Sync delete detection — remove Notion pages when local files are deleted

### Enhanced UX

- **EUX-01**: Workspace/database selection — let user choose target Notion location
- **EUX-02**: Emoji/icon support — set page icons based on content type
- **EUX-03**: Callout block support — convert GFM alerts to Notion callouts

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bidirectional sync (Notion → markdown) | Divergence nightmare — Notion blocks ≠ markdown; conflict resolution unclear; users edit both places → data loss |
| Real-time auto-sync on file save | Rate limiting (3 req/sec); excessive API calls for draft edits; users lose control of what's published |
| Syncing non-.planning/ files | Notion is a documentation tool, not a code repository; code blocks have 2000-char limits |
| Full markdown spec support | Notion doesn't support footnotes, nested tables, LaTeX, custom HTML |
| Template-based Notion page creation | GSD already has markdown templates; two template systems create confusion |
| MCP-based Notion integration | User explicitly chose .js CLI tool approach; MCP not available in all environments |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | — | Pending |
| SETUP-02 | — | Pending |
| SETUP-03 | — | Pending |
| CONV-01 | — | Pending |
| CONV-02 | — | Pending |
| CONV-03 | — | Pending |
| CONV-04 | — | Pending |
| CONV-05 | — | Pending |
| CONV-06 | — | Pending |
| PAGE-01 | — | Pending |
| PAGE-02 | — | Pending |
| PAGE-03 | — | Pending |
| PAGE-04 | — | Pending |
| SYNC-01 | — | Pending |
| SYNC-02 | — | Pending |
| SYNC-03 | — | Pending |
| SYNC-04 | — | Pending |
| IMG-01 | — | Pending |
| IMG-02 | — | Pending |
| IMG-03 | — | Pending |
| CMNT-01 | — | Pending |
| CMNT-02 | — | Pending |
| CMNT-03 | — | Pending |
| CMNT-04 | — | Pending |
| CMNT-05 | — | Pending |
| WKFL-01 | — | Pending |
| WKFL-02 | — | Pending |
| WKFL-03 | — | Pending |

**Coverage:**
- v1.1 requirements: 28 total
- Mapped to phases: 0
- Unmapped: 28 ⚠️

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after initial definition*
