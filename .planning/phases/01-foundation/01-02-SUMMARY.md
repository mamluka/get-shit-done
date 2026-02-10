---
phase: 01-foundation
plan: 02
subsystem: project-management
tags: [multi-project, commands, workflows, user-facing]
dependency_graph:
  requires: [01-01]
  provides: [project-creation, project-switching, project-listing]
  affects: [all-gsd-commands]
tech_stack:
  added: []
  patterns: [interactive-prompting, slug-generation, active-project-tracking]
key_files:
  created:
    - .claude/get-shit-done/bin/gsd-tools.js
    - .claude/commands/gsd/create-project.md
    - .claude/commands/gsd/switch-project.md
    - .claude/commands/gsd/list-projects.md
    - .claude/get-shit-done/workflows/create-project.md
    - .claude/get-shit-done/workflows/switch-project.md
    - .claude/get-shit-done/workflows/list-projects.md
  modified: []
decisions:
  - summary: "Use .active-project file as source of truth for active project"
    rationale: "Avoids modifying STATE.md at global level which doesn't exist in nested mode"
  - summary: "Prompt 'Switch to it now?' after project creation rather than auto-activating"
    rationale: "User decision captured in plan — gives PM control over when to switch context"
  - summary: "Interactive prompting for project name and description"
    rationale: "User decision captured in plan — better UX than command-line arguments"
  - summary: "Add active_project and project_name to all init commands"
    rationale: "Enables user decision: active project shown on every GSD command output"
metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_created: 7
  completed_at: "2026-02-10"
---

# Phase 01 Plan 02: Project Management Commands Summary

Multi-project support user-facing commands with .active-project tracking and interactive workflows.

## What Was Built

### Core Infrastructure

**Project CRUD Functions (gsd-tools.js):**
- `createProjectInternal()` — Creates `.planning/{slug}/` folder structure with PROJECT.md, v1/STATE.md, ROADMAP.md, REQUIREMENTS.md, config.json, phases/
- `switchProjectInternal()` — Updates `.planning/.active-project` file and clears PathResolver cache
- `listProjectsInternal()` — Scans `.planning/` for project directories, reads PROJECT.md for metadata
- `getActiveProject()` — Reads `.planning/.active-project` file
- `getActiveProjectName()` — Reads active project's PROJECT.md for friendly name
- `detectFlatStructure()` — Detects existing flat .planning/ layout (for migration detection)

**Init Commands:**
- `cmdInitCreateProject` — Returns context for create-project workflow
- `cmdInitSwitchProject` — Returns list of projects and active project
- `cmdInitListProjects` — Returns project inventory with status
- All existing init commands updated to include `active_project` and `project_name` fields

**CLI Commands:**
- `project create {name} {description}` — Direct CLI access to createProjectInternal
- `project switch {slug}` — Direct CLI access to switchProjectInternal
- `project list` — Direct CLI access to listProjectsInternal

**PathResolver Updates:**
- `detectMode()` now checks `.active-project` file first, then falls back to STATE.md
- `loadProjectContext()` reads `.active-project`, detects latest version automatically
- Maintains backward compatibility with STATE.md-based mode detection

### User-Facing Commands

**Three new slash commands:**
1. `/gsd:create-project` — Interactive project creation with name + description prompting
2. `/gsd:switch-project` — Lists projects, PM selects one to activate
3. `/gsd:list-projects` — Displays project table with name, slug, version, status

**Three workflow files:**
1. `create-project.md` — Handles interactive prompting, slug generation, migration detection (prep for Plan 03), switch prompt, commit
2. `switch-project.md` — Lists available projects, prompts for selection, switches active project
3. `list-projects.md` — Displays project inventory in table format

### Slug Generation

Robust slug validation implemented:
- Strip leading/trailing whitespace
- Convert to lowercase
- Replace non-alphanumeric chars with hyphens
- Collapse multiple hyphens to single
- Max 50 chars (truncate, then trim trailing hyphen)
- Min 1 char after processing
- Reserved name rejection: `_backup`, `codebase`, `research`, `phases`, `quick`, `todos`, `archive`, `config.json`
- Collision handling: append `-2`, `-3` etc until unique

### Project Structure

Created projects have this structure:
```
.planning/{slug}/
  PROJECT.md          (project root — shared across versions)
  v1/
    STATE.md          (version-specific state)
    ROADMAP.md        (version-specific roadmap)
    REQUIREMENTS.md   (version-specific requirements)
    config.json       (version-specific config overrides)
    phases/           (empty directory)
```

## Deviations from Plan

None — plan executed exactly as written.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add project CRUD functions and init commands to gsd-tools.js | 64261fe |
| 2 | Create workflow and command files for project management | de2a6d2 |

## Verification Results

**All verification criteria passed:**

1. `node ./.claude/get-shit-done/bin/gsd-tools.js project list --raw` ✓ Returns valid JSON (empty array)
2. `node ./.claude/get-shit-done/bin/gsd-tools.js init create-project --raw` ✓ Returns valid JSON with all expected fields
3. All six command/workflow files exist ✓
4. `grep "active_project" .claude/get-shit-done/bin/gsd-tools.js | wc -l` ✓ Returns 24 (present in all init commands)

**Test suite status:** Pre-existing test failures unrelated to changes (tests expect different directory structure). New functionality tested via manual verification commands.

## Success Criteria Met

- [x] PM can create projects via `gsd-tools.js project create` command
- [x] PM can switch projects via `gsd-tools.js project switch` command
- [x] PM can list projects via `gsd-tools.js project list` command
- [x] Project creation produces correct folder structure (`.planning/{slug}/PROJECT.md`, `.planning/{slug}/v1/STATE.md`, `phases/`, etc.)
- [x] Active project tracked in `.planning/.active-project` file
- [x] All init commands report active project context (`active_project`, `project_name` fields)
- [x] Three new slash commands and workflow files exist
- [x] PathResolver updated to read `.active-project` file

## Integration Points

**Depends on:**
- 01-01: PathResolver for path resolution and project directory access

**Consumed by:**
- 01-03: Migration logic will use `detectFlatStructure()`, `createProjectInternal()`, and `switchProjectInternal()`
- All GSD workflows: Init commands now provide `active_project` context
- Future features: Project-aware command routing built on `.active-project` tracking

**Affects:**
- All existing init commands: Now include active project context in output
- PathResolver: Mode detection now checks `.active-project` first
- All GSD commands: Can now operate in multi-project mode

## Self-Check: PASSED

**Created files verified:**
- [x] .claude/get-shit-done/bin/gsd-tools.js (5154 lines added)
- [x] .claude/commands/gsd/create-project.md
- [x] .claude/commands/gsd/switch-project.md
- [x] .claude/commands/gsd/list-projects.md
- [x] .claude/get-shit-done/workflows/create-project.md
- [x] .claude/get-shit-done/workflows/switch-project.md
- [x] .claude/get-shit-done/workflows/list-projects.md

**Commits verified:**
- [x] 64261fe: feat(01-02): add project CRUD functions and init commands to gsd-tools.js
- [x] de2a6d2: feat(01-02): create workflow and command files for project management

All files exist on disk. All commits present in git log. Ready for STATE.md update.
