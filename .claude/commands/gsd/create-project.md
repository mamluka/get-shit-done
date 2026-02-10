---
name: gsd:create-project
description: Create a new project with isolated folder structure for multi-project planning support
argument-hint: ""
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
---

<objective>
Create a new project with its own isolated planning folder structure.

**Creates:**
- `.planning/{slug}/PROJECT.md` — project root
- `.planning/{slug}/v1/STATE.md` — version-specific state
- `.planning/{slug}/v1/ROADMAP.md` — version-specific roadmap
- `.planning/{slug}/v1/REQUIREMENTS.md` — version-specific requirements
- `.planning/{slug}/v1/config.json` — version-specific config overrides
- `.planning/{slug}/v1/phases/` — phase directory

**After this command:** Run `/gsd:new-project` to initialize the project with questioning + research + requirements + roadmap.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/create-project.md
</execution_context>

<process>
Execute the create-project workflow from @./.claude/get-shit-done/workflows/create-project.md end-to-end.
</process>

$ARGUMENTS
