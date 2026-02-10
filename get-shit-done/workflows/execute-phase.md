<removed>
# Workflow Removed: execute-phase

This workflow was part of the execution/verification pipeline, which has been removed from the planning-only version of GSD.

**What it did:** Orchestrated parallel plan execution across waves, spawning gsd-executor subagents for each plan, handling checkpoints, and coordinating phase-level completion.

GSD is now a planning tool. Plans are specifications for engineering teams, not executable instructions.

## Replacement workflows
- Planning: plan-phase.md
- Phase completion: complete-phase.md (NEW - handles auto-advance)
- Artifact editing: edit-phase.md (NEW)
</removed>
