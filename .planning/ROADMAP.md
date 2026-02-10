# Roadmap: GSD for PMs

## Overview

Transform the existing GSD framework from a developer execution tool into a PM planning-only tool through surgical removal of execution workflows while preserving AI-assisted planning capabilities. The journey begins with foundational path abstraction enabling multi-project support, progresses through git integration for project isolation, simplifies workflows by removing execution and adding auto-advance, polishes UX with PM-friendly language, and concludes with optional Jira MCP integration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Path abstraction and multi-project folder structure
- [ ] **Phase 2: Git Integration** - Branch-per-project with milestone tagging
- [ ] **Phase 3: Workflow Simplification** - Remove execution, add auto-advance
- [ ] **Phase 4: UX Polish** - PM-friendly error messages and terminology
- [ ] **Phase 5: Jira Integration** - Optional MCP validation with graceful degradation

## Phase Details

### Phase 1: Foundation
**Goal**: Enable multiple concurrent projects with isolated state and configuration through folder-per-project structure and path abstraction layer
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. PM can create multiple projects that store artifacts in separate `.planning/{project-name}/` folders
  2. PM can switch between projects without artifacts mixing or state corruption
  3. PM with existing flat `.planning/` structure receives migration offer and can migrate without data loss
  4. All file operations automatically resolve to correct project/version paths without PM specifying paths
  5. Each project tracks its own milestone versions in `.planning/{project-name}/v{N}/` subfolders
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — PathResolver abstraction layer and hardcoded path refactor
- [ ] 01-02-PLAN.md — Project create, switch, and list commands
- [ ] 01-03-PLAN.md — Migration from flat to nested structure with backup

### Phase 2: Git Integration
**Goal**: Each project operates on dedicated git branch with milestone tagging for version history
**Depends on**: Phase 1
**Requirements**: GIT-01, GIT-02, GIT-03
**Success Criteria** (what must be TRUE):
  1. Creating a new project automatically creates and switches to `project/{name}` git branch
  2. Completing a milestone creates annotated git tag `project-{name}-v{N}` on project branch
  3. Project names with spaces, special characters, or uppercase letters are automatically sanitized for safe git usage
  4. PM can see which branch they're on and switch between project branches
**Plans:** 2 plans

Plans:
- [ ] 02-01-PLAN.md — Git sanitization and branch operations for project create/switch
- [ ] 02-02-PLAN.md — Milestone tagging and git project status

### Phase 3: Workflow Simplification
**Goal**: Planning-only workflow with execution removed and automatic phase progression
**Depends on**: Phase 1, Phase 2
**Requirements**: WKFL-01, WKFL-02, WKFL-03, WKFL-04, WKFL-05, WKFL-06
**Success Criteria** (what must be TRUE):
  1. Execution commands (execute-phase, execute-plan, verify-phase) no longer exist and show helpful redirects if attempted
  2. Marking a phase complete automatically advances to planning the next phase without separate command
  3. Auto-advance validates complete plans and requirement coverage before advancing
  4. PM can run `/gsd:edit-phase {N}` to revise planning artifacts for any phase
  5. Completing the last phase prompts for milestone completion instead of trying to advance
**Plans:** 3 plans

Plans:
- [ ] 03-01-PLAN.md — Tombstone execution commands, workflows, and agents
- [ ] 03-02-PLAN.md — Auto-advance phase completion with validation
- [ ] 03-03-PLAN.md — Edit-phase command and cross-reference cleanup

### Phase 4: UX Polish
**Goal**: All user-facing messages use business language instead of developer terminology
**Depends on**: Phase 3
**Requirements**: PMX-01, PMX-02
**Success Criteria** (what must be TRUE):
  1. Error messages use terms like "project header" instead of "frontmatter YAML" and "project workspace" instead of "git branch"
  2. Commands that reference removed execution features show clear redirects (e.g., "Use /gsd:plan-phase instead")
  3. PM reading any error message understands what went wrong, why it matters, and what to do next
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Jira Integration
**Goal**: Optional Jira MCP integration that warns but doesn't block if unavailable
**Depends on**: Phase 4
**Requirements**: JIRA-01, JIRA-02
**Success Criteria** (what must be TRUE):
  1. Before creating new project, system checks for Jira MCP and warns if missing but allows continuation
  2. If Jira MCP unavailable, setup instructions are provided but project creation proceeds
  3. Core planning features work identically whether Jira MCP is installed or not
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Planning complete | - |
| 2. Git Integration | 0/2 | Planning complete | - |
| 3. Workflow Simplification | 0/3 | Planning complete | - |
| 4. UX Polish | 0/TBD | Not started | - |
| 5. Jira Integration | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-10*
*Last updated: 2026-02-10*
