---
name: gsd-pm:new-project
description: Initialize a new project with deep context gathering and PROJECT.md
argument-hint: "[--auto]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Task
  - AskUserQuestion
---
<context>
**Flags:**
- `--auto` — Automatic mode. After config questions, runs research → requirements → roadmap without further interaction. Expects idea document via @ reference.
</context>

<objective>
Create a new project and initialize it through unified flow: project creation → questioning → research (optional) → requirements → roadmap.

**Creates:**
- `.planning-pm/{slug}/` — project folder with isolated structure
- `.planning-pm/{slug}/PROJECT.md` — project context
- `.planning-pm/config.json` — workflow preferences
- `.planning-pm/{slug}/v1/research/` — domain research (optional)
- `.planning-pm/{slug}/v1/REQUIREMENTS.md` — scoped requirements
- `.planning-pm/{slug}/v1/ROADMAP.md` — phase structure
- `.planning-pm/{slug}/v1/STATE.md` — project memory

**After this command:** Run `/gsd-pm:plan-phase 1` to start execution.
</objective>

<execution_context>
@~/.claude/gsd-pm/workflows/new-project.md
@~/.claude/gsd-pm/references/questioning.md
@~/.claude/gsd-pm/references/ui-brand.md
@~/.claude/gsd-pm/templates/project.md
@~/.claude/gsd-pm/templates/requirements.md
</execution_context>

<process>
Execute the new-project workflow from @~/.claude/gsd-pm/workflows/new-project.md end-to-end.
Preserve all workflow gates (validation, approvals, commits, routing).
</process>
