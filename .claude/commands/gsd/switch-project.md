---
name: gsd:switch-project
description: Switch the active project for all GSD commands
argument-hint: ""
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---

<objective>
Switch the active project. All subsequent GSD commands will operate on the selected project.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/switch-project.md
</execution_context>

<process>
Execute the switch-project workflow from @./.claude/get-shit-done/workflows/switch-project.md end-to-end.
</process>

$ARGUMENTS
