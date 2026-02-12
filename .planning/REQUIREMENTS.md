# Requirements: GSD for PMs

**Defined:** 2026-02-12
**Core Value:** PMs can go from idea to fully planned, phase-by-phase project specification using a conversational AI workflow

## v1.3 Requirements

Requirements for v1.3 Comment-Driven Planning milestone.

### Comment Interpretation

- [x] **CINT-01**: After comments are fetched, Claude presents a plain-language interpretation of what each comment means and what the commenter is asking for
- [x] **CINT-02**: Comments are grouped by the source file they were placed on (using page title from Notion)
- [x] **CINT-03**: Each interpretation includes the original comment text, commenter name, and Claude's understanding of the intent

### Output Management

- [x] **OUTP-01**: When comment interpretation exceeds conversation-friendly length, it is saved to `.planning/notion-comments-{date}.md` and the user is told to read the file
- [x] **OUTP-02**: When output fits in conversation, it is presented inline without creating a file

### Phase Integration

- [x] **PINT-01**: After presenting comment understanding, Claude analyzes the current roadmap and recommends whether each accepted comment should update an existing phase or create a new phase
- [x] **PINT-02**: For existing phase updates, Claude identifies which specific phase and what changes are needed
- [x] **PINT-03**: For new phase creation, Claude proposes a phase name, goal, and requirements following the existing roadmap format

### User Control

- [x] **CTRL-01**: User is prompted with two options: "Discuss changes" (interactive conversation) or "Let Claude decide" (auto-incorporate)
- [x] **CTRL-02**: If "Discuss changes", Claude walks through each proposed change for user approval/modification before applying
- [x] **CTRL-03**: If "Let Claude decide", Claude auto-incorporates all accepted changes into the planning artifacts (ROADMAP.md, phase plans, REQUIREMENTS.md)

## v1.2 Requirements (Complete)

<details>
<summary>All 10 requirements complete</summary>

### Setup UX

- [x] **SETUP-01**: User sees "Apply recommended settings?" option before individual settings questions during new-project
- [x] **SETUP-02**: Recommended settings apply depth: standard, research: true, plan_check: true, verifier: true, model_profile: balanced, commit_docs: true as a single action
- [x] **SETUP-03**: Recommended settings are defined in a single RECOMMENDED_SETTINGS constant (prevents drift between shortcut and interactive paths)

### Planning Workflow

- [x] **PLAN-01**: plan-phase auto-advance loop runs discuss-phase before planning each phase when CONTEXT.md is missing
- [x] **PLAN-02**: discuss-phase runs full interactive flow (AskUserQuestion prompts for decisions, discretion areas) before proceeding to planning
- [x] **PLAN-03**: After all phases are planned, user is prompted "Sync to Notion?" before displaying completion

### Notion Config

- [x] **NOTION-01**: install.js asks for Notion parent page URL during setup (after API key prompt)
- [x] **NOTION-02**: Page ID is extracted from Notion URL (handles `notion.so/{slug}-{id}` and `notion.so/{id}` formats)
- [x] **NOTION-03**: Extracted page ID is saved to config.json as `notion.parent_page_id`
- [x] **NOTION-04**: Auth pre-check validates Notion API key before showing sync prompt (prevents post-completion failures)

</details>

## Future Requirements

### Deferred from v1.1

- Dual-mode auto-detection for flat and nested folder structures
- Switch-project command (`/gsd:switch-project {name}`)
- Auto-advance pause/resume
- Phase jump (`/gsd:goto-phase {N}`)
- Stakeholder export (exec-friendly summary)
- Smart change detection (ESYNC-01)
- Internal link preservation (ESYNC-02)
- Selective sync filtering (ESYNC-03)
- Sync delete detection (ESYNC-04)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Inquirer.js or other prompt library | readline sufficient, 200KB+ dependency not justified |
| Auto-sync on every file change | Rate limiting concerns, users lose control |
| Token budget enforcement per agent | Framework lacks mechanism, defer to future |
| Settings migration on version upgrade | Not needed yet, document "last reviewed" date |
| Bidirectional Notion sync | Conflict resolution unclear, one-way sufficient |
| Auto-resolve comments in Notion | Destructive action, user should resolve manually |
| Real-time comment streaming | Polling complexity, manual trigger sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 11 | Complete |
| SETUP-02 | Phase 11 | Complete |
| SETUP-03 | Phase 11 | Complete |
| NOTION-01 | Phase 12 | Complete |
| NOTION-02 | Phase 12 | Complete |
| NOTION-03 | Phase 12 | Complete |
| PLAN-01 | Phase 13 | Complete |
| PLAN-02 | Phase 13 | Complete |
| PLAN-03 | Phase 14 | Complete |
| NOTION-04 | Phase 14 | Complete |
| CINT-01 | Phase 15 | Complete |
| CINT-02 | Phase 15 | Complete |
| CINT-03 | Phase 15 | Complete |
| OUTP-01 | Phase 15 | Complete |
| OUTP-02 | Phase 15 | Complete |
| PINT-01 | Phase 16 | Complete |
| PINT-02 | Phase 16 | Complete |
| PINT-03 | Phase 16 | Complete |
| CTRL-01 | Phase 16 | Complete |
| CTRL-02 | Phase 16 | Complete |
| CTRL-03 | Phase 16 | Complete |

**Coverage:**
- v1.3 requirements: 11 total
- Mapped to phases: 11/11 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 after v1.3 roadmap creation*
