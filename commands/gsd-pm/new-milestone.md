---
name: gsd-pm:new-milestone
description: Start a new milestone cycle — update PROJECT.md and route to requirements
argument-hint: "[milestone name, e.g., 'v1.1 Notifications'] [--auto]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---
<context>
**Flags:**
- `--auto` — Automatic mode. After config, runs research → requirements → roadmap without further interaction. Expects idea document via @ reference or `.planning-pm/external-spec.md`.
</context>

<objective>
Start a new milestone: questioning → research (optional) → requirements → roadmap.

Brownfield equivalent of new-project. Project exists, PROJECT.md has history. Gathers "what's next", updates PROJECT.md, then runs requirements → roadmap cycle.

**Creates/Updates:**
- `.planning-pm/PROJECT.md` — updated with new milestone goals
- `.planning-pm/research/` — domain research (optional, NEW features only)
- `.planning-pm/REQUIREMENTS.md` — scoped requirements for this milestone
- `.planning-pm/ROADMAP.md` — phase structure (continues numbering)
- `.planning-pm/STATE.md` — reset for new milestone

**After:** `/gsd-pm:plan-phase [N]` to start execution.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/new-milestone.md
@~/.claude/get-shit-done/references/questioning.md
@~/.claude/get-shit-done/references/ui-brand.md
@~/.claude/get-shit-done/templates/project.md
@~/.claude/get-shit-done/templates/requirements.md
</execution_context>

<context>
Milestone name: $ARGUMENTS (optional - will prompt if not provided)

**Load project context:**
@.planning-pm/PROJECT.md
@.planning-pm/STATE.md
@.planning-pm/MILESTONES.md
@.planning-pm/config.json

**Load milestone context (if exists, from /gsd-pm:discuss-milestone):**
@.planning-pm/MILESTONE-CONTEXT.md

**Load external spec (if exists, from fetch workflows):**
@.planning-pm/external-spec.md
</context>

<process>
Execute the new-milestone workflow from @~/.claude/get-shit-done/workflows/new-milestone.md end-to-end.
Preserve all workflow gates (validation, questioning, research, requirements, roadmap approval, commits).
</process>
