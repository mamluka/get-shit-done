<purpose>

Allow PMs to revise planning artifacts (plans, research, context, or roadmap) for any phase. Provides artifact-aware routing to appropriate editing flows.

Implements WKFL-05: PMs can iterate on planning artifacts after initial creation.

</purpose>

<required_reading>

1. `.planning-pm/STATE.md`
2. `.planning-pm/ROADMAP.md`
3. Phase directory for specified phase

</required_reading>

<process>

<step name="initialize">

Run gsd-tools init to get phase context:

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init plan-phase "${PHASE_NUM}" --raw)
```

Parse the JSON result. Extract:
- `phase_dir`
- `phase_number`
- `phase_name`
- `has_research`
- `has_context`
- `has_plans`
- `plan_count`

If phase not found (error in JSON), display error and STOP.

Display:

```
Editing Phase ${phase_number}: ${phase_name}
```

</step>

<step name="discover_artifacts">

List available artifacts in the phase directory:

```bash
ls "${phase_dir}"/*.md 2>/dev/null
```

Categorize files:
- **Plans:** Files matching `*-PLAN.md` pattern
- **Research:** Files matching `*-RESEARCH.md` pattern
- **Context:** Files matching `*-CONTEXT.md` pattern
- **Summaries:** Files matching `*-SUMMARY.md` pattern (read-only reference, not directly editable)

Count available artifacts by type.

</step>

<step name="determine_target">

**If artifact type was provided in arguments** (e.g., "plan", "research", "context", "roadmap"):

Route directly to that artifact type (skip to route_to_editing_flow step).

**If no artifact type specified:**

Present menu of available artifacts:

```
## Available Artifacts for Phase ${phase_number}

Select artifact type to edit:

1. **plan** — Revise task breakdown, actions, verification criteria
   ${plan_count} plan file(s) available

2. **research** — Update domain research with new findings
   ${has_research ? 'Research file available' : 'No research file yet'}

3. **context** — Revise phase scope and user decisions
   ${has_context ? 'Context file available' : 'No context file yet'}

4. **roadmap** — Edit phase goal, success criteria, or requirements mapping
   Roadmap always available

Which artifact type would you like to edit?
```

Wait for user to select artifact type.

Store selection in `ARTIFACT_TYPE` variable.

</step>

<step name="route_to_editing_flow">

Route based on `ARTIFACT_TYPE`:

---

**If ARTIFACT_TYPE === "plan":**

List available plan files:

```bash
ls "${phase_dir}"/*-PLAN.md
```

If multiple plans exist, ask user which plan to edit (by number or "all").

Load the selected PLAN.md file(s). Display current content (frontmatter and key sections).

Ask user: "What would you like to change in this plan?"

Wait for user input describing changes.

Make targeted edits:
- Use Edit tool for specific section changes
- Preserve plan structure (frontmatter, XML tasks, verification)
- Update only the sections user specified

Display summary of changes made.

Store modified file path(s) in `MODIFIED_FILES` array.

---

**If ARTIFACT_TYPE === "research":**

Load RESEARCH.md:

```bash
cat "${phase_dir}"/*-RESEARCH.md
```

If no research file exists, display error: "No research file found for this phase. Run /gsd-pm:research-phase {N} first."

STOP.

Display current research sections (Domain Context, Technical Options, etc.).

Ask user: "What sections need updating? What new findings should be added?"

Wait for user input.

Make targeted edits to specified sections.

Display summary of changes made.

Store modified file path in `MODIFIED_FILES` array.

---

**If ARTIFACT_TYPE === "context":**

Check if CONTEXT.md exists:

```bash
ls "${phase_dir}"/*-CONTEXT.md 2>/dev/null
```

If exists:
- Load and display current decisions/scope
- Ask user: "What decisions need revising?"
- Make targeted edits to specified sections

If not exists:
- Display: "No context file exists yet. Would you like to create one?"
- If yes: Offer to run discuss-phase flow or create minimal context file
- If no: STOP

Display summary of changes made.

Store modified file path in `MODIFIED_FILES` array.

---

**If ARTIFACT_TYPE === "roadmap":**

Load ROADMAP.md:

```bash
cat .planning-pm/ROADMAP.md
```

Find and display the phase section for specified phase number.

Ask user: "What aspects of the phase would you like to edit? (goal, success criteria, requirements mapping, dependencies)"

Wait for user input.

Make targeted edits to the phase section:
- Preserve roadmap structure
- Update only specified fields
- Don't affect other phases

Display summary of changes made.

Store modified file path in `MODIFIED_FILES` array.

---

</step>

<step name="commit_changes">

Commit the edited artifacts:

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js commit "docs(phase-${phase_number}): revise ${ARTIFACT_TYPE}" --files ${MODIFIED_FILES[@]}
```

Display:

```
✅ Changes committed

Modified files:
${MODIFIED_FILES[@]}

Artifact type: ${ARTIFACT_TYPE}
```

</step>

<step name="offer_next_steps">

Display:

```
## Next Steps

- `/gsd-pm:edit-phase ${phase_number}` — Edit another artifact for this phase
- `/gsd-pm:plan-phase ${phase_number}` — Continue planning this phase
- `/gsd-pm:complete-phase ${phase_number}` — Mark phase as complete
```

</step>

</process>

<design_principles>

**Terminal orchestrator:**
- Edit-phase directly edits files, doesn't spawn other orchestrators
- All editing happens within this workflow

**Targeted edits:**
- Show current content before asking for changes
- Use Edit tool for surgical changes, not full rewrites
- Preserve existing file structure and formatting

**Scope restriction:**
- Edit artifacts in current milestone only (can expand in Phase 4)
- Don't allow cross-phase artifact editing in one session
- One artifact type per invocation (user can run multiple times)

**User context:**
- Always display current content before editing
- Clearly show what was changed
- Provide next-step guidance

</design_principles>

<success_criteria>

Artifact editing is successful when:

- [ ] Phase context loaded correctly
- [ ] Available artifacts discovered and displayed
- [ ] User selected or specified artifact type
- [ ] Appropriate editing flow executed
- [ ] Targeted edits made preserving file structure
- [ ] Changes committed with descriptive message
- [ ] User understands what was changed and knows next steps

</success_criteria>
