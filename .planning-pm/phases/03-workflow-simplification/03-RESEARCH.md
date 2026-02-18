# Phase 3: Workflow Simplification - Research

**Researched:** 2026-02-10
**Domain:** Workflow automation, command deprecation, phase progression
**Confidence:** HIGH

## Summary

Phase 3 removes execution workflows from GSD (execute-phase, execute-plan, verify-phase) and implements automatic phase progression when a PM marks a phase complete. This transforms GSD from a developer execution tool into a PM-focused planning tool.

The core challenge is surgical removal of execution without breaking existing commands that reference execution concepts, plus implementing auto-advance logic that validates completeness before progressing. The implementation is straightforward Node.js CLI refactoring with validation hooks — no external dependencies needed.

**Primary recommendation:** Use command tombstoning for deprecated commands (helpful redirects rather than deletion), implement auto-advance as a state transition hook in `phase complete`, and create edit-phase as a specialized orchestrator that routes to existing agents based on artifact type.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 18+ | CLI runtime | Already in use for gsd-tools.js |
| fs (native) | Node stdlib | File operations | Zero dependencies, synchronous ops match PathResolver pattern |
| child_process (native) | Node stdlib | Git operations | Already used in gsd-tools.js for git commits |

### Supporting
None required — all functionality uses existing GSD infrastructure (gsd-tools.js functions, existing agents).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fs/child_process | External CLI library (commander, yargs) | Adds dependencies; Phase 1 decision was zero external deps for PathResolver |
| Command tombstoning | Complete deletion | Breaking change for users who have muscle memory or scripts |
| State-based auto-advance | Event emitter pattern | Over-engineering for single trigger point |

**Installation:**
No new dependencies — phase uses existing Node.js standard library modules.

## Architecture Patterns

### Recommended Project Structure
Current structure remains unchanged — work happens in:
```
.claude/
├── commands/gsd/           # Command entry points
│   ├── execute-phase.md    # TO BE TOMBSTONED
│   ├── verify-work.md      # TO BE TOMBSTONED
│   └── edit-phase.md       # NEW: Revise planning artifacts
├── get-shit-done/
│   ├── bin/gsd-tools.js    # Add auto-advance logic
│   ├── workflows/
│   │   ├── execute-phase.md  # TO BE TOMBSTONED
│   │   ├── execute-plan.md   # TO BE TOMBSTONED
│   │   ├── verify-phase.md   # TO BE TOMBSTONED
│   │   └── edit-phase.md     # NEW: Edit artifact workflow
│   └── agents/
│       ├── gsd-executor.md   # TO BE TOMBSTONED
│       └── gsd-verifier.md   # TO BE TOMBSTONED
```

### Pattern 1: Command Tombstoning
**What:** Replace removed command with helpful redirect message instead of deleting
**When to use:** Deprecating commands that users might still try to invoke

**Example:**
```markdown
---
name: gsd:execute-phase
description: [REMOVED] This command no longer exists
---
<objective>
This command has been removed in the planning-only version of GSD.
</objective>

<redirect>
# Command Removed: /gsd:execute-phase

This command was part of the execution workflow, which has been removed.

**GSD is now planning-only.** Plans created with `/gsd:plan-phase` are implementation specifications for your engineering team, not executable instructions for Claude.

## What to do instead

**If you want to plan a phase:**
`/gsd:plan-phase {N}`

**If you want to mark a phase complete:**
`/gsd:complete-phase {N}`
(This will auto-advance to planning the next phase)

**If you want to revise planning artifacts:**
`/gsd:edit-phase {N}`

---

See `/gsd:help` for available commands.
</redirect>
```

### Pattern 2: State Transition Hooks
**What:** Auto-advance logic triggered by state change (phase complete) rather than explicit command
**When to use:** Ensuring workflow progression without requiring PM to know next step

**Flow:**
```
PM: /gsd:complete-phase 3
  ↓
gsd-tools.js: phase complete <phase>
  ↓
1. Validate completeness (plans exist, requirements mapped)
2. Mark phase complete in ROADMAP.md
3. Update STATE.md position
4. Check if more phases exist
  ↓
  YES → Auto-advance: Spawn plan-phase for next phase
  NO → Prompt for milestone complete
```

**Implementation location:** `cmdPhaseComplete()` in gsd-tools.js (function already exists at line ~2930)

### Pattern 3: Artifact-Aware Edit Routing
**What:** Single edit-phase command that routes to appropriate agent based on what user wants to edit
**When to use:** PM wants to revise PLAN, RESEARCH, CONTEXT, or requirements mapping

**Routing logic:**
```javascript
// In edit-phase workflow
const artifact = determineArtifact(userInput); // "plan", "research", "context", "requirements"

switch(artifact) {
  case "plan":
    // Spawn gsd-planner in revision mode
    // Pass existing PLAN.md + user's requested changes
    break;
  case "research":
    // Spawn gsd-phase-researcher with --update flag
    // Pass existing RESEARCH.md + new information/corrections
    break;
  case "context":
    // Spawn discuss-phase workflow
    // Load existing CONTEXT.md for revision
    break;
  case "requirements":
    // Direct file edit with validation
    // Update requirements mapping in REQUIREMENTS.md
    break;
}
```

### Pattern 4: Completeness Validation
**What:** Before auto-advancing, verify phase is truly complete
**When to use:** Every phase complete operation

**Checks:**
```javascript
function validatePhaseComplete(cwd, phaseNum) {
  const phaseDir = findPhaseDir(cwd, phaseNum);

  // 1. At least one PLAN exists
  const plans = glob(`${phaseDir}/*-PLAN.md`);
  if (plans.length === 0) {
    return { valid: false, reason: "No plans created for this phase" };
  }

  // 2. Requirements mapped (if REQUIREMENTS.md exists)
  const requirementsContent = readFileSync('.planning/REQUIREMENTS.md');
  const phaseReqs = extractPhaseRequirements(requirementsContent, phaseNum);
  if (phaseReqs.length > 0) {
    // Check all requirements have been addressed in plans
    const unmappedReqs = findUnmappedRequirements(phaseReqs, plans);
    if (unmappedReqs.length > 0) {
      return { valid: false, reason: `${unmappedReqs.length} requirements not addressed`, unmapped: unmappedReqs };
    }
  }

  return { valid: true };
}
```

### Anti-Patterns to Avoid
- **Silent deletions:** Don't delete execution commands without tombstones — causes confusion for existing users
- **Async validation:** Keep completeness checks synchronous to match PathResolver pattern from Phase 1
- **Over-validation:** Don't require SUMMARYs or VERIFICATION reports (execution artifacts) — this is planning-only now
- **Hard blocks:** If validation finds minor issues, warn but allow override — PM knows their context

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Command routing | Custom argument parser | Existing main() switch in gsd-tools.js | Already handles 50+ commands, well-tested |
| Phase detection | Regex parsing ROADMAP.md | `cmdRoadmapGetPhase()` in gsd-tools.js | Handles edge cases (decimal phases, formatting) |
| Git operations | Direct `git` CLI calls | `execGit()` wrapper in gsd-tools.js | Handles errors, normalizes output |
| File path resolution | String concatenation | PathResolver pattern from Phase 1 | Handles project context, version folders |

**Key insight:** GSD already has robust infrastructure from Phases 1-2. This phase is primarily orchestration and removal, not new primitives.

## Common Pitfalls

### Pitfall 1: Breaking Existing Workflows
**What goes wrong:** Deleting execution commands breaks references in existing documentation, user scripts, or muscle memory
**Why it happens:** Treating removal as "just delete the files"
**How to avoid:** Use tombstone pattern — keep command files but replace with helpful redirects
**Warning signs:** User confusion, "command not found" errors without guidance

### Pitfall 2: Auto-Advance Without Validation
**What goes wrong:** PM marks phase complete, system auto-advances, but phase had no plans or incomplete requirements
**Why it happens:** Trusting STATE.md progression without checking actual artifacts
**How to avoid:** Implement `validatePhaseComplete()` before allowing state transition
**Warning signs:** Empty phase directories, requirements gaps discovered later

### Pitfall 3: Last Phase Edge Case
**What goes wrong:** Auto-advance tries to plan "Phase 6" when there are only 5 phases
**Why it happens:** Not checking if current phase is the last phase
**How to avoid:** Check phase count from ROADMAP before advancing
**Warning signs:** "Phase not found" errors after marking last phase complete

### Pitfall 4: Circular Dependencies in Edit Flow
**What goes wrong:** edit-phase tries to spawn agents that themselves depend on edit-phase
**Why it happens:** Overly complex routing or recursive agent spawning
**How to avoid:** Edit-phase is a terminal orchestrator — it spawns existing agents (planner, researcher, discuss-phase) which already have their own workflows
**Warning signs:** Stack overflow, infinite loops, timeout errors

### Pitfall 5: Over-Engineering Auto-Advance
**What goes wrong:** Implementing complex event systems, state machines, or async queues for auto-advance
**Why it happens:** Treating state transition as complex async problem
**How to avoid:** Auto-advance is a simple synchronous hook: validate → update state → spawn next command. Single trigger point (phase complete), single action (plan next phase).
**Warning signs:** Event emitters, promise chains, worker threads for what should be 20 lines of code

## Code Examples

Verified patterns from GSD codebase:

### Command Routing Pattern
```javascript
// Source: gsd-tools.js main() function (line ~4214)
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) { /* ... */ }

  const command = args[0];
  const subcommand = args[1];
  const raw = args.includes('--raw');

  switch (command) {
    case 'phase':
      switch (subcommand) {
        case 'complete':
          return cmdPhaseComplete(cwd, args[2], raw);
        // ... other phase subcommands
      }
      break;
    // ... other commands
  }
}
```

### Phase Complete with Validation (Current)
```javascript
// Source: gsd-tools.js cmdPhaseComplete() (line ~2930)
function cmdPhaseComplete(cwd, phaseNum, raw) {
  // 1. Find phase
  const result = findPhaseInternal(cwd, phaseNum);
  if (!result.found) { return error(`Phase ${phaseNum} not found`); }

  // 2. Load roadmap
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  let roadmapContent = fs.readFileSync(roadmapPath, 'utf8');

  // 3. Mark complete in roadmap
  const completionDate = new Date().toISOString().split('T')[0];
  // ... update logic ...

  // 4. Update STATE.md
  // ... state update logic ...

  return output({ success: true, phase: phaseNum }, raw);
}
```

### Auto-Advance Addition (Pattern)
```javascript
// Addition to cmdPhaseComplete() after step 4
function cmdPhaseComplete(cwd, phaseNum, raw) {
  // ... existing validation and update logic ...

  // 5. Check completeness before auto-advance
  const validation = validatePhaseComplete(cwd, phaseNum);
  if (!validation.valid) {
    console.error(`⚠️  Warning: ${validation.reason}`);
    console.error('Phase marked complete, but consider addressing these issues before advancing.');
  }

  // 6. Check if more phases exist
  const roadmapAnalysis = cmdRoadmapAnalyze(cwd, true); // raw=true for JSON
  const allPhases = roadmapAnalysis.phases;
  const currentIndex = allPhases.findIndex(p => p.phase === phaseNum);
  const nextPhase = allPhases[currentIndex + 1];

  if (nextPhase) {
    console.log(`\n✓ Phase ${phaseNum} complete. Auto-advancing to phase ${nextPhase.phase}...\n`);
    // Note: Cannot directly spawn Task() from CLI tool
    // Return structured data indicating auto-advance should happen
    return output({
      success: true,
      phase: phaseNum,
      auto_advance: true,
      next_phase: nextPhase.phase,
      message: `Use /gsd:plan-phase ${nextPhase.phase} to continue`
    }, raw);
  } else {
    console.log(`\n✓ Phase ${phaseNum} complete. This was the last phase.\n`);
    return output({
      success: true,
      phase: phaseNum,
      milestone_complete: true,
      message: 'Use /gsd:complete-milestone to finalize'
    }, raw);
  }
}
```

### Edit-Phase Artifact Detection
```javascript
// Pattern for edit-phase workflow
function determineArtifactToEdit(phase, userRequest) {
  // Check what artifacts exist
  const phaseDir = findPhaseInternal(cwd, phase).dir;
  const hasPlans = glob(`${phaseDir}/*-PLAN.md`).length > 0;
  const hasResearch = fs.existsSync(path.join(phaseDir, `${phase}-RESEARCH.md`));
  const hasContext = fs.existsSync(path.join(phaseDir, `${phase}-CONTEXT.md`));

  // Parse user intent
  if (userRequest.includes('plan') || userRequest.includes('task')) {
    if (!hasPlans) return { error: 'No plans exist yet. Use /gsd:plan-phase first.' };
    return { artifact: 'plan', files: glob(`${phaseDir}/*-PLAN.md`) };
  }

  if (userRequest.includes('research')) {
    if (!hasResearch) return { error: 'No research exists. Use /gsd:plan-phase --research first.' };
    return { artifact: 'research', file: path.join(phaseDir, `${phase}-RESEARCH.md`) };
  }

  // ... similar for context, requirements

  // Default: show menu
  return { artifact: 'menu', available: { hasPlans, hasResearch, hasContext } };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Execution workflows | Planning-only | This phase (3) | Fundamental shift: Claude generates specs, not code |
| Manual phase progression | Auto-advance | This phase (3) | Reduces PM friction, no need to remember next command |
| Command deletion | Command tombstoning | Industry standard (2020s) | User-friendly deprecation with guidance |
| Global git operations | Project-scoped branches | Phase 2 | Enables multi-project isolation |

**Deprecated/outdated:**
- `execute-phase`: Replaced by PM handoff to engineering team
- `execute-plan`: Replaced by PM handoff to engineering team
- `verify-phase`: Replaced by PM review of planning artifacts
- `verify-work`: Replaced by PM review of planning artifacts
- `gsd-executor` agent: No longer needed for planning-only workflow
- `gsd-verifier` agent: No longer needed for planning-only workflow

## Open Questions

1. **Should edit-phase support revision of completed phases across milestone boundaries?**
   - What we know: PathResolver supports version folders from Phase 1
   - What's unclear: Whether editing v1 artifacts while in v2 causes confusion
   - Recommendation: Initially restrict editing to current milestone, can expand in Phase 4 UX Polish if needed

2. **How should auto-advance behave if plan-phase itself fails?**
   - What we know: Task() can return failure status
   - What's unclear: Should we retry, skip, or halt
   - Recommendation: Present failure to PM with options: retry planning, mark as manual, or skip phase

3. **Should complete-phase validate that phase goal was achieved?**
   - What we know: Planning-only means no VERIFICATION.md will exist
   - What's unclear: What validation makes sense for planning artifacts
   - Recommendation: Check for plans + requirements mapping, but don't validate technical correctness (that's engineering's job)

## Sources

### Primary (HIGH confidence)
- GSD codebase: `.claude/get-shit-done/bin/gsd-tools.js` - Reviewed command routing, phase operations, state management functions
- GSD codebase: `.claude/get-shit-done/workflows/execute-phase.md` - Analyzed execution flow to understand what's being removed
- GSD codebase: `.claude/get-shit-done/workflows/plan-phase.md` - Reviewed planning orchestration to understand auto-advance integration point
- Phase 1 decisions: PathResolver pattern (zero dependencies, synchronous operations) - Documented in STATE.md and 01-RESEARCH.md

### Secondary (MEDIUM confidence)
- Node.js documentation: fs, child_process modules - Standard library APIs used throughout GSD
- Git command reference: Existing `execGit()` wrapper pattern from gsd-tools.js

### Tertiary (LOW confidence)
- None - All findings verified against actual GSD codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already in use, no new dependencies
- Architecture: HIGH - Patterns extracted from existing GSD code
- Pitfalls: MEDIUM-HIGH - Based on codebase analysis and common refactoring pitfalls (not GSD-specific experience)

**Research date:** 2026-02-10
**Valid until:** 2026-03-12 (30 days - stable domain, internal refactoring)
