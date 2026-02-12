# Roadmap: GSD for PMs

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-02-11)
- ✅ **v1.1 Notion Integration** — Phases 6-10 (shipped 2026-02-11)
- 🚧 **v1.2 Streamlined Workflow** — Phases 11-14 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-02-11</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-02-10
- [x] Phase 2: Git Integration (2/2 plans) — completed 2026-02-10
- [x] Phase 3: Workflow Simplification (3/3 plans) — completed 2026-02-10
- [x] Phase 4: UX Polish (2/2 plans) — completed 2026-02-11
- [x] Phase 5: Jira Integration (2/2 plans) — completed 2026-02-11

</details>

<details>
<summary>✅ v1.1 Notion Integration (Phases 6-10) — SHIPPED 2026-02-11</summary>

- [x] Phase 6: Foundation & SDK Setup (2/2 plans) — completed 2026-02-11
- [x] Phase 7: Markdown-to-Notion Conversion Pipeline (3/3 plans) — completed 2026-02-11
- [x] Phase 8: Page Hierarchy & Incremental Sync (2/2 plans) — completed 2026-02-11
- [x] Phase 9: Image Handling (2/2 plans) — completed 2026-02-11
- [x] Phase 10: Workflow Integration & Comment Retrieval (2/2 plans) — completed 2026-02-11

</details>

### 🚧 v1.2 Streamlined Workflow (In Progress)

**Milestone Goal:** Streamline the new-project-to-Notion workflow — fewer questions at setup, integrated discussion before planning, and automatic Notion sync at the end.

### Phase 11: Quick Settings Shortcut

**Goal**: User can skip individual settings questions and apply recommended defaults in one action

**Depends on**: Nothing (standalone feature)

**Requirements**: SETUP-01, SETUP-02, SETUP-03

**Success Criteria** (what must be TRUE):
  1. User sees "Apply recommended settings?" option during new-project before individual settings questions
  2. Accepting recommended settings applies depth: standard, research: true, plan_check: true, verifier: true, model_profile: balanced, commit_docs: true, parallelization: true
  3. Recommended settings and interactive flow produce identical config.json output (no drift)
  4. User can still choose custom settings if recommended defaults don't fit

**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md — Add RECOMMENDED_SETTINGS constant and Recommended/Custom gate to new-project workflow — completed 2026-02-12

### Phase 12: Notion Parent Page Configuration

**Goal**: User provides Notion parent page URL during install, and page ID is automatically extracted and saved

**Depends on**: Nothing (standalone feature)

**Requirements**: NOTION-01, NOTION-02, NOTION-03

**Success Criteria** (what must be TRUE):
  1. User is prompted for Notion parent page URL during install.js setup (after API key prompt)
  2. Page ID is extracted from various URL formats (notion.so/{slug}-{id}, notion.so/{id}, shared links with query params)
  3. Extracted page ID is validated (32-char hex or UUID format) and saved to config.json as notion.parent_page_id
  4. User sees example URL format in prompt and helpful error messages for invalid URLs
  5. User can skip parent page configuration by pressing Enter (optional field)

**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md — Add Notion parent page URL prompt with ID extraction, validation, and config persistence — completed 2026-02-12

### Phase 13: Auto-Discuss Before Planning

**Goal**: Each phase automatically offers discussion before planning, ensuring context is gathered before formal planning begins

**Depends on**: Nothing (extends existing discuss-phase workflow)

**Requirements**: PLAN-01, PLAN-02

**Success Criteria** (what must be TRUE):
  1. When plan-phase runs and CONTEXT.md is missing, user is asked "Discuss this phase first or plan directly?"
  2. If user chooses discuss, full interactive discussion runs (AskUserQuestion prompts for decisions and discretion areas) before planning
  3. CONTEXT.md is created and saved before planning proceeds
  4. Planning steps (research, plan, check) receive CONTEXT.md content to inform their work
  5. User can skip discussion and proceed to planning directly if context is already clear

**Plans**: 1 plan

Plans:
- [x] 13-01-PLAN.md — Add discussion gate to plan-phase workflow with --skip-discussion flag — completed 2026-02-12

### Phase 14: Notion Sync Integration

**Goal**: After all phases are planned, user is prompted to sync planning docs to Notion with auth pre-check to prevent failures

**Depends on**: Phase 12 (parent page configuration)

**Requirements**: PLAN-03, NOTION-04

**Success Criteria** (what must be TRUE):
  1. After all phases in milestone are planned, user sees "Sync planning docs to Notion?" prompt before completion message
  2. Prompt only appears if Notion is properly configured (API key validation: non-empty, correct prefix, parent page ID exists)
  3. If user accepts, notion-sync.js runs and uploads .planning/ markdown files to Notion with parent/child hierarchy
  4. Sync results are displayed (files created/updated/skipped/failed) before showing final completion message
  5. If Notion is not configured, prompt is skipped and user proceeds to completion message without interruption

**Plans**: 1 plan

Plans:
- [x] 14-01-PLAN.md — Add Notion sync prompt step 14e to plan-phase workflow with auth pre-check — completed 2026-02-12

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-02-10 |
| 2. Git Integration | v1.0 | 2/2 | Complete | 2026-02-10 |
| 3. Workflow Simplification | v1.0 | 3/3 | Complete | 2026-02-10 |
| 4. UX Polish | v1.0 | 2/2 | Complete | 2026-02-11 |
| 5. Jira Integration | v1.0 | 2/2 | Complete | 2026-02-11 |
| 6. Foundation & SDK Setup | v1.1 | 2/2 | Complete | 2026-02-11 |
| 7. Markdown-to-Notion Conversion | v1.1 | 3/3 | Complete | 2026-02-11 |
| 8. Page Hierarchy & Incremental Sync | v1.1 | 2/2 | Complete | 2026-02-11 |
| 9. Image Handling | v1.1 | 2/2 | Complete | 2026-02-11 |
| 10. Workflow Integration & Comment Retrieval | v1.1 | 2/2 | Complete | 2026-02-11 |
| 11. Quick Settings Shortcut | v1.2 | 1/1 | Complete | 2026-02-12 |
| 12. Notion Parent Page Configuration | v1.2 | 1/1 | Complete | 2026-02-12 |
| 13. Auto-Discuss Before Planning | v1.2 | 1/1 | Complete | 2026-02-12 |
| 14. Notion Sync Integration | v1.2 | 1/1 | Complete | 2026-02-12 |

---
*Roadmap created: 2026-02-10*
*Last updated: 2026-02-12 (Phase 14 complete — v1.2 milestone done)*
