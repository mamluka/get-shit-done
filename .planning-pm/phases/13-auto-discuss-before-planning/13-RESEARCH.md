# Phase 13: Auto-Discuss Before Planning - Research

**Researched:** 2026-02-12
**Domain:** Workflow orchestration and conditional user prompting
**Confidence:** HIGH

## Summary

Phase 13 integrates the existing `/gsd:discuss-phase` workflow into the `/gsd:plan-phase` auto-advance loop. The core challenge is detecting when CONTEXT.md is missing and prompting the user to either gather context through interactive discussion or proceed directly to planning. This requires minimal new code — primarily workflow logic changes in plan-phase.md to gate planning on a discuss/skip decision.

The implementation leverages existing infrastructure: `has_context` flag from `gsd-tools.js init plan-phase`, AskUserQuestion for user prompting, and the fully-functional discuss-phase workflow. The key insight is that discuss-phase already produces CONTEXT.md that downstream agents (researcher, planner, checker) consume — we're just making it opt-in before each phase rather than a separate manual command.

**Primary recommendation:** Add a new step 3b in plan-phase.md workflow between "Load CONTEXT.md" (step 4) and "Mark Phase In Progress" (step 4b). Gate on `has_context === false` and use AskUserQuestion to offer "Discuss phase context" or "Plan directly". If discuss is chosen, spawn discuss-phase workflow in-process, wait for CONTEXT.md creation, reload init context with `--include context`, then proceed to planning.

## Standard Stack

### Core (Already Exists)

| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| `gsd-tools.js init plan-phase` | get-shit-done/bin/gsd-tools.js | Provides `has_context` flag and context_content loading | Centralized phase initialization used by all phase operations |
| `discuss-phase.md` workflow | get-shit-done/workflows/discuss-phase.md | Interactive context gathering with AskUserQuestion | Already production-ready, generates CONTEXT.md consumed by downstream agents |
| `AskUserQuestion` tool | Framework built-in | User prompting with options | Standard tool for all decision gates in GSD workflows |
| `Task()` function | Framework built-in | Spawning sub-workflows in-process | Used across all multi-agent workflows (new-project, new-milestone, plan-phase) |

### Supporting

| Component | Location | Purpose | When to Use |
|-----------|----------|---------|-------------|
| `context_content` from init | gsd-tools.js `--include context` | Pre-loaded CONTEXT.md file contents | Pass to researcher, planner, checker agents after discussion completes |
| discuss-phase command | commands/gsd/discuss-phase.md | Command metadata for discuss workflow | Reference for spawning via Task() |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-process discuss spawn | Manual user invocation | Loses auto-advance benefit — user must remember to run /gsd:discuss-phase before /gsd:plan-phase |
| Forced discussion for all phases | Opt-in prompt | Annoys users who have clear context mentally or via external docs |
| Custom prompting logic | Existing discuss-phase workflow | Would duplicate 400+ lines of gray-area analysis, multiselect, and context writing logic |

**Installation:**
No new dependencies. Uses existing workflow infrastructure.

## Architecture Patterns

### Recommended Workflow Modification

```
plan-phase.md flow (BEFORE):
1. Initialize
2. Parse and Normalize Arguments
3. Validate Phase
4. Load CONTEXT.md (from init --include context)
4b. Mark Phase In Progress
5. Handle Research
...

plan-phase.md flow (AFTER):
1. Initialize
2. Parse and Normalize Arguments
3. Validate Phase
4. Load CONTEXT.md (from init --include context)
3b. GATE: Offer Discussion (NEW STEP)
4b. Mark Phase In Progress
5. Handle Research
...
```

### Pattern 1: Conditional Discussion Gate

**What:** Check if CONTEXT.md exists before planning. If missing, prompt user to discuss or skip.

**When to use:** After phase validation (step 3) but before marking phase in-progress (step 4b).

**Example:**

```markdown
## 3b. Offer Discussion (if CONTEXT.md missing)

**Skip if:** `has_context` is true (from init) OR user ran `/gsd:plan-phase --skip-discussion`

**If CONTEXT.md missing:**

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {X} CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No context file found for Phase {X}.

Discussion helps clarify:
- UI/UX decisions you care about
- Behavior preferences
- Specific ideas or references
- Areas where you want control vs Claude's discretion

This is OPTIONAL — skip if you're ready to plan directly.
```

Use AskUserQuestion:
- header: "Phase {X} Context"
- question: "Discuss phase context before planning?"
- options:
  - "Discuss context" — Run interactive discussion to capture decisions
  - "Plan directly" — Skip to planning (Claude uses best judgment)

**If "Discuss context":**

Spawn discuss-phase workflow:

```markdown
Task(
  prompt="First, read ~/.claude/get-shit-done/workflows/discuss-phase.md for your role and instructions.\n\n<objective>Extract implementation decisions that downstream agents need for Phase {phase_number}: {phase_name}...</objective>",
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Discuss Phase {phase} context"
)
```

After Task() returns, reload init to get new context_content:

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init plan-phase "${PHASE}" --include state,roadmap,requirements,context,research,verification,uat,planning-status)
CONTEXT_CONTENT=$(echo "$INIT" | jq -r '.context_content // empty')
```

Then proceed to step 4b (mark in progress).

**If "Plan directly":**

Set `CONTEXT_CONTENT=""` and proceed to step 4b.
```

### Pattern 2: Reloading Init After Sub-Workflow

**What:** After spawning a sub-workflow that creates artifacts (like discuss-phase creating CONTEXT.md), re-run the init command to pick up the new file contents.

**When to use:** When downstream steps need the sub-workflow's output (research needs context_content, planner needs context_content).

**Example:**

```bash
# After discuss-phase Task() completes
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init plan-phase "${PHASE}" --include context)
HAS_CONTEXT=$(echo "$INIT" | jq -r '.has_context')
CONTEXT_CONTENT=$(echo "$INIT" | jq -r '.context_content // empty')

if [ "$HAS_CONTEXT" = "false" ]; then
  echo "Warning: CONTEXT.md still missing after discussion"
fi
```

### Anti-Patterns to Avoid

- **Double-prompting:** Don't ask "Discuss?" and then ask "Skip discussion?" — single gate only
- **Blocking without option:** Don't force discussion for all phases — some are clear-cut (auth, config)
- **Ignoring existing context:** Always check `has_context` from init — don't prompt if CONTEXT.md exists
- **Manual file reading:** Don't `cat CONTEXT.md` after discussion — use `--include context` reload pattern

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Context gathering UI | Custom prompt sequence | discuss-phase.md workflow | 400+ lines of gray-area analysis, multiselect, probing depth already battle-tested |
| CONTEXT.md parsing | Custom markdown reader | `context_content` from init --include | gsd-tools.js handles all file loading with error handling |
| Discussion spawn | Direct file writes + manual coordination | Task() with discuss-phase workflow | Framework handles subagent lifecycle, error propagation, return values |

**Key insight:** Discuss-phase workflow is fully autonomous — spawning it with Task() and waiting for completion is simpler than reimplementing any part of its logic inline.

## Common Pitfalls

### Pitfall 1: Forgetting to Reload Init After Discussion

**What goes wrong:** Context_content remains null even though CONTEXT.md was created by discuss-phase.

**Why it happens:** The initial `init plan-phase` call in step 1 runs before CONTEXT.md exists. After discuss-phase creates it, the old init JSON still has `context_content: null`.

**How to avoid:** After discuss-phase Task() returns, immediately re-run `init plan-phase --include context` and extract the new `context_content` value.

**Warning signs:** Researcher or planner says "no context provided" despite user completing discussion.

### Pitfall 2: Prompting When CONTEXT.md Exists

**What goes wrong:** User is asked "Discuss context?" even though they already ran /gsd:discuss-phase separately.

**Why it happens:** Not checking the `has_context` flag from init before displaying the discussion gate.

**How to avoid:** At the top of step 3b, check `if [ "$HAS_CONTEXT" = "true" ]; then skip to 4b; fi`

**Warning signs:** User complains "I already discussed this phase" or sees duplicate discussion prompts.

### Pitfall 3: No Escape Hatch for Users Who Want Context Later

**What goes wrong:** User selects "Plan directly", then realizes mid-planning they want to discuss context, but there's no way back.

**Why it happens:** One-time gate with no recovery path.

**How to avoid:** Document that users can always run `/gsd:discuss-phase {N}` manually before or during planning to add/update CONTEXT.md. The "Plan directly" option is not destructive — it just means "use empty context for now".

**Warning signs:** User asks "can I go back and add context?" after choosing "Plan directly".

### Pitfall 4: Spawning discuss-phase Without Proper Phase Context

**What goes wrong:** Discuss-phase workflow errors because it doesn't have phase_dir, phase_name, etc.

**Why it happens:** Task() prompt doesn't include all the context discuss-phase.md expects.

**How to avoid:** Use the same init JSON values (phase_number, phase_name, goal from roadmap) that plan-phase already has, and pass them in the Task() prompt's `<context>` section. Discuss-phase.md workflow expects a phase number as `$ARGUMENTS`.

**Warning signs:** Discuss-phase returns "Phase not found" or similar error.

## Code Examples

Verified patterns from existing workflows:

### Spawning Sub-Workflow with Task()

Source: get-shit-done/workflows/plan-phase.md (researcher spawn, lines 123-129)

```markdown
Task(
  prompt="First, read ~/.claude/agents/gsd-phase-researcher.md for your role and instructions.\n\n" + research_prompt,
  subagent_type="general-purpose",
  model="{researcher_model}",
  description="Research Phase {phase}"
)
```

Adapt for discuss-phase:

```markdown
Task(
  prompt="First, read ~/.claude/get-shit-done/workflows/discuss-phase.md for your role and instructions.\n\n<objective>Extract implementation decisions for Phase {phase_number}: {phase_name}...</objective>\n\n<context>Phase number: {phase_number}\n\nLoad project state:\n@.planning/STATE.md\n\nLoad roadmap:\n@.planning/ROADMAP.md\n</context>",
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Discuss Phase {phase} context"
)
```

### Using AskUserQuestion for Binary Gate

Source: get-shit-done/workflows/complete-milestone.md (Notion sync prompt, lines 348-355)

```markdown
Use AskUserQuestion:
- header: "Sync to Notion?"
- question: "Upload planning docs to Notion for stakeholder review?"
- options:
  - "Sync now" — Push all .planning/ docs to Notion
  - "Skip" — Keep docs local only
```

Adapt for discuss gate:

```markdown
Use AskUserQuestion:
- header: "Phase {X} Context"
- question: "Discuss phase context before planning?"
- options:
  - "Discuss context" — Run interactive discussion
  - "Plan directly" — Skip to planning
```

### Checking has_context Flag from Init

Source: get-shit-done/workflows/discuss-phase.md (existing context check, lines 131-148)

```bash
# has_context from init JSON
HAS_CONTEXT=$(echo "$INIT" | jq -r '.has_context')

if [ "$HAS_CONTEXT" = "true" ]; then
  # CONTEXT.md exists — offer update/view/skip
  # ...
fi
```

Use in plan-phase step 3b:

```bash
# Extract from init (step 1)
HAS_CONTEXT=$(echo "$INIT" | jq -r '.has_context')

# Skip discussion gate if context exists
if [ "$HAS_CONTEXT" = "true" ]; then
  echo "Using phase context from: ${PHASE_DIR}/*-CONTEXT.md"
  # Proceed to step 4b
fi
```

### Reloading Init After File Creation

Source: get-shit-done/workflows/new-project.md (codebase map check after creation, lines 822-826)

```bash
# After map-codebase creates structure.md
INIT_AFTER=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init new-project)
HAS_MAP=$(echo "$INIT_AFTER" | jq -r '.has_codebase_map')
```

Adapt for context reload:

```bash
# After discuss-phase Task() completes
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init plan-phase "${PHASE}" --include context)
CONTEXT_CONTENT=$(echo "$INIT" | jq -r '.context_content // empty')
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual discuss-phase invocation | Auto-prompt before planning | Phase 13 (v1.2) | Users don't forget to gather context, plan quality improves |
| CONTEXT.md as optional side-band | CONTEXT.md integrated into auto-advance loop | Phase 13 (v1.2) | Context becomes first-class citizen in planning flow |

**Deprecated/outdated:**
- None — discuss-phase is new in v1.2, no legacy patterns to replace

## Open Questions

1. **Should --skip-discussion flag exist?**
   - What we know: User can select "Plan directly" in the prompt
   - What's unclear: Whether power users want to bypass the prompt entirely via CLI flag
   - Recommendation: Add `--skip-discussion` flag for consistency with `--skip-research` and `--skip-verify`. Check it before displaying the gate in step 3b.

2. **What if discuss-phase fails mid-way?**
   - What we know: Task() returns when subagent completes or errors
   - What's unclear: How to handle partial CONTEXT.md creation (user started discussion, answered 2 questions, then interrupted)
   - Recommendation: Treat partial CONTEXT.md same as missing — `has_context` will be false if file doesn't exist. If it exists (even partial), `has_context` will be true and gate is skipped. User can run `/gsd:discuss-phase {N}` manually to update/complete it.

3. **Should discussion auto-advance to planning?**
   - What we know: plan-phase auto-advances to next phase after completion (step 14)
   - What's unclear: Whether discuss-phase should auto-trigger planning after CONTEXT.md creation
   - Recommendation: NO. Discuss-phase remains standalone — user might want to review/edit CONTEXT.md before planning. Plan-phase gate ensures discussion happens when needed, but doesn't force immediate planning.

## Sources

### Primary (HIGH confidence)

- get-shit-done/workflows/plan-phase.md — Current auto-advance loop structure, step numbering, agent spawn patterns
- get-shit-done/workflows/discuss-phase.md — Context gathering workflow, AskUserQuestion usage, CONTEXT.md output format
- get-shit-done/bin/gsd-tools.js — `init plan-phase` command implementation, has_context flag, context_content loading via --include
- commands/gsd/plan-phase.md — Command entry point, argument parsing, flag handling
- get-shit-done/references/questioning.md — AskUserQuestion best practices, option design guidance

### Secondary (MEDIUM confidence)

- get-shit-done/workflows/complete-milestone.md — AskUserQuestion example for binary gates (Notion sync prompt)
- get-shit-done/workflows/new-project.md — Task() spawn patterns, init reload after sub-workflow creates artifacts
- .planning/REQUIREMENTS.md — PLAN-01 and PLAN-02 requirements for this phase
- .planning/STATE.md — Prior decision: "Auto-discuss as opt-in before planning"

### Tertiary (LOW confidence)

None — all findings verified against existing code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All components exist in production, no new dependencies
- Architecture: HIGH — Patterns verified against 3+ existing workflows (new-project, plan-phase, complete-milestone)
- Pitfalls: HIGH — Based on actual bugs/UX issues from similar patterns in new-project and plan-phase

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days — stable workflow patterns, no external dependencies)
