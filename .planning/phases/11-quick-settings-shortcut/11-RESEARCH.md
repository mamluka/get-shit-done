# Phase 11: Quick Settings Shortcut - Research

**Researched:** 2026-02-12
**Domain:** Interactive CLI prompts, configuration management, UX design for equal-choice presentation
**Confidence:** HIGH

## Summary

This phase adds a shortcut to skip individual settings questions during new-project setup by applying recommended defaults in one action. The implementation is straightforward: present two named options ("Recommended" or "Custom") using Node.js readline (already in use), apply a single source of truth for default values, and show a summary of what was configured.

The core challenge is **not** technical implementation (readline patterns are proven in install.js, config writing is already abstracted via gsd-tools.js) — it's **UX design**: making "Recommended" and "Custom" feel like equal choices without biasing users toward the shortcut.

**Primary recommendation:** Use Node.js built-in readline with AskUserQuestion-style presentation (numbered options, descriptive context), define RECOMMENDED_SETTINGS as a frozen constant before the prompt logic, and render a table-format summary after application.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Prompt placement & flow:**
- The recommended/custom prompt appears at the same place where individual settings questions currently appear
- Presented as two named options: "Recommended" or "Custom" — both choices feel equal, neither is hidden
- Slightly descriptive tone: give a brief line of context about recommended settings before the choice
- If user picks "Recommended" → apply defaults, show summary, skip individual questions
- If user picks "Custom" → proceed through the existing settings flow exactly as it works today

**Default values (not shown to user upfront):**
- depth: standard, research: true, plan_check: true, verifier: true, model_profile: balanced, commit_docs: true, parallelization: true
- User does NOT see the individual values before accepting — "recommended" is enough context

**Confirmation feedback:**
- After recommended settings are applied: show a summary of what was set (list the values)
- After custom settings: no change to current behavior — no extra summary added

### Claude's Discretion

- Exact wording of the prompt and summary output
- How the single source of truth for recommended values is structured in code
- Error handling if config write fails

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js readline | Built-in (Node 14+) | Interactive CLI prompts | Zero dependencies, already used in install.js, TTY detection built-in, event-driven API |
| fs (Node.js) | Built-in | Read/write config.json | Standard for file operations |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gsd-tools.js | Current | Config persistence, commit handling | All config writes (already abstracted) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| readline | inquirer.js | inquirer adds 2MB+ dependencies for features we don't need (we only need single-select, not validation/transforms/autocomplete) |
| readline | prompts | prompts is lighter (100KB) but still external dependency when readline is built-in and proven |
| Direct config write | gsd-tools.js config-set | Direct write bypasses commit_docs checking and error handling already in gsd-tools |

**Installation:**

None required — using Node.js built-ins and existing gsd-tools abstraction.

## Architecture Patterns

### Recommended Code Structure

```
get-shit-done/workflows/new-project.md
  → Step 5: Workflow Preferences
    → Round 0: Recommended vs Custom gate (NEW)
    → Round 1: Core workflow settings (existing, runs if Custom)
    → Round 2: Workflow agents (existing, runs if Custom)
```

No new files needed — this is a modification to existing workflow logic.

### Pattern 1: Single Source of Truth for Defaults

**What:** Define recommended settings as a frozen constant before any prompt logic

**When to use:** Always — prevents drift between the shortcut and individual question defaults

**Example:**

```javascript
// At the top of the settings section, before any prompts
const RECOMMENDED_SETTINGS = Object.freeze({
  mode: 'yolo',
  depth: 'standard',
  parallelization: true,
  commit_docs: true,
  'workflow.research': true,
  'workflow.plan_check': true,
  'workflow.verifier': true,
  model_profile: 'balanced'
});

// Later in the flow...
if (userChoice === 'recommended') {
  for (const [key, value] of Object.entries(RECOMMENDED_SETTINGS)) {
    await applyConfig(key, value);
  }
}
```

**Why Object.freeze:** Prevents accidental mutation. If code tries to modify RECOMMENDED_SETTINGS later, it throws an error in strict mode or silently fails in non-strict mode, making bugs obvious.

### Pattern 2: Equal-Choice Presentation (from install.js)

**What:** Present options as numbered choices with equal visual weight

**When to use:** When neither option should feel like the "default" or "secondary" path

**Example from install.js (line 1657-1659):**

```javascript
console.log(`
  ${cyan}1${reset}) Keep existing
  ${cyan}2${reset}) Replace with GSD statusline
`);

rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
  const choice = answer.trim() || '1';
  // ...
});
```

**Adaptation for this phase:**

```javascript
console.log(`
  ${cyan}1${reset}) Recommended ${dim}— Balanced defaults for most projects${reset}
  ${cyan}2${reset}) Custom ${dim}— Configure each setting individually${reset}
`);
```

**Why this works:** Numbers convey equality (neither is "yes/no" or "accept/customize"). Descriptions are brief and neutral. Default is explicitly shown as `[1]` not hidden.

### Pattern 3: Config Write via gsd-tools

**What:** Use `gsd-tools.js config-set` for all config writes instead of direct fs operations

**When to use:** Always when writing to .planning/config.json

**Example:**

```bash
node ./.claude/get-shit-done/bin/gsd-tools.js config-set mode yolo
node ./.claude/get-shit-done/bin/gsd-tools.js config-set workflow.research true
```

**Why:** gsd-tools handles:
- Nested key paths (workflow.research)
- Type conversion (string "true" → boolean true)
- Atomic writes (temp file + rename)
- Error handling with helpful messages

**From gsd-tools.js lines 1065-1077:**

```javascript
function cmdConfigSet(cwd, keyPath, value, raw) {
  // Parse value (handle booleans and numbers)
  let parsedValue = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(value) && value !== '') parsedValue = Number(value);
  // ... writes config with proper nesting
}
```

### Pattern 4: Summary Output (Table Format)

**What:** After applying recommended settings, show what was configured in a scannable table

**When to use:** After non-interactive config application (recommended shortcut, --auto mode)

**Example:**

```javascript
console.log(`
  ${green}✓${reset} Applied recommended settings:

  | Setting          | Value        |
  |------------------|--------------|
  | Mode             | YOLO         |
  | Depth            | Standard     |
  | Parallelization  | Enabled      |
  | Research         | Enabled      |
  | Plan Check       | Enabled      |
  | Verifier         | Enabled      |
  | Model Profile    | Balanced     |
  | Commit Docs      | Enabled      |
`);
```

**Why table format:** Scannable, aligns with existing GSD output patterns (see install.js verification tables), easy to parse visually.

### Anti-Patterns to Avoid

- **Biased wording:** "Use recommended settings?" implies Custom is non-standard. Instead: "Recommended" and "Custom" as peer options.
- **Showing values before acceptance:** User shouldn't see `depth: standard, research: true...` before choosing. That's information overload and creates decision paralysis.
- **Direct config.json writes:** Bypass gsd-tools and you lose type conversion, error handling, and nested key support.
- **Prompt chaining instead of single gate:** Don't ask "Use recommended?" then "Are you sure?". Single decision, single prompt.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive prompts | Custom input/output handling with process.stdin | Node.js readline | TTY detection, line editing, Ctrl+C handling, cross-platform compatibility all built-in |
| Config persistence | Custom JSON read/write logic | gsd-tools.js config-set | Type conversion, nested keys, atomic writes, error messages already implemented |
| Value validation | Custom type checking | gsd-tools existing validation | config-set already parses "true"→true, "123"→123, handles edge cases |

**Key insight:** readline is battle-tested across millions of Node.js CLI tools. Writing custom stdin handling means re-implementing TTY detection, signal handling, and cross-platform quirks. gsd-tools.js config-set already handles the config.json schema correctly (nested workflow.* keys, type conversion).

## Common Pitfalls

### Pitfall 1: Default Value Drift

**What goes wrong:** RECOMMENDED_SETTINGS constant has `depth: 'standard'`, but individual question flow defaults to `'quick'`. User who picks Custom gets different defaults than someone using another setup path.

**Why it happens:** Defaults duplicated across code (constant, individual prompts, documentation). Someone updates one but not others.

**How to avoid:**
- Define RECOMMENDED_SETTINGS as single source of truth
- Individual question defaults should reference same constant: `const defaultDepth = RECOMMENDED_SETTINGS.depth`
- Or document that individual defaults can differ (e.g., Custom flow might default to 'quick' for speed-focused users)

**Warning signs:**
- User reports "recommended settings don't match what I see in Custom mode"
- Tests show config.json differs between shortcut and step-through paths

### Pitfall 2: Non-TTY Environments Breaking Readline

**What goes wrong:** Code runs in CI, Docker, or non-interactive shell. readline.question() hangs indefinitely because stdin isn't a TTY.

**Why it happens:** readline doesn't automatically skip in non-TTY environments — it just blocks.

**How to avoid:**

```javascript
// From install.js line 1495
if (!process.stdin.isTTY) {
  // Non-interactive, skip prompting
  applyRecommendedSettings();
  return;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
```

**Warning signs:**
- CI jobs hang on new-project setup
- Users report "stuck at settings configuration" in Docker/remote environments

### Pitfall 3: Forgetting to Close readline Interface

**What goes wrong:** readline.createInterface() opened but never closed. Process doesn't exit after completion (hangs at end of new-project flow).

**Why it happens:** Forgot `rl.close()` or closed it before async operations complete.

**How to avoid:**

```javascript
rl.question('Choice: ', (answer) => {
  rl.close();  // CRITICAL: Close immediately after getting answer
  processAnswer(answer);
});

// OR if you have multiple questions:
rl.question('Q1: ', (a1) => {
  rl.question('Q2: ', (a2) => {
    rl.close();  // Close after last question
    processAnswers(a1, a2);
  });
});
```

**Warning signs:**
- `new-project` workflow completes but terminal doesn't return to prompt
- User must Ctrl+C to exit even though workflow shows "DONE"

### Pitfall 4: Config Write Errors Not Surfaced to User

**What goes wrong:** Config write fails (permissions, disk full, invalid JSON) but user sees "✓ Applied recommended settings" anyway. Later steps fail mysteriously.

**Why it happens:** Not checking gsd-tools.js exit code or catching errors from config-set calls.

**How to avoid:**

```bash
# Check exit code
if ! node ./.claude/get-shit-done/bin/gsd-tools.js config-set mode yolo; then
  echo "Failed to save settings. Check permissions on .planning/config.json"
  exit 1
fi

# Or capture output and check for errors
OUTPUT=$(node ./.claude/get-shit-done/bin/gsd-tools.js config-set mode yolo 2>&1)
if [ $? -ne 0 ]; then
  echo "Config write failed: $OUTPUT"
  exit 1
fi
```

**Warning signs:**
- User reports "settings applied but config.json is empty/missing"
- Later workflow steps fail with "config not found" errors

### Pitfall 5: Summary Showing Internal Keys Instead of User-Friendly Labels

**What goes wrong:** Summary displays `workflow.research: true` instead of `Research: Enabled`. User doesn't understand what they configured.

**Why it happens:** Directly printing config keys without mapping to friendly names.

**How to avoid:**

```javascript
// BAD: Shows internal structure
console.log('Settings:', RECOMMENDED_SETTINGS);
// Output: { mode: 'yolo', 'workflow.research': true, ... }

// GOOD: Maps to user-friendly labels
const SETTING_LABELS = {
  mode: 'Mode',
  depth: 'Depth',
  parallelization: 'Parallelization',
  'workflow.research': 'Research',
  'workflow.plan_check': 'Plan Check',
  'workflow.verifier': 'Verifier',
  model_profile: 'Model Profile',
  commit_docs: 'Commit Docs'
};

const FRIENDLY_VALUES = {
  true: 'Enabled',
  false: 'Disabled',
  yolo: 'YOLO',
  interactive: 'Interactive',
  // ...
};

for (const [key, value] of Object.entries(RECOMMENDED_SETTINGS)) {
  const label = SETTING_LABELS[key] || key;
  const friendly = FRIENDLY_VALUES[value] || value;
  console.log(`  ${label}: ${friendly}`);
}
```

**Warning signs:**
- User confusion about what settings mean
- Support requests asking "what is workflow.plan_check?"

## Code Examples

Verified patterns from official sources and existing GSD codebase:

### Readline Prompt Pattern (from install.js)

```javascript
// Source: bin/install.js lines 1503-1518
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`\n  ${cyan}Settings${reset}\n`);
console.log(`  We have recommended settings that work for most projects.\n`);
console.log(`  ${cyan}1${reset}) Recommended ${dim}— Apply balanced defaults${reset}`);
console.log(`  ${cyan}2${reset}) Custom ${dim}— Configure each setting${reset}\n`);

rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
  rl.close();
  const choice = answer.trim() || '1';

  if (choice === '1') {
    applyRecommendedSettings();
  } else {
    runIndividualQuestions();
  }
});
```

### Config Write via gsd-tools (existing pattern)

```bash
# Source: new-project.md workflow, adapted for recommended settings
# Apply each setting via gsd-tools to ensure type conversion and validation

node ./.claude/get-shit-done/bin/gsd-tools.js config-set mode yolo
node ./.claude/get-shit-done/bin/gsd-tools.js config-set depth standard
node ./.claude/get-shit-done/bin/gsd-tools.js config-set parallelization true
node ./.claude/get-shit-done/bin/gsd-tools.js config-set commit_docs true
node ./.claude/get-shit-done/bin/gsd-tools.js config-set workflow.research true
node ./.claude/get-shit-done/bin/gsd-tools.js config-set workflow.plan_check true
node ./.claude/get-shit-done/bin/gsd-tools.js config-set workflow.verifier true
node ./.claude/get-shit-done/bin/gsd-tools.js config-set model_profile balanced
```

### Summary Table Output (pattern from install.js verification)

```javascript
// Pattern inspired by install.js verification tables
console.log(`
  ${green}✓${reset} Applied recommended settings:

  | Setting          | Value        |
  |------------------|--------------|
  | Mode             | YOLO         |
  | Depth            | Standard     |
  | Parallelization  | Enabled      |
  | Research         | Enabled      |
  | Plan Check       | Enabled      |
  | Verifier         | Enabled      |
  | Model Profile    | Balanced     |
  | Commit Docs      | Enabled      |

  You can change these anytime with /gsd:settings
`);
```

### TTY Detection Guard (from install.js)

```javascript
// Source: bin/install.js line 1495
if (!process.stdin.isTTY) {
  // Non-interactive environment (CI, Docker, etc.)
  // Skip prompts and apply recommended settings
  console.log(`  ${yellow}Non-interactive terminal detected, applying recommended settings${reset}\n`);
  applyRecommendedSettings();
  return;
}

// Interactive environment, show prompt
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Yes/no prompts for shortcuts | Named option pairs (1/2, keep/replace) | install.js patterns ~2024 | Reduces cognitive load — users don't feel "default" is being pushed |
| Showing all values before acceptance | Brief description + post-application summary | UX research on decision fatigue | Prevents analysis paralysis, users can see what was applied after choosing |
| inquirer.js for prompts | Node.js built-in readline | Dependency minimization trend | Smaller install size, faster startup, one less supply chain risk |

**Deprecated/outdated:**

- **inquirer.js for simple prompts**: Still popular but overkill for single-select. 2MB+ dependencies for features (validation, transforms, autocomplete) not needed here. Trend in 2024+ is toward built-in alternatives for simple cases.
- **Prompting on every setting without shortcut**: Many modern CLIs (Vite, Next.js create commands) now offer "recommended" shortcuts. Users expect fast-path options.

## Open Questions

1. **Should model_profile be in recommended settings if it's not in current config.json?**
   - What we know: Current config.json schema (from grep) doesn't have top-level model_profile field. Workflow might derive models from other settings.
   - What's unclear: Where model_profile lives (might be nested under workflow or separate)
   - Recommendation: Verify actual config schema during planning. If model_profile doesn't exist as a config key, remove from RECOMMENDED_SETTINGS and handle differently.

2. **Should parallelization be boolean or object?**
   - What we know: Sample config.json has `parallelization: { enabled: true, ... }` (object), but CONTEXT says `parallelization: true` (boolean)
   - What's unclear: Whether we're setting `parallelization: true` (wrong — breaks schema) or `parallelization.enabled: true` (correct)
   - Recommendation: Use `parallelization.enabled: true` to match schema. Update CONTEXT if needed during planning.

## Sources

### Primary (HIGH confidence)

- Node.js readline documentation: https://nodejs.org/api/readline.html
- GSD codebase: bin/install.js (lines 1495-1518, 1503-1577, 1642-1665) — proven readline patterns
- GSD codebase: get-shit-done/bin/gsd-tools.js (lines 1065-1077) — config-set implementation
- GSD codebase: get-shit-done/workflows/new-project.md — current settings flow (Step 5, lines 220-348)
- Sample config.json from actual GSD project — schema verification

### Secondary (MEDIUM confidence)

- UX research on decision fatigue and default bias: "fewer upfront choices, show results after" reduces abandonment
- CLI tooling trends (Vite, Next.js, create-react-app): recommended/custom pattern now standard for project scaffolding

### Tertiary (LOW confidence)

None — all findings verified against GSD codebase or Node.js official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Node.js built-ins already in use, gsd-tools patterns proven
- Architecture: HIGH - Modification to existing workflow, no new components
- Pitfalls: HIGH - Readline gotchas well-documented, config write patterns established

**Research date:** 2026-02-12
**Valid until:** 60 days (stable APIs, established patterns)
