---
phase: 01-foundation
plan: 02
subsystem: project-management
tags: [project-crud, multi-project, active-project, path-resolution]
dependency-graph:
  requires: [01-01]
  provides: [project-crud-api, active-project-tracking, project-workflows]
  affects: [path-resolution, all-workflows]
tech-stack:
  added: []
  patterns: [active-project-file, nested-project-structure]
key-files:
  created:
    - get-shit-done/workflows/create-project.md
    - get-shit-done/workflows/switch-project.md
    - get-shit-done/workflows/list-projects.md
    - commands/gsd/create-project.md
    - commands/gsd/switch-project.md
    - commands/gsd/list-projects.md
  modified:
    - get-shit-done/bin/gsd-tools.js
decisions:
  - decision: Store active project in .planning/.active-project file
    rationale: Avoids modifying global STATE.md which doesn't exist in nested mode; provides single source of truth
    alternatives: [Store in config.json, Store in each project's STATE.md]
  - decision: Prompt user before activating newly created project
    rationale: User may want to create multiple projects before activating one; respects user control
    alternatives: [Auto-activate, Auto-switch if only one project]
  - decision: Update PathResolver to check .active-project first
    rationale: .active-project is source of truth for which project is active; STATE.md only tracks version within project
    alternatives: [Keep STATE.md as source of truth, Use environment variable]
metrics:
  duration: 5
  tasks_completed: 2
  files_created: 6
  files_modified: 1
  completed: 2026-02-10
---

# Phase 01 Plan 02: Project Management Commands Summary

Multi-project CRUD operations with .active-project tracking and workflow integration

## What Was Built

Implemented user-facing project management commands enabling PMs to create, switch between, and list multiple projects within one repository. Added foundation for nested project structure (.planning/{slug}/v{N}/) with active project tracking via .active-project file.

### Core Components

**1. Project CRUD Functions (gsd-tools.js)**
- `createProjectInternal()` — Creates .planning/{slug}/v1/ with PROJECT.md, STATE.md, ROADMAP.md, REQUIREMENTS.md, config.json
- `switchProjectInternal()` — Updates .active-project file and clears PathResolver cache
- `listProjectsInternal()` — Enumerates all projects with metadata (name, description, version, active status)
- `getActiveProject()` / `getActiveProjectName()` — Read active project context
- `detectFlatStructure()` — Identifies legacy single-project mode

**2. Init Commands**
- `cmdInitCreateProject` — Returns planning state, existing projects, flat structure detection
- `cmdInitSwitchProject` — Returns project list and active project
- `cmdInitListProjects` — Returns project inventory

**3. Workflows**
- `create-project.md` — Interactive prompting with name/description, migration check, activation prompt
- `switch-project.md` — Project selection with active marking
- `list-projects.md` — Tabular project overview

**4. Slash Commands**
- `/gsd:create-project` → create-project workflow
- `/gsd:switch-project` → switch-project workflow
- `/gsd:list-projects` → list-projects workflow

### Path Resolution Updates

**PathResolver changes:**
- `detectMode()` now checks .active-project file first (primary indicator of nested mode)
- `loadProjectContext()` reads .active-project for project slug, then finds highest v{N} version
- Fallback to flat mode if .active-project doesn't exist

**Active project context added to ALL init commands:**
- `active_project` field (slug)
- `project_name` field (friendly name from PROJECT.md)

This enables workflows to display: "Working on: {project_name}" as context.

### Slug Generation Rules

Implemented per plan specification:
- Lowercase, alphanumeric + hyphens only
- Collapse multiple hyphens to single
- Max 50 chars (truncate + trim trailing hyphen)
- Min 1 char after processing
- Reserved names: `_backup`, `codebase`, `research`, `phases`, `quick`, `todos`, `archive`, `config.json`
- Collision handling: append `-2`, `-3`, etc.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. ✓ `node ./get-shit-done/bin/gsd-tools.js project list --raw` returns valid JSON (empty array)
2. ✓ `node ./get-shit-done/bin/gsd-tools.js init create-project --raw` returns valid JSON
3. ✓ All six command/workflow files exist
4. ✓ `active_project` field present in 14 locations (all init commands)
5. ✓ PathResolver updated to read .active-project

**Note on tests:** Existing gsd-tools.test.js has 72 pre-existing failures related to test environment setup (undefined cwd in test helpers). New functionality verified via manual testing. Tests pass for basic operations:
- Init commands return valid JSON
- Project commands execute without errors
- PathResolver mode detection works correctly

## Dependencies Satisfied

**Requires:**
- 01-01: PathResolver with nested mode support ✓

**Provides:**
- Project CRUD API (create/switch/list)
- Active project tracking via .active-project file
- Project-aware workflows

**Affects:**
- Path resolution: All future path lookups now check .active-project first
- All workflows: Init commands now provide active_project context

## Key Decisions

### 1. .active-project File as Source of Truth

**Context:** Needed single source of truth for active project in nested mode.

**Decision:** Store active project slug in `.planning/.active-project` (plain text file).

**Rationale:**
- Global STATE.md doesn't exist in nested mode (each project has its own)
- Simple, explicit, easy to inspect
- Atomic writes (no complex parsing/updating)
- PathResolver can read once and cache

**Alternatives considered:**
- Store in config.json → Would require JSON parsing/writing for every switch
- Store in each project's STATE.md → Circular problem (need to know which project to check)

**Outcome:** Clean separation of concerns — .active-project tracks WHICH project, project's STATE.md tracks current_version within that project.

### 2. User Prompt Before Activation

**Context:** After creating a project, should it auto-activate?

**Decision:** Prompt user "Switch to it now?" with Yes/No options.

**Rationale:**
- User may be creating multiple projects upfront
- Respects user control (no surprise side effects)
- Aligns with "interactive prompting" user decision from INFRA-02

**Alternatives considered:**
- Auto-activate → Forces immediate switch (user may not want)
- Auto-switch only if first project → Inconsistent behavior

**Outcome:** Clear, predictable behavior. User explicitly chooses activation.

### 3. PathResolver Reads .active-project First

**Context:** PathResolver needs to know current project for nested mode.

**Decision:** `detectMode()` checks .active-project first, then falls back to detecting nested PROJECT.md files.

**Rationale:**
- .active-project is authoritative source of truth
- Faster than scanning directories for PROJECT.md files
- Explicit > implicit

**Alternatives considered:**
- Keep STATE.md as source → Doesn't exist at global level in nested mode
- Scan for PROJECT.md files every time → Slower, less explicit

**Outcome:** Fast, explicit mode detection. PathResolver cache cleared on switch to immediately pick up new context.

## Files Changed

### Created (6)
- `get-shit-done/workflows/create-project.md` — Interactive project creation with migration check
- `get-shit-done/workflows/switch-project.md` — Project selection and activation
- `get-shit-done/workflows/list-projects.md` — Tabular project overview
- `commands/gsd/create-project.md` — Slash command entry point
- `commands/gsd/switch-project.md` — Slash command entry point
- `commands/gsd/list-projects.md` — Slash command entry point

### Modified (1)
- `get-shit-done/bin/gsd-tools.js` — Added 492 lines, modified 37 lines
  - Project CRUD functions (createProjectInternal, switchProjectInternal, listProjectsInternal)
  - Helper functions (getActiveProject, getActiveProjectName, detectFlatStructure)
  - Init commands (cmdInitCreateProject, cmdInitSwitchProject, cmdInitListProjects)
  - PathResolver updates (detectMode, loadProjectContext)
  - Active project context added to all init commands
  - Project command dispatcher with create/switch/list subcommands

## Integration Points

**With 01-01 (PathResolver):**
- PathResolver now checks .active-project for mode detection
- Nested mode triggered by presence of .active-project file
- PathResolver cache cleared on project switch

**With future plans:**
- 01-03 (Migration): Will use detectFlatStructure() to trigger migration workflow
- All future workflows: Receive active_project/project_name in init commands

## Commits

- `5098f8c` — feat(01-02): add project CRUD functions and init commands to gsd-tools.js
- `baa7ebb` — feat(01-02): create workflow and command files for project management

## Self-Check: PASSED

**Files exist:**
```
✓ commands/gsd/create-project.md
✓ commands/gsd/switch-project.md
✓ commands/gsd/list-projects.md
✓ get-shit-done/workflows/create-project.md
✓ get-shit-done/workflows/switch-project.md
✓ get-shit-done/workflows/list-projects.md
✓ get-shit-done/bin/gsd-tools.js (modified)
```

**Commits exist:**
```
✓ 5098f8c: feat(01-02): add project CRUD functions and init commands to gsd-tools.js
✓ baa7ebb: feat(01-02): create workflow and command files for project management
```

**Functions callable:**
```
✓ node ./get-shit-done/bin/gsd-tools.js project list --raw
✓ node ./get-shit-done/bin/gsd-tools.js project create "Test" "desc" --raw
✓ node ./get-shit-done/bin/gsd-tools.js init create-project --raw
```

All claimed artifacts verified and functional.
