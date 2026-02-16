---
name: gsd:new-project
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
- `.planning/{slug}/` — project folder with isolated structure
- `.planning/{slug}/PROJECT.md` — project context
- `.planning/config.json` — workflow preferences
- `.planning/{slug}/v1/research/` — domain research (optional)
- `.planning/{slug}/v1/REQUIREMENTS.md` — scoped requirements
- `.planning/{slug}/v1/ROADMAP.md` — phase structure
- `.planning/{slug}/v1/STATE.md` — project memory

**After this command:** Run `/gsd:plan-phase 1` to start execution.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/new-project.md
@~/.claude/get-shit-done/references/questioning.md
@~/.claude/get-shit-done/references/ui-brand.md
@~/.claude/get-shit-done/templates/project.md
@~/.claude/get-shit-done/templates/requirements.md
</execution_context>

<process>
Execute the new-project workflow from @~/.claude/get-shit-done/workflows/new-project.md end-to-end.
Preserve all workflow gates (validation, approvals, commits, routing).
</process>
