---
name: gsd-pm:progress
description: Check project progress, recent work, and what to do next
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - SlashCommand
---
<objective>
Check project progress, summarize recent work and what's ahead, then intelligently route to the next action - either executing an existing plan or creating the next one.

Provides situational awareness before continuing work.
</objective>

<execution_context>
@~/.claude/gsd-pm/workflows/progress.md
</execution_context>

<process>
Execute the progress workflow from @~/.claude/gsd-pm/workflows/progress.md end-to-end.
Preserve all routing logic (Routes A through F) and edge case handling.
</process>
