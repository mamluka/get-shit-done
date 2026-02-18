# Phase 1: Foundation - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable multiple concurrent projects with isolated state and configuration through folder-per-project structure and path abstraction layer. PMs can create, switch between, and manage multiple projects with each project's artifacts stored in separate `.planning/{project-name}/` folders. Backward compatible with existing flat `.planning/` structure.

</domain>

<decisions>
## Implementation Decisions

### Project creation flow
- Interactive prompting: command asks for project name, validates, confirms before creating
- Collect name + short description during creation (description provides context when listing projects)
- Friendly names allowed: PM types "Mobile App Redesign", system auto-generates slug "mobile-app-redesign" for folders
- After creation, prompt "Switch to it now?" rather than auto-activating — supports PMs setting up multiple projects in sequence

### Project switching
- Active project shown on every GSD command output (e.g., "Project: Mobile App Redesign" header)
- Dedicated /gsd:switch-project command for switching — lists projects, PM picks one
- No --project flag on individual commands; switching is explicit
- If no active project when running a GSD command: prompt to select existing or create new (not a hard error)
- Separate /gsd:list-projects command for project overview with status at a glance

### Migration experience
- Backward compatible: flat .planning/ structure continues to work as-is for single-project usage
- Migration only triggered when PM opts into multi-project (creates a second project)
- Auto-migrate with confirmation: "I'll move your existing work into a project folder. OK?"
- Always create backup of flat structure in .planning/_backup/ before migrating — safety net

### Folder & versioning layout
- Project structure: `.planning/{project-name}/` — each project is direct child of .planning/
- Milestone versions as subfolders: `.planning/{project}/v1/`, `.planning/{project}/v2/`
- Each version mirrors current .planning/ internal layout: phases/, STATE.md, ROADMAP.md, etc.
- PROJECT.md lives at project root (`.planning/{project}/PROJECT.md`), shared across versions and updated over time
- On milestone completion, PROJECT.md snapshot copied into the version folder for historical preservation

### Claude's Discretion
- Exact slug generation rules (handling special characters, length limits)
- Internal path resolution implementation
- Validation rules for project names
- Format and content of /gsd:list-projects output
- Backup folder cleanup policy

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-10*
