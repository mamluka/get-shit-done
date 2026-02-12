# Requirements: GSD for PMs

**Defined:** 2026-02-12
**Core Value:** PMs can go from idea to fully planned, phase-by-phase project specification using a conversational AI workflow

## v1.4 Requirements

Requirements for v1.4 Jira Sync milestone. Each maps to roadmap phases.

### Setup & Detection

- [ ] **SETUP-01**: User sees Jira MCP install command if MCP is not available
- [ ] **SETUP-02**: User is blocked with clear message if notion-sync.json doesn't exist (Notion sync required first)
- [ ] **SETUP-03**: User can select target Jira project from available projects

### Granularity & Mapping

- [ ] **GRAN-01**: User can choose ticket granularity per run (phase-level, category-level, requirement-level)
- [ ] **GRAN-02**: Phase-level creates one ticket per phase with requirements listed in description
- [ ] **GRAN-03**: Category-level creates one ticket per requirement category with individual requirements as checklist
- [ ] **GRAN-04**: Requirement-level creates one ticket per REQ-ID with phase context in description

### Ticket Creation

- [ ] **TICK-01**: Epic is created per milestone as parent for all tickets
- [ ] **TICK-02**: Tickets are created as children of the epic
- [ ] **TICK-03**: Each ticket includes Notion page link as remote link (from notion-sync.json)
- [ ] **TICK-04**: Ticket descriptions include relevant planning content (requirements, success criteria)
- [ ] **TICK-05**: User sees full ticket preview before any Jira writes

### Team Assignment

- [ ] **TEAM-01**: User sees list of Jira project team members
- [ ] **TEAM-02**: User can assign epic to self or a team member
- [ ] **TEAM-03**: User can assign tickets to self or team members (bulk or individual)

### Update & Tracking

- [ ] **SYNC-01**: Ticket-to-Jira mapping is persisted in .planning/jira-sync.json
- [ ] **SYNC-02**: Re-running sync updates existing tickets instead of creating duplicates
- [ ] **SYNC-03**: New requirements/phases detected on re-run create new tickets

## v1.3 Requirements (Complete)

<details>
<summary>All 11 requirements complete</summary>

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

</details>

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

### Enhanced Jira Sync

- **EJIRA-01**: Bidirectional status sync (Jira status changes reflected in planning docs)
- **EJIRA-02**: Automatic ticket updates when planning artifacts change
- **EJIRA-03**: Sprint mapping (assign tickets to Jira sprints)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bidirectional Jira sync (Jira → planning docs) | One-way push only, avoids divergence |
| Sprint management | Jira sprint workflows vary too much across teams |
| Custom Jira fields mapping | Keep simple with standard fields first |
| Jira webhooks/listeners | Requires server infrastructure, out of CLI scope |
| Inquirer.js or other prompt library | readline sufficient, 200KB+ dependency not justified |
| Auto-sync on every file change | Rate limiting concerns, users lose control |
| Bidirectional Notion sync | Conflict resolution unclear, one-way sufficient |
| Auto-resolve comments in Notion | Destructive action, user should resolve manually |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.4 Jira Sync

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 17 | Pending |
| SETUP-02 | Phase 17 | Pending |
| SETUP-03 | Phase 17 | Pending |
| GRAN-01 | Phase 18 | Pending |
| GRAN-02 | Phase 18 | Pending |
| GRAN-03 | Phase 18 | Pending |
| GRAN-04 | Phase 18 | Pending |
| TICK-01 | Phase 19 | Pending |
| TICK-02 | Phase 19 | Pending |
| TICK-03 | Phase 19 | Pending |
| TICK-04 | Phase 19 | Pending |
| TICK-05 | Phase 19 | Pending |
| TEAM-01 | Phase 20 | Pending |
| TEAM-02 | Phase 20 | Pending |
| TEAM-03 | Phase 20 | Pending |
| SYNC-01 | Phase 21 | Pending |
| SYNC-02 | Phase 21 | Pending |
| SYNC-03 | Phase 21 | Pending |

**Coverage:**
- v1.4 requirements: 16 total
- Mapped to phases: 16/16 (100%)
- Unmapped: 0

**Phase breakdown:**
- Phase 17 (Jira MCP Detection & Prerequisites): 3 requirements
- Phase 18 (Granularity Strategy & Ticket Mapping): 4 requirements
- Phase 19 (Epic & Ticket Creation): 5 requirements
- Phase 20 (Team Assignment): 3 requirements
- Phase 21 (Update Semantics & Tracking): 3 requirements

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 (v1.4 roadmap traceability added)*
