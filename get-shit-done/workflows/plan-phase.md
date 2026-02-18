<purpose>
Create executable phase prompts (PLAN.md files) for a roadmap phase with integrated research and verification. Default flow: Research (if needed) -> Plan -> Verify -> Done. Orchestrates gsd-phase-researcher, gsd-planner, and gsd-plan-checker agents with a revision loop (max 3 iterations).
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.

@~/.claude/get-shit-done/references/ui-brand.md
</required_reading>

<process>

## 1. Initialize

Load all context in one call (include file contents to avoid redundant reads):

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init plan-phase "$PHASE" --include state,roadmap,requirements,context,research,verification,uat,planning-status)
```

Parse JSON for: `researcher_model`, `planner_model`, `checker_model`, `research_enabled`, `plan_checker_enabled`, `commit_docs`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `has_research`, `has_context`, `has_plans`, `plan_count`, `planning_exists`, `roadmap_exists`.

**File contents (from --include):** `state_content`, `roadmap_content`, `requirements_content`, `context_content`, `research_content`, `verification_content`, `uat_content`, `planning_status_content`. These are null if files don't exist.

**If `planning_exists` is false:** Error — run `/gsd-pm:new-project` first.

**If `planning_status_content` is null (PLANNING-STATUS.md missing):**
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js planning-status init
```

## 2. Parse and Normalize Arguments

Extract from $ARGUMENTS: phase number (integer or decimal like `2.1`), flags (`--research`, `--skip-research`, `--gaps`, `--skip-verify`, `--skip-discussion`).

**If no phase number:** Detect next unplanned phase from roadmap.

**If `phase_found` is false:** Validate phase exists in ROADMAP.md. If valid, create the directory using `phase_slug` and `padded_phase` from init:
```bash
mkdir -p ".planning-pm/phases/${padded_phase}-${phase_slug}"
```

**Existing artifacts from init:** `has_research`, `has_plans`, `plan_count`.

## 3. Validate Phase

```bash
PHASE_INFO=$(node ~/.claude/get-shit-done/bin/gsd-tools.js roadmap get-phase "${PHASE}")
```

**If `found` is false:** Error with available phases. **If `found` is true:** Extract `phase_number`, `phase_name`, `goal` from JSON.

## 4. Load CONTEXT.md

Use `context_content` from init JSON (already loaded via `--include context`).

**CRITICAL:** Use `context_content` from INIT — pass to researcher, planner, checker, and revision agents.

If `context_content` is not null, display: `Using phase context from: ${PHASE_DIR}/*-CONTEXT.md`

## 3b. Offer Discussion (if CONTEXT.md missing)

**Skip this step entirely if any of these are true:**
- `has_context` is true (CONTEXT.md already exists — from init JSON)
- `--skip-discussion` flag was passed
- `--gaps` flag was passed (gap closure mode skips discussion)

**If CONTEXT.md is missing (has_context is false) and no skip flags:**

Display this banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {X} CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No context file found for Phase {X}: {Name}.

Discussion helps clarify:
• UI/UX decisions you care about
• Behavior preferences
• Areas where you want control vs Claude's discretion

This is OPTIONAL — skip if you're ready to plan directly.
```

Then use AskUserQuestion:
- header: "Phase {X} Context"
- question: "Discuss phase context before planning?"
- options:
  - "Discuss context" — Run interactive discussion to capture decisions
  - "Plan directly" — Skip to planning (Claude uses best judgment)

**If "Discuss context":**

Spawn the discuss-phase workflow via Task():

```
Task(
  prompt="First, read ~/.claude/get-shit-done/workflows/discuss-phase.md for your role and instructions.\n\n<context>\nPhase number: {phase_number}\n\nLoad project state:\n@.planning-pm/STATE.md\n\nLoad roadmap:\n@.planning-pm/ROADMAP.md\n</context>",
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Discuss Phase {phase} context"
)
```

After Task() returns, **reload init** to pick up the newly-created CONTEXT.md:

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init plan-phase "${PHASE}" --include state,roadmap,requirements,context,research,verification,uat,planning-status)
```

Extract the updated `context_content` from the reloaded INIT JSON. This is critical — the original init from step 1 will have `context_content: null` because CONTEXT.md didn't exist yet. The reload ensures all downstream agents (researcher, planner, checker) receive the discussion output.

If `has_context` is still false after reload, log a warning: `"Warning: CONTEXT.md not created during discussion — proceeding without context"`

Display: `Using phase context from: ${PHASE_DIR}/*-CONTEXT.md`

**If "Plan directly":**

Proceed to step 4b without any context content. No warning needed — this is a valid user choice.

## 4b. Mark Phase In Progress

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js planning-status mark-in-progress --phase "${PHASE}"
```

## 5. Handle Research

**Skip if:** `--gaps` flag, `--skip-research` flag, or `research_enabled` is false (from init) without `--research` override.

**If `has_research` is true (from init) AND no `--research` flag:** Use existing, skip to step 6.

**If RESEARCH.md missing OR `--research` flag:**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESEARCHING PHASE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning researcher...
```

### Spawn gsd-phase-researcher

```bash
PHASE_DESC=$(node ~/.claude/get-shit-done/bin/gsd-tools.js roadmap get-phase "${PHASE}" | jq -r '.section')
# Use requirements_content from INIT (already loaded via --include requirements)
REQUIREMENTS=$(echo "$INIT" | jq -r '.requirements_content // empty' | grep -A100 "## Requirements" | head -50)
STATE_SNAP=$(node ~/.claude/get-shit-done/bin/gsd-tools.js state-snapshot)
# Extract decisions from state-snapshot JSON: jq '.decisions[] | "\(.phase): \(.summary) - \(.rationale)"'
```

Research prompt:

```markdown
<objective>
Research how to implement Phase {phase_number}: {phase_name}
Answer: "What do I need to know to PLAN this phase well?"
</objective>

<phase_context>
IMPORTANT: If CONTEXT.md exists below, it contains user decisions from /gsd-pm:discuss-phase.
- **Decisions** = Locked — research THESE deeply, no alternatives
- **Claude's Discretion** = Freedom areas — research options, recommend
- **Deferred Ideas** = Out of scope — ignore

{context_content}
</phase_context>

<additional_context>
**Phase description:** {phase_description}
**Requirements:** {requirements}
**Prior decisions:** {decisions}
</additional_context>

<output>
Write to: {phase_dir}/{phase}-RESEARCH.md
</output>
```

```
Task(
  prompt="First, read ~/.claude/agents/gsd-phase-researcher.md for your role and instructions.\n\n" + research_prompt,
  subagent_type="general-purpose",
  model="{researcher_model}",
  description="Research Phase {phase}"
)
```

### Handle Researcher Return

- **`## RESEARCH COMPLETE`:** Display confirmation, continue to step 6
- **`## RESEARCH BLOCKED`:** Display blocker, offer: 1) Provide context, 2) Skip research, 3) Abort

## 6. Check Existing Plans

```bash
ls "${PHASE_DIR}"/*-PLAN.md 2>/dev/null
```

**If exists:** Offer: 1) Add more plans, 2) View existing, 3) Replan from scratch.

## 7. Use Context Files from INIT

All file contents are already loaded via `--include` in step 1 (`@` syntax doesn't work across Task() boundaries):

```bash
# Extract from INIT JSON (no need to re-read files)
STATE_CONTENT=$(echo "$INIT" | jq -r '.state_content // empty')
ROADMAP_CONTENT=$(echo "$INIT" | jq -r '.roadmap_content // empty')
REQUIREMENTS_CONTENT=$(echo "$INIT" | jq -r '.requirements_content // empty')
RESEARCH_CONTENT=$(echo "$INIT" | jq -r '.research_content // empty')
VERIFICATION_CONTENT=$(echo "$INIT" | jq -r '.verification_content // empty')
UAT_CONTENT=$(echo "$INIT" | jq -r '.uat_content // empty')
CONTEXT_CONTENT=$(echo "$INIT" | jq -r '.context_content // empty')
```

## 8. Spawn gsd-planner Agent

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PLANNING PHASE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning planner...
```

Planner prompt:

```markdown
<planning_context>
**Phase:** {phase_number}
**Mode:** {standard | gap_closure}

**Project State:** {state_content}
**Roadmap:** {roadmap_content}
**Requirements:** {requirements_content}

**Phase Context:**
IMPORTANT: If context exists below, it contains USER DECISIONS from /gsd-pm:discuss-phase.
- **Decisions** = LOCKED — honor exactly, do not revisit
- **Claude's Discretion** = Freedom — make implementation choices
- **Deferred Ideas** = Out of scope — do NOT include

{context_content}

**Research:** {research_content}
**Gap Closure (if --gaps):** {verification_content} {uat_content}
</planning_context>

<downstream_consumer>
Output consumed by engineering team. Plans need:
- Frontmatter (wave, depends_on, files_modified, autonomous)
- Tasks in XML format
- Verification criteria
- must_haves for goal-backward verification
</downstream_consumer>

<quality_gate>
- [ ] PLAN.md files created in phase directory
- [ ] Each plan has valid frontmatter
- [ ] Tasks are specific and actionable
- [ ] Dependencies correctly identified
- [ ] Waves assigned for parallel execution
- [ ] must_haves derived from phase goal
</quality_gate>
```

```
Task(
  prompt="First, read ~/.claude/agents/gsd-planner.md for your role and instructions.\n\n" + filled_prompt,
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Plan Phase {phase}"
)
```

## 9. Handle Planner Return

- **`## PLANNING COMPLETE`:** Display plan count. If `--skip-verify` or `plan_checker_enabled` is false (from init): skip to step 13. Otherwise: step 10.
- **`## CHECKPOINT REACHED`:** Present to user, get response, spawn continuation (step 12)
- **`## PLANNING INCONCLUSIVE`:** Show attempts, offer: Add context / Retry / Manual

## 10. Spawn gsd-plan-checker Agent

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► VERIFYING PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning plan checker...
```

```bash
PLANS_CONTENT=$(cat "${PHASE_DIR}"/*-PLAN.md 2>/dev/null)
```

Checker prompt:

```markdown
<verification_context>
**Phase:** {phase_number}
**Phase Goal:** {goal from ROADMAP}

**Plans to verify:** {plans_content}
**Requirements:** {requirements_content}

**Phase Context:**
IMPORTANT: Plans MUST honor user decisions. Flag as issue if plans contradict.
- **Decisions** = LOCKED — plans must implement exactly
- **Claude's Discretion** = Freedom areas — plans can choose approach
- **Deferred Ideas** = Out of scope — plans must NOT include

{context_content}
</verification_context>

<expected_output>
- ## VERIFICATION PASSED — all checks pass
- ## ISSUES FOUND — structured issue list
</expected_output>
```

```
Task(
  prompt=checker_prompt,
  subagent_type="gsd-plan-checker",
  model="{checker_model}",
  description="Verify Phase {phase} plans"
)
```

## 11. Handle Checker Return

- **`## VERIFICATION PASSED`:** Display confirmation, proceed to step 13.
- **`## ISSUES FOUND`:** Display issues, check iteration count, proceed to step 12.

## 12. Revision Loop (Max 3 Iterations)

Track `iteration_count` (starts at 1 after initial plan + check).

**If iteration_count < 3:**

Display: `Sending back to planner for revision... (iteration {N}/3)`

```bash
PLANS_CONTENT=$(cat "${PHASE_DIR}"/*-PLAN.md 2>/dev/null)
```

Revision prompt:

```markdown
<revision_context>
**Phase:** {phase_number}
**Mode:** revision

**Existing plans:** {plans_content}
**Checker issues:** {structured_issues_from_checker}

**Phase Context:**
Revisions MUST still honor user decisions.
{context_content}
</revision_context>

<instructions>
Make targeted updates to address checker issues.
Do NOT replan from scratch unless issues are fundamental.
Return what changed.
</instructions>
```

```
Task(
  prompt="First, read ~/.claude/agents/gsd-planner.md for your role and instructions.\n\n" + revision_prompt,
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Revise Phase {phase} plans"
)
```

After planner returns -> spawn checker again (step 10), increment iteration_count.

**If iteration_count >= 3:**

Display: `Max iterations reached. {N} issues remain:` + issue list

Offer: 1) Force proceed, 2) Provide guidance and retry, 3) Abandon

## 13. Present Final Status

Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {X}: {Name}** — {N} plan(s) in {M} wave(s)

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1    | 01, 02 | [objectives] |
| 2    | 03     | [objective]  |

Research: {Completed | Used existing | Skipped}
Verification: {Passed | Passed with override | Skipped}

Then proceed directly to step 14 (auto-complete).

## 14. Auto-Complete Phase

Automatically mark the phase complete and advance — do NOT wait for the user to run `/gsd-pm:complete-phase`.

### 14a. Validate Phase

```bash
VALIDATION=$(node ~/.claude/get-shit-done/bin/gsd-tools.js phase validate "${PHASE}" --raw)
```

Parse JSON for `valid`, `warnings`, `errors`.

**If errors (valid === false):** Display errors and STOP. User must fix issues manually.

**If warnings:** Display warnings. In YOLO mode, auto-approve. In interactive mode, ask user to confirm.

**If clean:** Continue.

### 14b. Mark Phase Complete

```bash
COMPLETE_RESULT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js phase complete "${PHASE}" --raw)
```

Parse: `completed_phase`, `phase_name`, `plans_executed`, `next_phase`, `next_phase_name`, `is_last_phase`, `date`, `milestone_complete`.

**Update planning status:**

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js planning-status update --phase "${PHASE}" --status done --plans "${PLAN_COUNT}"
```

### 14c. Commit Completion

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js commit "docs(phase-${PHASE}): mark phase complete" --files .planning-pm/ROADMAP.md .planning-pm/STATE.md
```

### 14d. Route to Next

**If `milestone_complete === true`:**

Proceed to step 14e (Notion sync prompt).

### 14e. Notion Sync Prompt

First, run a fast local pre-check (no network calls) to validate Notion configuration:

```bash
NOTION_CHECK=$(node -e '
var fs = require("fs");
var path = require("path");
var configPath = path.join(process.cwd(), ".planning-pm", "config.json");
try {
  var config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  var hasKey = config.notion && config.notion.api_key && config.notion.api_key.trim().length > 0;
  var validPrefix = hasKey && (config.notion.api_key.startsWith("secret_") || config.notion.api_key.startsWith("ntn_"));
  var hasParent = config.notion && config.notion.parent_page_id;
  console.log(JSON.stringify({
    configured: hasKey && validPrefix,
    has_parent: Boolean(hasParent),
    reason: hasKey === false ? "no_api_key" : validPrefix === false ? "invalid_prefix" : "valid"
  }));
} catch (e) {
  console.log(JSON.stringify({ configured: false, reason: "no_config" }));
}
' 2>/dev/null || echo '{"configured":false,"reason":"exec_error"}')

CONFIGURED=$(echo "$NOTION_CHECK" | jq -r '.configured')
```

**If CONFIGURED is "true":**

Display this banner:
```
───────────────────────────────────────────────────────────────

## Upload Planning Docs to Notion?

Your milestone planning docs are finalized and ready to share.

This will sync .planning-pm/ markdown files to Notion:
- New files create pages
- Changed files update existing pages
- Unchanged files are skipped

───────────────────────────────────────────────────────────────
```

Then use AskUserQuestion:
- header: "Notion Sync"
- question: "Sync planning docs to Notion?"
- options:
  - "Sync now" -- Run notion-sync.js
  - "Skip" -- Continue to completion message

**If user selects "Sync now":**

Run sync as child process with inherited stdio for real-time progress visibility:
```bash
echo ""
echo "Syncing to Notion..."
echo ""

if node ~/.claude/get-shit-done/bin/notion-sync.js sync --cwd "$(pwd)"; then
  echo ""
  echo "Planning docs synced to Notion"
else
  echo ""
  echo "Sync encountered errors. You can retry with /gsd-pm:sync-notion"
  echo "Milestone completion will proceed regardless."
fi
```

**If user selects "Skip":**

Display: `Skipped Notion sync. Run /gsd-pm:sync-notion later to upload docs.`

**If CONFIGURED is "false":**

Skip silently -- no prompt, no message. Users who don't use Notion should not see irrelevant prompts.

### 14f. Display Completion Message

Display:

```
───────────────────────────────────────────────────────────────

## All Phases Complete

This was the last phase in the current roadmap.

**Options:**
- `/gsd-pm:complete-milestone` — Mark milestone as shipped and archive
- `/gsd-pm:add-phase` — Add more phases to current milestone

───────────────────────────────────────────────────────────────
```

STOP here.

**If more phases remain (`milestone_complete === false`):**

Display:

```
───────────────────────────────────────────────────────────────

## ▶ Auto-advancing to Phase {next_phase}: {next_phase_name}

───────────────────────────────────────────────────────────────
```

Then **automatically start planning the next phase** by looping back to step 1 with `PHASE` set to `next_phase`. This creates a continuous plan-complete-advance cycle until all phases are planned or the user interrupts.

<success_criteria>
- [ ] .planning-pm/ directory validated
- [ ] Phase validated against roadmap
- [ ] Phase directory created if needed
- [ ] Discussion offered when CONTEXT.md missing (step 3b)
- [ ] CONTEXT.md loaded early (step 4) and passed to ALL agents
- [ ] Research completed (unless --skip-research or --gaps or exists)
- [ ] gsd-phase-researcher spawned with CONTEXT.md
- [ ] Existing plans checked
- [ ] gsd-planner spawned with CONTEXT.md + RESEARCH.md
- [ ] Plans created (PLANNING COMPLETE or CHECKPOINT handled)
- [ ] gsd-plan-checker spawned with CONTEXT.md
- [ ] Verification passed OR user override OR max iterations with user decision
- [ ] User sees status between agent spawns
- [ ] User knows next steps
- [ ] Notion sync prompt shown when milestone complete and Notion configured (step 14e)
- [ ] Notion sync skipped silently when not configured
</success_criteria>
