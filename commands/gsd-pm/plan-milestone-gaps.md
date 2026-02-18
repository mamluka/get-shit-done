---
name: gsd-pm:plan-milestone-gaps
description: Create phases to close all gaps identified by milestone audit
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---
<objective>
Create all phases necessary to close gaps identified by `/gsd-pm:audit-milestone`.

Reads MILESTONE-AUDIT.md, groups gaps into logical phases, creates phase entries in ROADMAP.md, and offers to plan each phase.

One command creates all fix phases — no manual `/gsd-pm:add-phase` per gap.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/plan-milestone-gaps.md
</execution_context>

<context>
**Audit results:**
Glob: .planning-pm/v*-MILESTONE-AUDIT.md (use most recent)

**Original intent (for prioritization):**
@.planning-pm/PROJECT.md
@.planning-pm/REQUIREMENTS.md

**Current state:**
@.planning-pm/ROADMAP.md
@.planning-pm/STATE.md
</context>

<process>
Execute the plan-milestone-gaps workflow from @~/.claude/get-shit-done/workflows/plan-milestone-gaps.md end-to-end.
Preserve all workflow gates (audit loading, prioritization, phase grouping, user confirmation, roadmap updates).
</process>
