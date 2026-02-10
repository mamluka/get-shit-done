# Phase 2: Git Integration - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Each project operates on a dedicated git branch (`project/{name}`) with milestone tagging for version history. Creating a new project creates a branch, completing a milestone creates an annotated tag and merges to main. Branch and .planning state are always in sync.

</domain>

<decisions>
## Implementation Decisions

### Name sanitization
- Sanitization is silent — PM types a name, branch is created without showing or confirming the git-safe slug
- Strict sanitization: lowercase letters, numbers, and hyphens only. Everything else is stripped/converted.
- If a project name collides with an existing branch, block with an error and suggest alternatives
- Preserve the original display name in project config (e.g., PROJECT.md or project state). The slug is internal for git; the display name is what the PM sees everywhere.

### Branch switching
- Switching projects with uncommitted changes: warn and block. PM must resolve uncommitted work before switching.
- Git branch and .planning active project are always in sync — one command switches both
- When creating a new project, prompt the PM to choose: branch from main or from current branch
- If a PM tries to switch to a project whose branch is missing: error with guidance (suggest recreating or checking with team)

### Milestone completion
- Rich metadata in annotated tags: date, phase count, milestone summary, list of completed phases
- Simple confirmation after tag creation — no elaborate completion ceremony
- Completing a milestone merges the project branch into main
- Keep the project branch after merge (don't delete) — branch continues for next milestone

### Claude's Discretion
- Exact merge strategy (fast-forward, squash, merge commit)
- How to handle merge conflicts during milestone completion
- Tag naming format details beyond `project-{name}-v{N}`
- Stale branch detection or cleanup suggestions

</decisions>

<specifics>
## Specific Ideas

- Display name preserved separately from slug — PM sees "My Cool Project 2.0" in all output, git uses `project/my-cool-project-2-0` internally
- Branch creation base prompt: give PM the choice between main and current branch at project creation time

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-git-integration*
*Context gathered: 2026-02-10*
