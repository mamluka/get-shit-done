# Project Research Summary

**Project:** Notion API Integration for GSD
**Domain:** CLI Tool Integration with Notion Workspace API
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

The Notion integration adds a parallel artifact distribution layer to GSD's existing git-backed planning system. The recommended approach uses @notionhq/client SDK (zero dependencies, official support) paired with @tryfabric/martian for markdown-to-Notion block conversion. This integration transforms GSD from a CLI-only planning tool into a stakeholder collaboration platform where planning artifacts remain git-backed (source of truth) while Notion becomes a read-only review interface with comment-based feedback flow.

The critical architectural decision is keeping notion-sync.js as a separate parallel tool rather than embedding Notion logic into gsd-tools.js, preserving the zero-dependency architecture of core GSD functionality. The MVP requires only two new dependencies (@notionhq/client, @tryfabric/martian) adding ~7 total deps to the project. The core workflow is one-way push (.planning/ → Notion) with bidirectional comment retrieval (Notion comments → .planning/triage/).

Key risks center on API constraints: 3 req/sec rate limiting, 2000-char block limits requiring chunking, 1-hour file upload expiration windows, and immutable parent hierarchies after page creation. Mitigation requires building rate limiting, chunking logic, and parent validation into the foundation before implementing batch operations. The most severe pitfall is token exposure via git commits, requiring strict environment variable-only storage from day one.

## Key Findings

### Recommended Stack

The stack research revealed a minimal-dependency approach that aligns with GSD's existing zero-dependency philosophy. Only two packages are required: @notionhq/client for API operations and @tryfabric/martian for markdown conversion.

**Core technologies:**
- **@notionhq/client ^5.9.0**: Official Notion API SDK — Zero dependencies, built-in file upload API, maintains parity with Notion's API version 2025-09-03, active maintenance (v5.9.0 released 10 days ago)
- **@tryfabric/martian ^1.2.4**: Markdown to Notion blocks conversion — Purpose-built AST-based converter supporting all inline elements, headers, lists to any depth, GFM alerts, auto-handles Notion's 100-block-per-request limit
- **Node.js built-in capabilities**: File handling (fs.readFile), markdown image parsing (native RegExp), testing (--test flag) — No additional libraries needed, Node 16.7+ sufficient (current env: 16.20.2)

**Alternatives considered and rejected:**
- Custom markdown parser: Saves ~5 transitive deps but loses GFM support, list nesting, equations, and auto-chunking — not worth complexity
- External image hosting service: Already have File Upload API which is simpler (1. create upload, 2. send file, 3. attach to block)
- markdown-it/marked: General-purpose HTML parsers don't output Notion block objects

### Expected Features

Feature research identified clear MVP boundaries separating table-stakes functionality from differentiators and anti-features.

**Must have (table stakes):**
- Push markdown files to Notion as pages with proper formatting (headings, lists, tables, code blocks, bold/italic/strikethrough, links)
- Preserve folder hierarchy as parent/child pages matching .planning/ structure
- Update existing pages without creating duplicates (requires page ID tracking via notion-sync.json)
- Handle basic markdown formatting (GFM subset that maps cleanly to Notion blocks)
- Show sync status/progress with color-coded console output
- Graceful error handling following GSD's best-effort pattern

**Should have (competitive advantage):**
- Pull comments as structured feedback (Notion → .planning/triage/ for PM review)
- Image handling for both local and external URLs
- Smart change detection (only sync modified files based on hash comparison)
- Preserve internal links between docs ([PLAN.md](PLAN.md) → Notion page links)
- Post-milestone auto-prompt suggesting Notion upload after `/gsd:complete-milestone`

**Defer (v2+):**
- Bidirectional sync (Notion → markdown): Creates divergence nightmare, conflict resolution unclear, users edit both places leading to data loss
- Real-time auto-sync on file save: Hits rate limiting, excessive API calls, users lose control of what's published
- Syncing all project files beyond .planning/: Notion is documentation tool not code repository, code blocks have 2000-char limits
- Full markdown spec support: Notion doesn't support footnotes, nested tables, LaTeX, custom HTML
- Template-based page creation: GSD already has markdown templates, two systems create confusion

### Architecture Approach

Architecture research revealed a parallel tool pattern that preserves GSD's core zero-dependency design while adding Notion capabilities as an optional layer.

**Major components:**
1. **notion-sync.js (NEW)** — Standalone CLI tool for Notion operations, lives alongside gsd-tools.js, handles all SDK interactions, returns structured JSON output
2. **MarkdownParser** — Uses @tryfabric/martian for AST-based conversion, post-processes to convert local image paths to external GitHub URLs
3. **PageHierarchyManager** — Creates/updates Notion pages with parent relationships, validates parent IDs before creation (immutable after), determines hierarchy from .planning/ folder structure
4. **StateTracker** — Manages notion-sync.json in version folder, tracks page IDs per file, implements hash-based change detection for incremental sync
5. **CommentRetriever** — Fetches comments via Notion API, groups by discussion_id, formats as markdown for triage workflow
6. **sync-notion.md workflow** — Orchestrates upload: load config → parse markdown → create/update pages → track state → commit
7. **notion-comments.md workflow** — Orchestrates retrieval: fetch comments → format markdown → save to triage/

**Key architectural patterns:**
- **Parallel Tool Architecture**: notion-sync.js separate from gsd-tools.js to isolate SDK dependencies
- **External URL Strategy**: Convert local images to GitHub raw URLs instead of uploading files (avoids 1-hour expiration, size limits)
- **Page ID Mapping**: Track Notion page IDs in per-project notion-sync.json for incremental updates
- **One-way Push + Comment Pull**: Planning docs flow .planning/ → Notion, feedback flows Notion comments → .planning/triage/

**Integration points:**
- Modified: gsd-tools.js (add `notion get-config`), config.json (add `notion` section), installer (add API key prompt), complete-milestone workflow (add upload prompt)
- Reused: PathResolver, Config system, State management, Git operations (all existing GSD infrastructure)

### Critical Pitfalls

Pitfall research identified 10 critical issues with specific prevention strategies and phase assignments.

1. **Rate Limit Exhaustion Without Retry-After Handling** — Integration hits 3 req/sec limit during batch operations, receives HTTP 429 errors, retries immediately compounding problem. **Avoid:** Configure SDK with maxRetries: 5, respect Retry-After header, throttle to ~2 rps for bulk ops. **Address in Phase 1** (SDK setup).

2. **Markdown Block Conversion Character Limit Violations** — Large sections >2000 chars fail silently or truncate. Rich text arrays hit 100-element limit. **Avoid:** Implement chunking logic upfront, use martian's auto-chunking, validate converted content length before API calls, test with >10KB markdown files. **Address in Phase 2** (conversion).

3. **Image Upload Expiration and Re-upload Loops** — Uploaded images expire after 1 hour if not attached. URLs fetched from Notion expire when re-fetched. **Avoid:** Attach within 1 hour, track image-to-block mappings, re-fetch file objects to refresh URLs, implement idempotent upload based on hash. **Address in Phase 3** (image upload).

4. **Block Update vs Append Semantics Confusion** — PATCH block endpoints don't work for content updates. Page update only modifies properties/metadata not content. Images can't be updated, must delete/recreate. **Avoid:** Track block IDs in metadata, use append endpoint for new content, delete old blocks before appending updated ones. **Address in Phase 4** (incremental sync).

5. **Parent Page Hierarchy Immutability After Creation** — Pages created with wrong parent cannot be moved programmatically. No API to change parent after creation. **Avoid:** Verify parent page ID before creation, validate integration has access, resolve hierarchy before any API calls, fail fast with clear error. **Address in Phase 2** (hierarchy creation).

6. **Request Payload Size Limits in Bulk Operations** — Creating pages with large content fails despite individual blocks being under limits. Payload exceeds 1000 blocks or 500KB total. **Avoid:** Track total block count before API call, split documents >900 blocks into create + append operations, estimate payload size (~500 bytes per block). **Address in Phase 2** (conversion).

7. **Comment API Read-Only Thread Limitations** — Cannot create new comment threads via API, only reply to existing threads started in Notion UI. **Avoid:** Document as "read and reply only", implement retrieval for existing discussions, use discussion_id to group comments by thread. **Address in Phase 5** (comment retrieval).

8. **Block Nesting Depth Limit Exceeded** — Notion allows max 2 levels of nesting in single request. Markdown with 4+ nesting levels exceeds this. **Avoid:** Validate nesting depth during parsing, flatten to 2 levels max, or create parent blocks first then append grandchildren in subsequent requests. **Address in Phase 2** (conversion).

9. **Heading Level Mismatch Due to Three-Level Limit** — Notion only supports H1-H3. Markdown H4-H6 all convert to H3, flattening hierarchy. **Avoid:** Document limitation, normalize H1→H1, H2→H2, H3+→H3, provide warning during conversion. **Address in Phase 2** (conversion).

10. **Integration Token Exposure in Git Commits** — Developer commits .env or hardcoded token to git, leaking credentials with full integration access. **Avoid:** Store token exclusively in environment variable NOTION_API_KEY, never write to tracked files, add .env* to .gitignore, use git pre-commit hook to detect token patterns. **Address in Phase 1** (SDK setup).

## Implications for Roadmap

Based on research, the roadmap should follow a foundation-first approach with 5 phases building incrementally from SDK setup through comment retrieval. The critical path prioritizes rate limiting and token security in Phase 1, followed by robust markdown conversion with chunking in Phase 2.

### Phase 1: Foundation & SDK Setup
**Rationale:** Must establish secure token handling, rate limiting, and config infrastructure before any API operations. Token exposure and rate limit exhaustion are the highest-risk pitfalls with immediate project-breaking impact.

**Delivers:**
- Notion config in installer (API key prompt during npx install)
- Extended config.json schema with `notion: { api_key, workspace_id, database_id }`
- gsd-tools.js notion commands (get-config, set-config)
- notion-sync.json schema and StateTracker foundation
- Rate limiting configuration in SDK (maxRetries: 5, Retry-After handling)
- Token security enforcement (environment variable only, .gitignore updates)

**Addresses:**
- Token exposure pitfall (environment variable-only storage)
- Rate limit exhaustion (SDK retry configuration)

**Avoids:**
- Committing tokens to git (pre-commit hooks, strict env var pattern)
- API throttling during development (test with rate limit constraints from day 1)

### Phase 2: Markdown-to-Notion Conversion Pipeline
**Rationale:** Core value proposition depends on robust markdown conversion. Must handle all API limits (2000-char blocks, 1000-block payloads, 2-level nesting, H1-H3 headings) upfront, as retrofitting chunking logic later requires complete rewrite.

**Delivers:**
- MarkdownParser integration with @tryfabric/martian
- Character limit chunking (2000-char rich text elements)
- Payload size validation (1000-block, 500KB limits)
- Nesting depth handling (flatten or multi-request for >2 levels)
- Heading normalization (H4+ → H3 with warning)
- Basic page creation (no hierarchy yet)
- Conversion testing with large files (>10KB, >900 blocks)

**Addresses:**
- Character limit violations (chunking from start)
- Payload size limits (validation and splitting)
- Nesting depth limits (flattening logic)
- Heading level mismatches (normalization)

**Uses:**
- @tryfabric/martian for AST-based conversion
- Node.js RegExp for image extraction

**Implements:**
- MarkdownParser component with post-processing

### Phase 3: Page Hierarchy & Incremental Sync
**Rationale:** Hierarchy must be validated before page creation (immutable parent relationships). Incremental sync prevents duplicate pages and preserves Notion URLs across re-syncs.

**Delivers:**
- PageHierarchyManager with parent relationship logic
- Parent validation before page creation
- Hierarchy resolution from .planning/ folder structure
- Page ID tracking in notion-sync.json
- Hash-based change detection (skip unchanged files)
- Update existing pages (delete blocks + append pattern)
- Block ID tracking for surgical updates

**Addresses:**
- Parent hierarchy immutability (validation before creation)
- Block update vs append confusion (delete + append pattern)

**Avoids:**
- Creating pages with wrong parents (no way to move after creation)
- Duplicate pages on re-sync (page ID tracking required)

**Implements:**
- PageHierarchyManager component
- StateTracker for page ID persistence

### Phase 4: Image Handling
**Rationale:** Images enhance planning docs but add complexity (expiration, upload APIs). External URL strategy avoids most pitfalls while supporting both local and external images.

**Delivers:**
- External image link support (passthrough HTTPS URLs)
- Local image path conversion (→ GitHub raw URLs)
- Image reference extraction from markdown (RegExp pattern)
- Image-to-block mapping in notion-sync.json
- Idempotent upload (hash-based skip for unchanged images)

**Addresses:**
- Image upload expiration (external URL strategy avoids it)
- Re-upload loops (hash tracking prevents redundant uploads)

**Uses:**
- GitHub raw URLs for local images (never expire)
- Node.js RegExp for image extraction

**Alternative considered:**
- Notion File Upload API deferred to v2.0 (1-hour expiration, size limits)

### Phase 5: Workflow Integration & Comment Retrieval
**Rationale:** Workflows orchestrate tools and provide UX. Comment retrieval completes bidirectional flow (push docs, pull feedback).

**Delivers:**
- sync-notion.md workflow (orchestrates upload pipeline)
- sync-notion.md command (entry point for `/gsd:sync-notion`)
- Complete-milestone prompt ("Upload to Notion?")
- CommentRetriever implementation
- Comment formatting as markdown with threading
- notion-comments.md workflow (orchestrate retrieval)
- notion-comments.md command (entry point for `/gsd:notion-comments`)
- Progress indicators and error recovery guidance

**Addresses:**
- Comment API read-only limitation (document as retrieval-only)
- UX pitfalls (silent failures, no progress indicators)

**Implements:**
- CommentRetriever component
- Workflow-level orchestration

### Phase Ordering Rationale

**Dependencies dictate order:**
- Phase 2 depends on Phase 1: Config and SDK must exist before conversion logic
- Phase 3 depends on Phase 2: Can't create hierarchy without basic page creation
- Phase 5 depends on Phase 3: Comments require page IDs from previous syncs
- Phase 4 can run parallel to Phase 3: Images are enhancement to conversion

**Risk mitigation drives sequence:**
- Token security (Phase 1) addressed immediately before any API calls
- Rate limiting (Phase 1) configured before bulk operations tested
- Chunking (Phase 2) implemented before testing large documents
- Parent validation (Phase 3) implemented before hierarchy creation
- Expiration handling (Phase 4) deferred via external URL strategy

**Incremental validation:**
- Each phase delivers testable functionality
- Phase 1: Can call Notion API with proper auth/throttling
- Phase 2: Can convert markdown to Notion blocks without errors
- Phase 3: Can create nested page hierarchies matching .planning/
- Phase 4: Can handle images in markdown documents
- Phase 5: Can retrieve comments and present them for triage

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Markdown Conversion):** Complex block mapping, edge cases in GFM → Notion conversion require testing with actual GSD planning docs. Martian library may not handle all cases (3+ years old, GSD-specific markdown patterns).
- **Phase 4 (Image Handling):** GitHub raw URL strategy for private repos unclear — may need auth tokens in URL. Alternative strategies (Notion File Upload API, external CDN) require phase-specific research.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Well-documented SDK setup, config patterns match existing GSD infrastructure, token security is standard practice.
- **Phase 3 (Hierarchy):** Notion parent-child API well-documented, folder-to-hierarchy mapping is straightforward pattern.
- **Phase 5 (Workflows):** GSD workflow patterns established, comment API simple (read-only, no complex operations).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official SDK docs, active maintenance, clear version requirements. @tryfabric/martian is 3+ years old but Notion block API stable. |
| Features | MEDIUM-HIGH | Feature expectations clear from competitor analysis, but MVP boundaries require validation with actual GSD users. Comment feature constraints well-documented. |
| Architecture | HIGH | Parallel tool pattern proven in similar CLI integrations. Data flow maps cleanly to existing GSD infrastructure. Notion API constraints documented thoroughly. |
| Pitfalls | HIGH | All pitfalls verified from official Notion docs, multiple community sources confirm issues. Prevention strategies tested in production tools. |

**Overall confidence:** HIGH

Research is comprehensive with strong official documentation and established patterns. The main uncertainty is martian library's handling of GSD-specific markdown patterns (requires validation in Phase 2).

### Gaps to Address

**During planning/execution:**

- **Martian library compatibility with GSD markdown:** FEATURES.md, REQUIREMENTS.md, PLAN.md files use specific formatting (tables for features, numbered lists for requirements, code blocks for examples). Validate martian handles these during Phase 2 implementation. If inadequate, pivot to custom parser (adds ~3 days to Phase 2).

- **GitHub raw URL strategy for private repos:** If GSD projects live in private repos, raw.githubusercontent.com URLs require authentication. May need to generate URLs with personal access tokens or pivot to Notion File Upload API. Research during Phase 4 planning.

- **Notion workspace/database selection UX:** Research assumes single workspace, single database. Multi-workspace setups may need selection UI. Defer to v2.0 unless MVP testing reveals blocking issue.

- **Incremental sync performance at scale:** Research based on <100 pages. If GSD projects grow to 500+ pages, may need to batch API calls differently. Monitor during Phase 3 testing with large projects.

- **Comment triage workflow integration:** Research defines technical retrieval but PM workflow for triaging comments needs validation. May need additional tooling (group by phase, filter by keyword, mark resolved). Validate during Phase 5 testing.

## Sources

### Primary (HIGH confidence)
- [Notion API - Request Limits](https://developers.notion.com/reference/request-limits) — Rate limiting (3 rps), payload limits (1000 blocks, 500KB), Retry-After header
- [Notion API - Working with Page Content](https://developers.notion.com/docs/working-with-page-content) — Block nesting (2 levels), rich text limits (2000 chars, 100 elements), update vs append semantics
- [Notion API - Create a Page](https://developers.notion.com/reference/post-page) — Parent relationships, property structure, content blocks
- [Notion API - Working with Files and Media](https://developers.notion.com/docs/working-with-files-and-media) — Upload workflows, size limits, expiration (1 hour if not attached)
- [Notion API - Working with Comments](https://developers.notion.com/docs/working-with-comments) — Read-only threading, discussion_id grouping, open comments only
- [@notionhq/client - npm](https://www.npmjs.com/package/@notionhq/client) — SDK version 5.9.0, zero dependencies, Node.js 16.7+ compatibility
- [@notionhq/client - GitHub](https://github.com/makenotion/notion-sdk-js) — Retry configuration, error handling, API version 2025-09-03
- [@tryfabric/martian - GitHub](https://github.com/tryfabric/martian) — Markdown AST to Notion blocks, auto-chunking for 100-block limit, GFM support

### Secondary (MEDIUM confidence)
- [Understanding Notion API Rate Limits in 2025](https://www.oreateai.com/blog/understanding-notion-api-rate-limits-in-2025-what-you-need-to-know/50d89b885182f65117ff8af2609b34c2) — 3 rps average, 2700 calls per 15 min window
- [Martian - Markdown to Notion Blocks](https://brittonhayes.dev/notes/markdown-to-notion-blocks/) — Character limits, chunking strategies, rich text array constraints
- [NotionRepoSync](https://github.com/sourcegraph/notionreposync) — Internal link handling patterns (deferred to v2.0)
- [notion-sync (startnext)](https://github.com/startnext/notion-sync) — Update strategy (detect changes, update existing), hierarchy preservation
- [How to Handle Notion API Request Limits](https://thomasjfrank.com/how-to-handle-notion-api-request-limits/) — Retry strategies, request queuing patterns

### Tertiary (LOW confidence - needs validation)
- [Uploading Files via Notion's API](https://notionmastery.com/uploading-files-via-notions-api/) — File Upload API workflow (deferred to v2.0, validated in official docs)
- [Pushing Notion to the Limits](https://notionmastery.com/pushing-notion-to-the-limits/) — Performance constraints, scale thresholds (>500 pages)

---
*Research completed: 2026-02-11*
*Ready for roadmap: yes*
