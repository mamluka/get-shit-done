<purpose>

Mark a phase as complete with pre-validation, then automatically advance to next phase planning (or prompt for milestone completion if last phase).

Implements WKFL-03, WKFL-04, and WKFL-06: auto-advance after phase completion with validation gates.

</purpose>

<required_reading>

1. `.planning/STATE.md`
2. `.planning/ROADMAP.md`
3. Phase directory for specified phase

</required_reading>

<process>

<step name="load_state">

Read STATE.md to understand current project position:

```bash
cat .planning/STATE.md
```

Parse: Current Phase, Current Plan, Status, Last Activity

</step>

<step name="normalize_phase">

Normalize phase number input (handle "3", "03", "3.1", "03.1" formats):

```bash
PHASE_NUM="${PHASE_INPUT}"
```

If phase not provided in arguments, error: "Phase number required. Usage: /gsd:complete-phase {N}"

</step>

<step name="validate_phase">

Run validation to check phase completeness:

```bash
VALIDATION=$(node ~/.claude/get-shit-done/bin/gsd-tools.js phase validate "${PHASE_NUM}" --raw)
```

Parse the JSON result. Extract: `valid`, `warnings`, `errors`

**If errors exist (valid === false):**

Display:

```
⚠️ Cannot Complete Phase ${PHASE_NUM}

Errors:
- {error 1}
- {error 2}

Fix these issues before marking the phase complete.
```

STOP. Do not proceed.

**If warnings exist (warnings.length > 0):**

Display:

```
⚠️ Phase ${PHASE_NUM} Validation Warnings

{count} warning(s):
- {warning 1}
- {warning 2}

Continue marking phase complete? (yes/no)
```

<config-check>

```bash
cat .planning/config.json 2>/dev/null
```

</config-check>

<if mode="yolo">

```
⚡ Auto-approved: Phase completion with warnings
Proceeding to completion...
```

Continue to complete_phase.

</if>

<if mode="interactive" OR="custom with gates.confirm_phase_complete true">

Wait for user response.

- If "no" or "wait": STOP. User returns when ready.
- If "yes": Continue to complete_phase.

</if>

**If no warnings and no errors:**

Display:

```
✅ Phase ${PHASE_NUM} validation passed
Proceeding to completion...
```

Continue to complete_phase.

</step>

<step name="complete_phase">

Mark the phase complete:

```bash
COMPLETE_RESULT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js phase complete "${PHASE_NUM}" --raw)
```

Parse the JSON result. Extract:
- `completed_phase`
- `phase_name`
- `plans_executed`
- `next_phase`
- `next_phase_name`
- `is_last_phase`
- `date`
- `auto_advance`
- `milestone_complete`

Display:

```
✅ Phase ${completed_phase}: ${phase_name} marked complete

Plans executed: ${plans_executed}
Completion date: ${date}
```

</step>

<step name="auto_advance_or_milestone">

**If auto_advance === true:**

Display:

```
## ▶ Next Up

Phase ${completed_phase} is complete. Auto-advancing to Phase ${next_phase}...

**Next Phase:** ${next_phase}: ${next_phase_name}

**Options:**
- `/gsd:plan-phase ${next_phase}` — Create execution plan for next phase
- `/gsd:discuss-phase ${next_phase}` — Gather context before planning

---
```

**If milestone_complete === true:**

Display:

```
## 🎉 Phase ${completed_phase} Complete

This was the last phase in the current roadmap.

**Options:**
- `/gsd:complete-milestone` — Mark milestone as shipped and archive
- `/gsd:add-phase` — Add more phases to current milestone

---
```

</step>

<step name="commit_completion">

Commit the phase completion changes:

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js commit "docs(phase-${completed_phase}): mark phase complete" --files .planning/ROADMAP.md .planning/STATE.md
```

Confirm:

```
Committed: docs(phase-${completed_phase}): mark phase complete
```

</step>

</process>

<validation_rules>

**Validation checks (non-blocking, warning-only):**

1. **Plans exist:** At least one PLAN.md file in phase directory
   - Warning: "No plans created for this phase"
   - Rationale: Phase may have been completed without formal planning

2. **Requirements mapped:** Requirements in REQUIREMENTS.md mapped to this phase
   - Warning: "N requirement(s) still pending: REQ-ID-1, REQ-ID-2"
   - Rationale: Requirements may have moved to different phase or been descoped

**Validation errors (blocking):**

1. **Phase not found:** Directory doesn't exist
   - Error: "Phase N not found"
   - Action: STOP, cannot complete non-existent phase

</validation_rules>

<success_criteria>

Phase completion is successful when:

- [ ] Phase validation executed (errors block, warnings allow override)
- [ ] User confirmed completion (if warnings exist and mode is interactive)
- [ ] Phase marked complete in ROADMAP.md
- [ ] STATE.md updated with next phase info (or milestone-complete status)
- [ ] Auto-advance guidance displayed (next phase commands OR milestone completion)
- [ ] Changes committed with proper message
- [ ] User knows exact next command to run

</success_criteria>
