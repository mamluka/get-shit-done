---
name: gsd:edit-phase
description: Revise planning artifacts (plans, research, context) for a phase
argument-hint: "{phase-number} [artifact-type]"
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
Allow PMs to revise any planning artifact for a given phase. Routes to appropriate editing flow based on artifact type (plan, research, context, or roadmap).

**Flow:** Discover available artifacts → Present menu (if type not specified) → Route to editing flow → Make targeted edits → Commit changes

**Purpose:** Satisfies WKFL-05 requirement — PMs can iterate on planning artifacts after initial creation without restarting the workflow.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/edit-phase.md
</execution_context>

<context>
Phase number: $ARGUMENTS (required)
Artifact type: $ARGUMENTS (optional: "plan", "research", "context", "roadmap")

**Required reading:**
- @.planning/ROADMAP.md
- @.planning/STATE.md
- Phase directory for specified phase
</context>

<process>
Execute the edit-phase workflow from @~/.claude/get-shit-done/workflows/edit-phase.md end-to-end.

Key workflow steps:
1. Initialize phase context
2. Discover available artifacts (plans, research, context, summaries)
3. Determine edit target (from argument or user menu)
4. Route to appropriate editing flow
5. Make targeted edits preserving file structure
6. Commit changes with proper tracking
</process>

<success_criteria>
- Artifacts discovered and presented accurately
- Appropriate editing flow executed based on artifact type
- Changes committed with descriptive message
- User understands what was changed
</success_criteria>
