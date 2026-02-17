---
name: gsd-pm:sync-notion
description: Push .planning/ markdown files to Notion pages
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---
<objective>
Sync .planning/ markdown files to Notion workspace. Validates configuration first, then runs notion-sync.js with live progress output.

Use this to manually push planning docs to Notion at any time.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/sync-notion.md
</execution_context>

<process>
Execute the sync-notion workflow from @~/.claude/get-shit-done/workflows/sync-notion.md end-to-end.
</process>
