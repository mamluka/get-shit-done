# Roadmap: GSD for PMs

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-02-11)
- ✅ **v1.1 Notion Integration** — Phases 6-10 (shipped 2026-02-11)
- ✅ **v1.2 Streamlined Workflow** — Phases 11-14 (shipped 2026-02-12)
- ✅ **v1.3 Comment-Driven Planning** — Phases 15-16 (shipped 2026-02-12)
- 🚧 **v1.4 Jira Sync** — Phases 17-21 (in progress)

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

<details>
<summary>✅ v1.2 Streamlined Workflow (Phases 11-14) — SHIPPED 2026-02-12</summary>

- [x] Phase 11: Quick Settings Shortcut (1/1 plans) — completed 2026-02-12
- [x] Phase 12: Notion Parent Page Configuration (1/1 plans) — completed 2026-02-12
- [x] Phase 13: Auto-Discuss Before Planning (1/1 plans) — completed 2026-02-12
- [x] Phase 14: Notion Sync Integration (1/1 plans) — completed 2026-02-12

</details>

<details>
<summary>✅ v1.3 Comment-Driven Planning (Phases 15-16) — SHIPPED 2026-02-12</summary>

### Phase 15: Comment Understanding & Output

**Goal**: User receives plain-language interpretation of Notion comments with smart output handling

**Depends on**: Phase 10 (comment retrieval infrastructure)

**Requirements**: CINT-01, CINT-02, CINT-03, OUTP-01, OUTP-02

**Success Criteria** (what must be TRUE):
  1. User sees plain-language interpretation of what each comment means and what the commenter is asking for
  2. Comments are grouped by the source file they were placed on (using Notion page title)
  3. Each interpretation shows original comment text, commenter name, and Claude's understanding of intent
  4. When interpretation exceeds conversation-friendly length (>1500 tokens), output is saved to `.planning/notion-comments-{date}.md` and user is directed to read the file
  5. When interpretation fits in conversation (<1500 tokens), it is presented inline without creating a file

**Plans:** 1 plan

Plans:
- [x] 15-01-PLAN.md — Add comment interpretation step with source-file grouping and smart output routing — completed 2026-02-12

### Phase 16: Phase Integration & User Control

**Goal**: User can choose to discuss or auto-incorporate comment-driven changes into planning artifacts

**Depends on**: Phase 15 (comment interpretation)

**Requirements**: PINT-01, PINT-02, PINT-03, CTRL-01, CTRL-02, CTRL-03

**Success Criteria** (what must be TRUE):
  1. After presenting comment understanding, Claude analyzes the current roadmap and recommends whether each accepted comment should update an existing phase or create a new phase
  2. For existing phase updates, Claude identifies which specific phase and what changes are needed (add success criterion, add requirement, update goal, etc.)
  3. For new phase creation, Claude proposes a phase name, goal, requirements, and success criteria following the existing roadmap format
  4. User is prompted with two options: "Discuss changes" (interactive conversation) or "Let Claude decide" (auto-incorporate)
  5. If "Discuss changes", Claude walks through each proposed change for user approval/modification before applying
  6. If "Let Claude decide", Claude auto-incorporates all accepted changes into planning artifacts (ROADMAP.md, phase PLAN.md files, REQUIREMENTS.md traceability)

**Plans:** 1 plan

Plans:
- [x] 16-01-PLAN.md — Replace triage flow with phase-integration analysis and user-controlled incorporation — completed 2026-02-12

</details>

### 🚧 v1.4 Jira Sync (In Progress)

**Milestone Goal:** Push planning artifacts (requirements and phases) into Jira as actionable tickets under an epic, with Notion page links, team assignment, and create+update semantics.

#### Phase 17: Jira MCP Detection & Prerequisites
**Goal**: Validate environment and collect configuration required for Jira sync operations
**Depends on**: Phase 16
**Requirements**: SETUP-01, SETUP-02, SETUP-03
**Success Criteria** (what must be TRUE):
  1. User sees clear install command if Jira MCP is not available
  2. User is blocked with actionable message if notion-sync.json doesn't exist (with guidance to run sync-notion first)
  3. User can view and select target Jira project from available projects
  4. Selected Jira project ID is saved for the sync operation
**Plans**: TBD

Plans:
- [ ] 17-01-PLAN.md

#### Phase 18: Granularity Strategy & Ticket Mapping
**Goal**: Enable flexible ticket creation at phase, category, or requirement level based on team workflow preferences
**Depends on**: Phase 17
**Requirements**: GRAN-01, GRAN-02, GRAN-03, GRAN-04
**Success Criteria** (what must be TRUE):
  1. User is prompted to choose ticket granularity (phase-level, category-level, requirement-level) at start of each sync
  2. Phase-level creates one ticket per phase with all requirements listed in description
  3. Category-level creates one ticket per requirement category with individual requirements as checklist items
  4. Requirement-level creates one ticket per REQ-ID with phase context included in description
  5. Ticket structure matches user's selected granularity choice without manual configuration
**Plans**: TBD

Plans:
- [ ] 18-01-PLAN.md

#### Phase 19: Epic & Ticket Creation
**Goal**: Push planning artifacts to Jira as structured epic and tickets with Notion links and preview workflow
**Depends on**: Phase 18
**Requirements**: TICK-01, TICK-02, TICK-03, TICK-04, TICK-05
**Success Criteria** (what must be TRUE):
  1. Epic is created per milestone as parent for all tickets
  2. Tickets are created as children of the epic
  3. Each ticket includes Notion page link as remote link (pulled from notion-sync.json)
  4. Ticket descriptions include relevant planning content (requirements, success criteria, phase context)
  5. User sees full ticket preview (epic + all tickets) before any writes to Jira
  6. User can approve or cancel the sync operation after preview
**Plans**: TBD

Plans:
- [ ] 19-01-PLAN.md

#### Phase 20: Team Assignment
**Goal**: Enable epic and ticket assignment to team members for workload distribution
**Depends on**: Phase 19
**Requirements**: TEAM-01, TEAM-02, TEAM-03
**Success Criteria** (what must be TRUE):
  1. User sees list of Jira project team members with names and account IDs
  2. User can assign epic to self or a team member
  3. User can assign tickets to team members (bulk assignment or individual per ticket)
  4. Assignments are reflected in Jira after sync completes
**Plans**: TBD

Plans:
- [ ] 20-01-PLAN.md

#### Phase 21: Update Semantics & Tracking
**Goal**: Enable incremental sync with create vs update detection and local tracking
**Depends on**: Phase 19
**Requirements**: SYNC-01, SYNC-02, SYNC-03
**Success Criteria** (what must be TRUE):
  1. Ticket-to-Jira mapping is persisted in .planning/jira-sync.json per project
  2. Re-running sync updates existing tickets instead of creating duplicates
  3. New requirements or phases detected on re-run create new tickets
  4. jira-sync.json tracks ticket IDs with granularity metadata (phase/category/requirement)
  5. Update operations preserve existing ticket IDs and links
**Plans**: TBD

Plans:
- [ ] 21-01-PLAN.md

## Progress

**Execution Order:**
Phases execute in numeric order: 17 → 18 → 19 → 20 → 21

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
| 15. Comment Understanding & Output | v1.3 | 1/1 | Complete | 2026-02-12 |
| 16. Phase Integration & User Control | v1.3 | 1/1 | Complete | 2026-02-12 |
| 17. Jira MCP Detection & Prerequisites | v1.4 | 0/1 | Not started | - |
| 18. Granularity Strategy & Ticket Mapping | v1.4 | 0/1 | Not started | - |
| 19. Epic & Ticket Creation | v1.4 | 0/1 | Not started | - |
| 20. Team Assignment | v1.4 | 0/1 | Not started | - |
| 21. Update Semantics & Tracking | v1.4 | 0/1 | Not started | - |

---
*Roadmap created: 2026-02-10*
*Last updated: 2026-02-12 (v1.4 milestone roadmap created)*
