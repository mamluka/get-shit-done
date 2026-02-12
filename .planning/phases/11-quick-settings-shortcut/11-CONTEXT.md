# Phase 11: Quick Settings Shortcut - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

User can skip individual settings questions during new-project and apply recommended defaults in one action. The existing custom settings flow remains unchanged. No new settings are added — this is purely a shortcut to the existing configuration.

</domain>

<decisions>
## Implementation Decisions

### Prompt placement & flow
- The recommended/custom prompt appears at the same place where individual settings questions currently appear
- Presented as two named options: "Recommended" or "Custom" — both choices feel equal, neither is hidden
- Slightly descriptive tone: give a brief line of context about recommended settings before the choice
- If user picks "Recommended" → apply defaults, show summary, skip individual questions
- If user picks "Custom" → proceed through the existing settings flow exactly as it works today

### Default values (not shown to user upfront)
- depth: standard, research: true, plan_check: true, verifier: true, model_profile: balanced, commit_docs: true, parallelization: true
- User does NOT see the individual values before accepting — "recommended" is enough context

### Confirmation feedback
- After recommended settings are applied: show a summary of what was set (list the values)
- After custom settings: no change to current behavior — no extra summary added

### Claude's Discretion
- Exact wording of the prompt and summary output
- How the single source of truth for recommended values is structured in code
- Error handling if config write fails

</decisions>

<specifics>
## Specific Ideas

- Two named options, not a yes/no — "Recommended" and "Custom" feel like equal choices
- Brief descriptive context before the choice: something like "We have recommended settings that work for most projects"
- Summary after recommended shows the actual values applied so user knows what happened

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-quick-settings-shortcut*
*Context gathered: 2026-02-12*
