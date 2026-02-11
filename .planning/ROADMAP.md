# Roadmap: GSD for PMs

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped 2026-02-11)
- 🚧 **v1.1 Notion Integration** - Phases 6-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) - SHIPPED 2026-02-11</summary>

- [x] Phase 1: Foundation (3/3 plans) - completed 2026-02-10
- [x] Phase 2: Git Integration (2/2 plans) - completed 2026-02-10
- [x] Phase 3: Workflow Simplification (3/3 plans) - completed 2026-02-10
- [x] Phase 4: UX Polish (2/2 plans) - completed 2026-02-11
- [x] Phase 5: Jira Integration (2/2 plans) - completed 2026-02-11

</details>

### 🚧 v1.1 Notion Integration (In Progress)

**Milestone Goal:** Bridge planning artifacts in git with stakeholder collaboration in Notion — push specs, pull feedback.

#### Phase 6: Foundation & SDK Setup
**Goal**: Establish secure token handling, configuration infrastructure, and CLI tool foundation for all Notion operations
**Depends on**: Phase 5
**Requirements**: SETUP-01, SETUP-02, SETUP-03, WKFL-03
**Success Criteria** (what must be TRUE):
  1. User can provide Notion API key during npx setup flow and it saves to config.json
  2. CLI tool authenticates with Notion API using key from config without errors
  3. Rate limiting prevents API throttling during batch operations (respects 3 req/sec limit with retry logic)
  4. Token never appears in git commits (environment variable-only, .gitignore enforced)
  5. notion-sync.json schema is defined and can track page IDs per project
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

#### Phase 7: Markdown-to-Notion Conversion Pipeline
**Goal**: Transform markdown files into Notion blocks with robust handling of character limits, payload sizes, and nesting constraints
**Depends on**: Phase 6
**Requirements**: CONV-01, CONV-02, CONV-03, CONV-04, CONV-05, CONV-06, PAGE-01
**Success Criteria** (what must be TRUE):
  1. User can create basic Notion pages from .planning/ markdown files with correct formatting
  2. Markdown headings (H1-H3), paragraphs, lists, tables, and code blocks convert to corresponding Notion blocks
  3. Inline formatting (bold, italic, strikethrough, inline code, links) preserves correctly in rich text
  4. Documents exceeding 2000 chars per block chunk automatically without truncation
  5. Large documents (>900 blocks) split into create + append operations without payload errors
  6. Deeply nested markdown (3+ levels) flattens or splits across requests without API errors
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

#### Phase 8: Page Hierarchy & Incremental Sync
**Goal**: Create parent/child page relationships matching .planning/ structure and enable incremental updates without duplicates
**Depends on**: Phase 7
**Requirements**: PAGE-02, PAGE-03, PAGE-04, SYNC-01, SYNC-02, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):
  1. Pages created in Notion mirror .planning/ folder hierarchy (PROJECT.md parent, PLAN.md children)
  2. Parent page IDs are validated before child creation (prevents immutable parent errors)
  3. User can run `/gsd:sync-notion` to push all .planning/ markdown to Notion with status indicators
  4. Sync creates new pages for unmapped files and updates existing pages for previously synced files
  5. notion-sync.json tracks file-to-page-ID mappings and persists across sync runs
  6. Hash-based change detection skips unchanged files (improves performance, reduces API calls)
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

#### Phase 9: Image Handling
**Goal**: Support both external image URLs and local image files in markdown documents synced to Notion
**Depends on**: Phase 7 (can parallel Phase 8)
**Requirements**: IMG-01, IMG-02, IMG-03
**Success Criteria** (what must be TRUE):
  1. External image URLs (https://) in markdown render as image blocks in Notion pages
  2. Local image files referenced in markdown upload to Notion and display correctly
  3. Image block IDs are tracked in notion-sync.json to prevent duplicate uploads
  4. Image references update correctly when pages are re-synced
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

#### Phase 10: Workflow Integration & Comment Retrieval
**Goal**: Integrate Notion sync into milestone workflow and enable bidirectional feedback via comment retrieval
**Depends on**: Phase 8
**Requirements**: CMNT-01, CMNT-02, CMNT-03, CMNT-04, CMNT-05, WKFL-01, WKFL-02
**Success Criteria** (what must be TRUE):
  1. After completing milestone, user is prompted to upload planning docs to Notion
  2. Accepting the prompt triggers `/gsd:sync-notion` automatically without manual invocation
  3. User can run `/gsd:notion-comments` to pull all open comments from synced Notion pages
  4. Comments are grouped by theme (Claude identifies patterns across all comments)
  5. Themes map to affected roadmap phases (CMNT-03)
  6. Claude walks user through triage discussion for each theme interactively
  7. Triage results save as dated .md file in project folder for reference
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9 → 10
(Phase 9 can execute in parallel with Phase 8)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-02-10 |
| 2. Git Integration | v1.0 | 2/2 | Complete | 2026-02-10 |
| 3. Workflow Simplification | v1.0 | 3/3 | Complete | 2026-02-10 |
| 4. UX Polish | v1.0 | 2/2 | Complete | 2026-02-11 |
| 5. Jira Integration | v1.0 | 2/2 | Complete | 2026-02-11 |
| 6. Foundation & SDK Setup | v1.1 | 0/TBD | Not started | - |
| 7. Markdown-to-Notion Conversion Pipeline | v1.1 | 0/TBD | Not started | - |
| 8. Page Hierarchy & Incremental Sync | v1.1 | 0/TBD | Not started | - |
| 9. Image Handling | v1.1 | 0/TBD | Not started | - |
| 10. Workflow Integration & Comment Retrieval | v1.1 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-10*
*Last updated: 2026-02-11 (v1.1 milestone phases added)*
