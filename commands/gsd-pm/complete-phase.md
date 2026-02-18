---
name: gsd-pm:complete-phase
description: Mark a phase as complete with validation and auto-advance to next phase
argument-hint: "{phase-number}"
agent: gsd-orchestrator
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---
<objective>
Mark a phase as complete after validating planning artifacts are sufficient, then auto-advance to planning the next phase (or prompt for milestone completion if this is the last phase).

**Flow:** Validate completeness → Report warnings → Mark complete → Auto-advance to next phase OR prompt for milestone completion → Commit changes
</objective>

<execution_context>
@~/.claude/gsd-pm/workflows/complete-phase.md
@~/.claude/gsd-pm/references/ui-brand.md
</execution_context>

<context>
Phase number: $ARGUMENTS (required)

**Required reading:**
- @.planning-pm/ROADMAP.md
- @.planning-pm/STATE.md
- Phase directory for specified phase
</context>

<process>
Execute the complete-phase workflow from @~/.claude/gsd-pm/workflows/complete-phase.md end-to-end.

Preserve all workflow gates:
- Validation (plans exist, requirements mapped)
- Warning display and override prompts
- Completion state updates
- Auto-advance routing (next phase guidance OR milestone completion prompt)
- Commit with proper tracking
</process>
