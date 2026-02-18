---
name: gsd-pm:list-projects
description: Display all projects with status overview
argument-hint: ""
allowed-tools:
  - Read
  - Bash
---

<objective>
List all projects in .planning-pm/ with their current version and active status.
</objective>

<execution_context>
@./gsd-pm/workflows/list-projects.md
</execution_context>

<process>
Execute the list-projects workflow from @./gsd-pm/workflows/list-projects.md end-to-end.
</process>
