# Requirements: GSD for PMs

**Defined:** 2026-02-12
**Core Value:** PMs can go from idea to fully planned, phase-by-phase project specification using a conversational AI workflow

## v1.2 Requirements

Requirements for v1.2 Streamlined Workflow milestone.

### Setup UX

- [ ] **SETUP-01**: User sees "Apply recommended settings?" option before individual settings questions during new-project
- [ ] **SETUP-02**: Recommended settings apply depth: quick, research: true, plan_check: true, verifier: true, model_profile: balanced, commit_docs: true as a single action
- [ ] **SETUP-03**: Recommended settings are defined in a single RECOMMENDED_SETTINGS constant (prevents drift between shortcut and interactive paths)

### Planning Workflow

- [ ] **PLAN-01**: plan-phase auto-advance loop runs discuss-phase before planning each phase when CONTEXT.md is missing
- [ ] **PLAN-02**: discuss-phase runs full interactive flow (AskUserQuestion prompts for decisions, discretion areas) before proceeding to planning
- [ ] **PLAN-03**: After all phases are planned, user is prompted "Sync to Notion?" before displaying completion

### Notion Config

- [ ] **NOTION-01**: install.js asks for Notion parent page URL during setup (after API key prompt)
- [ ] **NOTION-02**: Page ID is extracted from Notion URL (handles `notion.so/{slug}-{id}` and `notion.so/{id}` formats)
- [ ] **NOTION-03**: Extracted page ID is saved to config.json as `notion.parent_page_id`
- [ ] **NOTION-04**: Auth pre-check validates Notion API key before showing sync prompt (prevents post-completion failures)

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

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 11 | Pending |
| SETUP-02 | Phase 11 | Pending |
| SETUP-03 | Phase 11 | Pending |
| NOTION-01 | Phase 12 | Pending |
| NOTION-02 | Phase 12 | Pending |
| NOTION-03 | Phase 12 | Pending |
| PLAN-01 | Phase 13 | Pending |
| PLAN-02 | Phase 13 | Pending |
| PLAN-03 | Phase 14 | Pending |
| NOTION-04 | Phase 14 | Pending |

**Coverage:**
- v1.2 requirements: 10 total
- Mapped to phases: 10/10 (100%)
- Unmapped: 0

**Phase breakdown:**
- Phase 11 (Quick Settings Shortcut): 3 requirements
- Phase 12 (Notion Parent Page Configuration): 3 requirements
- Phase 13 (Auto-Discuss Before Planning): 2 requirements
- Phase 14 (Notion Sync Integration): 2 requirements

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 (roadmap traceability added)*
