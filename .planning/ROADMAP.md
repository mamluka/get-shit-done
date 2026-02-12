# Roadmap: GSD for PMs

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-02-11)
- ✅ **v1.1 Notion Integration** — Phases 6-10 (shipped 2026-02-11)
- ✅ **v1.2 Streamlined Workflow** — Phases 11-14 (shipped 2026-02-12)
- 🚧 **v1.3 Comment-Driven Planning** — Phases 15-16 (in progress)

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

### 🚧 v1.3 Comment-Driven Planning (In Progress)

**Milestone Goal:** Transform the notion-comments workflow from a passive triage tool into an active planning driver — Claude interprets comments, recommends planning changes, and can auto-incorporate feedback into phases.

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

**Plans**: 0 plans (not started)

Plans:
- [ ] 16-01-PLAN.md — TBD

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
| 15. Comment Understanding & Output | v1.3 | 1/1 | Complete | 2026-02-12 |
| 16. Phase Integration & User Control | v1.3 | 0/? | Pending | — |

---
*Roadmap created: 2026-02-10*
*Last updated: 2026-02-12 (v1.3 milestone roadmap created)*
