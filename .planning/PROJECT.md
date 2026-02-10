# GSD for PMs

## What This Is

A modification of the GSD (Get Shit Done) framework that transforms it from a developer execution tool into a product management planning tool. PMs use Claude to collaboratively define projects, research domains, scope requirements, build roadmaps, and create detailed phase plans — without code execution. Built for PM teams who want structured, AI-assisted planning with full history and git-backed traceability.

## Core Value

PMs can go from idea to fully planned, phase-by-phase project specification using a conversational AI workflow — producing artifacts that are version-controlled, historically preserved, and ready for handoff to engineering.

## Requirements

### Validated

<!-- Existing capabilities from the current GSD codebase -->

- ✓ Project initialization via `/gsd:new-project` with deep questioning — existing
- ✓ Domain research with parallel researcher agents (stack, features, architecture, pitfalls) — existing
- ✓ Requirements definition with category scoping and REQ-IDs — existing
- ✓ Roadmap creation with phase structure, requirement mapping, success criteria — existing
- ✓ Phase planning with detailed PLAN.md creation — existing
- ✓ State management via STATE.md for project progression tracking — existing
- ✓ Config system for workflow preferences (config.json) — existing
- ✓ Git-backed artifact storage with atomic commits — existing
- ✓ Template system for consistent document generation — existing
- ✓ Multi-model agent spawning (quality/balanced/budget profiles) — existing
- ✓ Milestone lifecycle management — existing

### Active

<!-- New capabilities needed for PM workflow -->

- [ ] Remove execution phase — strip all code execution, keep planning pipeline only
- [ ] Folder-per-project structure: `.planning/{project-name}/v1/`, `/v2/` for milestone history
- [ ] Git branch per project: `project/{name}` branch created on new project
- [ ] Git tag per milestone: milestone completion saves tag on project branch
- [ ] Continuous phase flow: marking phase complete auto-advances to planning next phase
- [ ] Edit phase command: `/gsd:edit-phase` to revise any planning artifact (plan, requirements, roadmap)
- [ ] Jira MCP check: verify Jira MCP is installed before new project, prompt if missing
- [ ] Update all commands to work with new folder structure (paths, state, config)
- [ ] Update state management to track per-project/per-milestone paths

### Out of Scope

- Jira sync (pushing artifacts to Jira) — deferred, not sure yet if needed
- New document formats — current .md format works for PMs
- Web UI or dashboard — CLI-based workflow is sufficient
- Multi-user collaboration features — git handles collaboration
- Code execution capability — deliberately removed, this is planning-only

## Context

GSD is an existing open-source framework (~4,597 lines core JS, 28 commands, 11 agents) that orchestrates AI-assisted software development. It currently handles the full lifecycle: questioning, research, requirements, roadmap, planning, execution, and verification.

The current architecture has clear layers (commands, workflows, agents, utilities, templates) making it possible to surgically remove execution while preserving planning capabilities. The `gsd-tools.js` utility handles all state/config/git operations and will need updates for the new folder structure.

Key existing patterns to preserve:
- Command-driven workflow via `/gsd:*` slash commands
- Subagent spawning for research, planning, verification
- Template-based document generation
- Atomic git commits for planning artifacts

Key patterns to change:
- `.planning/` flat structure → `.planning/{project-name}/v{N}/` nested structure
- Single project per repo → multiple projects with branch isolation
- Manual phase transitions → auto-advance after completion
- No edit capability → full artifact editing via new command

Target users are a PM team, so workflow must be intuitive and not require understanding of the underlying agent system.

## Constraints

- **Codebase**: Must modify existing GSD framework (not fork/rewrite) — preserves update path
- **Compatibility**: Changes should not break existing GSD installations that use execution
- **Runtime**: Node.js >=16.7.0, zero external dependencies pattern must be maintained
- **Git**: Requires git — branch/tag strategy is core to the design

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Planning-only (no execution) | PMs don't write code; execution adds complexity and confusion | — Pending |
| `.planning/{name}/v{N}/` folder structure | Preserves history of all projects and milestones in one repo | — Pending |
| `project/{name}` branch convention | Clean separation between projects, main stays clean | — Pending |
| Milestone = git tag | Lightweight, standard git practice, easy to reference | — Pending |
| Auto-advance phases | Reduces friction for PMs — no need to remember next command | — Pending |
| Jira MCP as optional prerequisite | PM teams likely use Jira; check availability without forcing it | — Pending |

---
*Last updated: 2026-02-10 after initialization*
