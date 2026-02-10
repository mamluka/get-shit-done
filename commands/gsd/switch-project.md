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
Switch the active project by updating .planning/.active-project file. All subsequent GSD commands will operate on the selected project.
</objective>

<execution_context>
@./get-shit-done/workflows/switch-project.md
</execution_context>

<process>
Execute the switch-project workflow from @./get-shit-done/workflows/switch-project.md end-to-end.
Preserve all workflow gates (project selection, validation).
</process>
