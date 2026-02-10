---
name: gsd:create-project
description: Create a new project with isolated folder structure
argument-hint: ""
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
---

<objective>
Create a new project in .planning/{slug}/ with isolated v1/ folder structure for multi-project management.
</objective>

<execution_context>
@./get-shit-done/workflows/create-project.md
</execution_context>

<process>
Execute the create-project workflow from @./get-shit-done/workflows/create-project.md end-to-end.
Preserve all workflow gates (validation, user prompts, commits).
</process>
