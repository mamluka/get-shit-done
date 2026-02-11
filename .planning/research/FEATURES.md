# Feature Research

**Domain:** Notion Integration for PM Planning Tool (GSD)
**Researched:** 2026-02-11
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Push markdown files to Notion as pages | Core value proposition — stakeholders expect to view planning docs in Notion | MEDIUM | Requires markdown-to-blocks conversion; character limits (2000 chars/rich text element) require chunking; GFM tables/headings/lists/code blocks all need proper block mapping |
| Preserve folder hierarchy as parent/child pages | Planning docs already organized in `.planning/` structure; users expect same organization in Notion | MEDIUM | Notion API supports parent page IDs for child pages; requires recursive directory traversal and page creation order (parents before children) |
| Update existing pages (not just create) | After initial sync, users expect incremental updates without duplicates | MEDIUM | Requires tracking page IDs in `notion-sync.json` per project; compare local vs remote content to detect changes; API supports `pages.update()` but cannot change parent |
| Handle basic markdown formatting | Tables, headings, lists, bold/italic, code blocks are used throughout planning docs | MEDIUM-HIGH | Notion uses blocks + rich text, not raw markdown; libraries like Martian exist but GSD requires zero dependencies (except @notionhq/client); custom parser needed |
| Show sync status/progress | Users need feedback during multi-file upload (20+ .md files in typical project) | LOW | Console progress indicators; existing GSD patterns use color-coded output (green/yellow/dim) |
| Graceful error handling | API failures (rate limits, auth errors, network issues) shouldn't break workflow | LOW-MEDIUM | Follow GSD pattern: warning-only, best-effort; log errors but don't block; retry logic for transient failures |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Pull comments as structured feedback | Stakeholders comment in Notion; PMs triage feedback by phase/theme back in CLI | HIGH | Notion Comments API lists open comments by page; requires mapping page IDs → local files → phases; group by discussion_id; convert to markdown format; Cannot retrieve resolved comments or start new threads via API |
| Image handling (local + external) | Planning docs may include architecture diagrams, screenshots, mockups | HIGH | Notion File Upload API (new in 2025) supports <20MB files; files expire in 1 hour if not attached; must upload first, then attach to block; external URLs work indefinitely; local images require upload + URL replacement |
| Smart change detection | Only sync modified files to reduce API calls and preserve Notion edit history | MEDIUM | Compare file mtimes or git commit hashes vs last sync timestamp in notion-sync.json; skip unchanged files; Notion doesn't expose last_edited_time for integrations reliably |
| Preserve internal links between docs | Planning docs link to each other (e.g., PLAN.md → REQUIREMENTS.md); preserve as Notion page links | MEDIUM-HIGH | Requires tracking all page IDs; parse markdown links; convert relative paths to Notion page mentions or links; NotionRepoSync addresses this problem |
| Post-milestone auto-prompt | After `/gsd:complete-milestone`, suggest pushing to Notion | LOW | Fits existing GSD auto-advance pattern; simple console prompt with Y/N; calls `/gsd:sync-notion` if accepted |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Bidirectional sync (Notion → markdown) | "Let stakeholders edit in Notion and pull changes back" | Divergence nightmare: Notion blocks ≠ markdown; conflict resolution unclear; users edit both places → data loss; requires real-time webhook monitoring | One-way push only; use comments feature to pull feedback, not content edits |
| Real-time auto-sync on file save | "Always keep Notion up-to-date" | Rate limiting (3 req/sec Notion API); excessive API calls for draft edits; users lose control of what's published; sync becomes invisible/magical | Manual `/gsd:sync-notion` command; optional post-milestone prompt |
| Syncing all project files (code, tests, etc.) | "Upload everything to Notion" | Notion is a documentation tool, not a code repository; code blocks have 2000 char limits (chunking is ugly); file hierarchy becomes unmanageable | Sync only `.planning/` directory; code stays in git |
| Full markdown spec support | "Support every markdown extension" | Notion doesn't support footnotes, nested tables, LaTeX, custom HTML; conversion requires lossy transformations; maintenance burden for edge cases | Support GFM subset that maps cleanly to Notion blocks: headings (1-3), lists, tables, code blocks, bold/italic/strikethrough, links, images |
| Template-based page creation | "Use Notion templates for each page type" | GSD already has markdown templates; two template systems create confusion; Notion templates require database setup (overkill for simple pages); templates complicate sync logic | Direct block conversion from markdown; formatting consistency via existing .md templates |

## Feature Dependencies

```
[Basic markdown-to-Notion conversion]
    └──requires──> [Block parser (headings, lists, tables, code)]
                       └──requires──> [Rich text formatter (bold, italic, links)]

[Update existing pages]
    └──requires──> [Page ID tracking (notion-sync.json)]
                       └──requires──> [Initial page creation]

[Pull comments]
    └──requires──> [Page ID tracking]
    └──requires──> [Phase-to-file mapping]

[Image handling]
    ├──enhances──> [Basic markdown conversion]
    └──requires──> [File upload API integration]

[Internal link preservation]
    ├──requires──> [Page ID tracking for all docs]
    └──enhances──> [Basic markdown conversion]

[Smart change detection]
    ├──requires──> [Last sync timestamp in notion-sync.json]
    └──enhances──> [Update existing pages]

[Post-milestone prompt]
    └──requires──> [Basic sync command]
```

### Dependency Notes

- **Block parser requires Rich text formatter:** Notion blocks contain rich text arrays; must convert inline markdown (bold, italic, links) within paragraph/heading/list blocks
- **All features require Page ID tracking:** Without mapping local files → Notion page IDs, cannot update, pull comments, or link between pages
- **Image handling enhances conversion:** Images are optional; basic conversion should work without them
- **Internal links require complete page tracking:** Can't convert `[link](REQUIREMENTS.md)` to Notion page link without knowing REQUIREMENTS.md's page ID

## MVP Definition

### Launch With (v1.1)

Minimum viable product — what's needed to validate Notion integration.

- [x] **Notion API key collection during setup** — Required for any integration; save to config.json alongside existing Jira/Brave keys
- [x] **Basic page creation from markdown** — Core value: get planning docs into Notion
  - Support: headings (H1-H3), paragraphs, lists (ordered, unordered, checkboxes), tables, code blocks, basic formatting (bold, italic, strikethrough, inline code, links)
  - Skip: images (defer), internal links (defer), custom blocks
- [x] **Parent/child hierarchy matching .planning/ structure** — Stakeholders expect organized navigation
  - Root pages for: PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md
  - Parent/child for phases: `phases/01-foundation/` → Notion parent page "Phase 01: Foundation" → child pages for PLAN.md, SUMMARY.md
- [x] **Page ID tracking via notion-sync.json** — Essential for updates; store as `.planning/{project}/notion-sync.json`
- [x] **Update existing pages** — Prevent duplicates on re-sync; use stored page IDs to update instead of create
- [x] **CLI command `/gsd:sync-notion`** — Manual trigger for pushing docs; follows existing command patterns
- [x] **External image links** — Support `![alt](https://...)` for already-hosted images; skip local images for v1.1

### Add After Validation (v1.2)

Features to add once core sync is working.

- [ ] **Pull comments from Notion** — `/gsd:notion-comments` command; retrieve open comments via API; group by discussion_id; save to `.planning/feedback/YYYY-MM-DD-comments.md` with page links and themes
- [ ] **Post-milestone auto-prompt** — After `/gsd:complete-milestone`, ask "Upload planning docs to Notion? (Y/n)"; reduce friction for regular syncing
- [ ] **Smart change detection** — Track last sync timestamp per file in notion-sync.json; compare vs file mtime or git commit; skip unchanged files
- [ ] **Local image upload** — Use Notion File Upload API for `![alt](./diagrams/arch.png)`; upload to Notion, replace with hosted URL, attach to page within 1 hour expiry window

### Future Consideration (v2.0+)

Features to defer until Notion integration is proven.

- [ ] **Internal link preservation** — Convert `[link](REQUIREMENTS.md)` to Notion page mentions; requires full page ID map and markdown link parsing
- [ ] **Selective sync (filter by path)** — Only sync specific phases or files; useful for large projects
- [ ] **Notion workspace/database selection** — Let user choose target location instead of default workspace
- [ ] **Sync delete detection** — Remove Notion pages when local files deleted; dangerous without confirmation
- [ ] **Emoji/icon support** — Set page icons based on frontmatter or content type
- [ ] **Callout block support** — Convert GFM alerts `> [!NOTE]` to Notion callouts

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Basic markdown conversion | HIGH | HIGH | P1 |
| Page hierarchy (parent/child) | HIGH | MEDIUM | P1 |
| Page ID tracking | HIGH | LOW | P1 |
| Update existing pages | HIGH | MEDIUM | P1 |
| External image links | MEDIUM | LOW | P1 |
| CLI sync command | HIGH | LOW | P1 |
| Pull comments | HIGH | HIGH | P2 |
| Post-milestone prompt | MEDIUM | LOW | P2 |
| Smart change detection | MEDIUM | MEDIUM | P2 |
| Local image upload | MEDIUM | HIGH | P2 |
| Internal link preservation | LOW | HIGH | P3 |
| Selective sync filtering | LOW | MEDIUM | P3 |
| Workspace selection | LOW | LOW | P3 |
| Sync delete detection | LOW | MEDIUM | P3 |
| Emoji/icon support | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for v1.1 launch — core sync functionality
- P2: Should have for v1.2 — enhances workflow but not blocking
- P3: Nice to have for v2.0+ — future improvements after validation

## Competitor Feature Analysis

| Feature | NotionRepoSync | notion-sync (startnext) | Martian | Our Approach (GSD) |
|---------|---------------|-------------------------|---------|-------------------|
| Markdown conversion | Custom parser | Custom parser | Unified AST → Notion blocks | Custom parser (zero deps except @notionhq/client) |
| Update strategy | Recreate pages | Detect changes, update existing | Not handled (library only) | Track page IDs in notion-sync.json, use pages.update() |
| Image handling | Not mentioned | Upload to Dropbox, replace with external URLs | Extract inline images → separate blocks | v1.1: external only; v1.2: Notion File Upload API |
| Internal links | YES — main differentiator | Dynamic page links | Not handled | Defer to v2.0 (requires full page ID map) |
| Comments | No | No | No | v1.2: Pull comments via API, save as feedback .md |
| Hierarchy | Repo structure → page tree | Nested dirs → subpages | Not handled | .planning/ structure → parent/child pages |
| PM-specific | No (dev-focused docs) | No (generic docs) | No (library for any use) | YES — integrates with milestone workflow, post-milestone prompt |

## Notion API Capabilities vs GSD Needs

### What Notion API Supports Well

| API Feature | GSD Use Case |
|-------------|-------------|
| Create page with parent_id | Match .planning/ folder hierarchy |
| Update page properties/content | Incremental sync without duplicates |
| Append blocks to page | Add content to existing pages |
| File upload (<20MB) | Local images in planning docs |
| External file URLs (never expire) | Architecture diagrams from Figma/Miro |
| Retrieve comments (open only) | Pull stakeholder feedback |
| Rich text formatting | Bold, italic, strikethrough, links in markdown |
| Blocks: heading, paragraph, bulleted_list, numbered_list, to_do, code, table | All common markdown elements |

### What Notion API Doesn't Support

| Limitation | GSD Impact | Mitigation |
|------------|-----------|------------|
| Cannot change page parent after creation | Cannot move pages between phases | Create correct hierarchy initially; document in error messages |
| Cannot retrieve resolved comments | Miss completed feedback threads | Document limitation; only show open comments |
| Cannot start new discussion threads | Can't programmatically add inline comments | Only retrieve existing comments; stakeholders add via UI |
| Rich text max 2000 chars/element | Long paragraphs in planning docs | Chunk into multiple rich text elements (Martian pattern) |
| Headers limited to H1-H3 | Markdown supports H1-H6 | Downgrade H4+ to H3 (acceptable loss for planning docs) |
| File URLs expire after 1 hour if not attached | Must upload and attach immediately | Upload → create block → attach in single operation |
| No markdown input (blocks/rich text only) | Must parse and convert | Build custom parser (unavoidable) |
| Rate limit: 3 req/sec | Syncing 50 pages = 17+ seconds minimum | Show progress indicator; batch operations where possible |

## Implementation Complexity Breakdown

### Low Complexity (1-2 days)
- Notion API key setup in config.json
- External image link support (passthrough URLs)
- CLI command scaffolding (`/gsd:sync-notion`)
- Post-milestone prompt
- Page ID tracking (simple JSON file)

### Medium Complexity (3-5 days)
- Basic markdown parser (headings, paragraphs, lists)
- Parent/child hierarchy creation (recursive page creation)
- Update existing pages (load page IDs, call update API)
- Smart change detection (mtime or git hash comparison)
- Progress indicators and error handling

### High Complexity (5-10 days)
- Full markdown-to-blocks conversion (tables, code blocks, rich text chunking)
- Pull comments feature (API retrieval, grouping, markdown generation)
- Local image upload (File Upload API, expiry handling, URL replacement)
- Internal link preservation (link parsing, page ID mapping, mention creation)

## Dependencies on Existing GSD Features

| Notion Feature | GSD Feature Required | Reason |
|---------------|---------------------|--------|
| All features | PathResolver | Multi-project support; must resolve `.planning/{project}/notion-sync.json` paths |
| Sync command | Config system | Store Notion API key in config.json |
| Post-milestone prompt | Auto-advance pattern | Reuse existing workflow interruption mechanism |
| Page hierarchy | Multi-project folder structure | .planning/ organization defines Notion hierarchy |
| Comments triage | Phase numbering logic | Map comments back to phase/plan files |
| Smart change detection | Git integration | Use git commit hashes to detect changes |
| All features | gsd-tools.js patterns | Follow existing conventions for config, state, JSON operations |

## Sources

**Notion API Official Documentation:**
- [Create a page](https://developers.notion.com/reference/post-page) — Parent relationships, properties, content blocks
- [Update page properties](https://developers.notion.com/reference/patch-page) — What can/cannot be updated
- [Working with comments](https://developers.notion.com/guides/data-apis/working-with-comments) — Retrieve open comments, limitations
- [Uploading small files](https://developers.notion.com/docs/uploading-small-files) — File Upload API (2025)
- [File object](https://developers.notion.com/reference/file-object) — External vs uploaded files

**Notion Integration Libraries:**
- [Martian](https://github.com/tryfabric/martian) — Markdown to Notion blocks conversion patterns
- [notion-sync (startnext)](https://github.com/startnext/notion-sync) — Update strategy, hierarchy preservation
- [NotionRepoSync](https://github.com/sourcegraph/notionreposync) — Internal link handling

**Markdown-to-Notion Patterns:**
- [Markdown to Notion Blocks](https://brittonhayes.dev/notes/markdown-to-notion-blocks/) — Character limits, chunking challenges
- [Building a Notion to Markdown tool is annoying actually](https://altf4.blog/blog/2024-02-25-building-a-notion-to-markdown-tool-is-annoying-actually) — API structure challenges
- [Using Markdown in Notion Without Losing Formatting](https://www.goinsight.ai/blog/markdown-to-notion/) — Conversion limitations

**Community Tools:**
- [Mk Notes](https://mk-notes.io/) — User expectations for sync tools
- [mdsync](https://github.com/alasdairpan/mdsync) — One-way sync patterns

**Notion API Guides:**
- [Working with page content](https://developers.notion.com/docs/working-with-page-content) — Page ID tracking
- [Notion API Guide (Whalesync)](https://www.whalesync.com/blog/notion-api-guide-) — Page ID structure, webhook patterns
- [Notion File Upload (Notion Mastery)](https://notionmastery.com/uploading-files-via-notions-api/) — Upload API constraints

---
*Feature research for: Notion Integration (GSD for PMs)*
*Researched: 2026-02-11*
