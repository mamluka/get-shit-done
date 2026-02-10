# Architecture Research

**Domain:** AI-orchestrated development framework modification
**Researched:** 2026-02-10
**Confidence:** HIGH

## Standard Architecture

### System Overview

The GSD framework follows a layered architecture with clear separation between orchestration, execution, state management, and utilities:

```
┌─────────────────────────────────────────────────────────────┐
│                   COMMAND LAYER (28 commands)                │
│  User Entry Points: /gsd:new-project, /gsd:plan-phase, etc. │
├─────────────────────────────────────────────────────────────┤
│                  ORCHESTRATION LAYER                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Workflows  │  │   Agents   │  │  Templates │            │
│  │ (30 files) │  │ (11 types) │  │  (26 files)│            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        └────────────────┴────────────────┘                   │
├─────────────────────────────────────────────────────────────┤
│                    CORE UTILITIES                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              gsd-tools.js (4,503 lines)               │  │
│  │  State • Config • Git • Phase Ops • Validation        │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    STORAGE LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │.planning/│  │  phases/ │  │   git    │                  │
│  │ (state)  │  │  (work)  │  │(commits) │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Commands | User entry points, arg parsing, workflow dispatch | Markdown files with YAML frontmatter invoking workflows |
| Workflows | Orchestration logic, agent spawning, flow control | Markdown specs in `workflows/` read by orchestrator |
| Agents | Specialized AI roles (planner, executor, researcher) | Markdown role definitions with tool permissions |
| gsd-tools.js | Atomic operations on state/config/git/phases | Node.js CLI with 100+ commands |
| Templates | Document structure for all artifacts | Markdown templates with placeholders |
| .planning/ | Project state, config, roadmap, requirements | Flat directory with markdown files |
| phases/ | Per-phase artifacts (plans, summaries, research) | Subdirectories: `01-auth/`, `02-dashboard/` |
| Git | Version control for planning docs and code | Standard git with atomic commits |

## Recommended Project Structure for PM Tool Modifications

Current structure (execution-focused):
```
.planning/
├── PROJECT.md              # Project definition
├── STATE.md                # Current position
├── REQUIREMENTS.md         # All requirements
├── ROADMAP.md              # Phase structure
├── config.json             # Workflow settings
├── research/               # Project-level research
│   ├── SUMMARY.md
│   ├── STACK.md
│   ├── FEATURES.md
│   ├── ARCHITECTURE.md
│   └── PITFALLS.md
├── phases/                 # Execution artifacts
│   ├── 01-setup/
│   │   ├── 01-01-PLAN.md
│   │   ├── 01-01-SUMMARY.md
│   │   └── 01-RESEARCH.md
│   └── 02-auth/
│       └── ...
└── codebase/               # Brownfield mapping
    └── ARCHITECTURE.md
```

Proposed structure (PM planning-focused):
```
.planning/
├── {project-name}/         # Project root (new layer)
│   ├── v1/                 # Milestone version (new layer)
│   │   ├── PROJECT.md      # Project definition (milestone scope)
│   │   ├── STATE.md        # Planning state (no execution metrics)
│   │   ├── REQUIREMENTS.md # Milestone requirements
│   │   ├── ROADMAP.md      # Phase structure
│   │   ├── config.json     # Planning settings
│   │   ├── research/       # Milestone research
│   │   │   ├── SUMMARY.md
│   │   │   ├── STACK.md
│   │   │   ├── FEATURES.md
│   │   │   ├── ARCHITECTURE.md
│   │   │   └── PITFALLS.md
│   │   └── phases/         # Planning artifacts only
│   │       ├── 01-setup/
│   │       │   ├── 01-01-PLAN.md      (planning only, no summaries)
│   │       │   ├── 01-RESEARCH.md
│   │       │   └── 01-CONTEXT.md
│   │       └── 02-auth/
│   │           └── ...
│   └── v2/                 # Next milestone
│       └── ...
└── (global-config.json)    # Cross-project settings (optional)
```

### Structure Rationale

- **{project-name}/:** Enables multi-project planning in single repo
- **v1/, v2/, ...:** Each milestone gets isolated folder with full planning lifecycle
- **phases/:** No SUMMARY.md files (no execution happened)
- **STATE.md:** Tracks planning phase transitions, not execution metrics
- **Git branches:** Each milestone/project gets dedicated branch with tags for phase completions

## Architectural Patterns for PM Tool Transformation

### Pattern 1: Two-Tier Folder Isolation

**What:** Add project-name and version layers to folder structure

**When to use:** Converting from single-project execution to multi-project planning

**Trade-offs:**
- ✅ Clean separation between projects and milestones
- ✅ Easy to archive completed milestones
- ✅ No cross-project state pollution
- ❌ More path navigation complexity
- ❌ Requires path-aware refactoring throughout gsd-tools.js

**Implementation approach:**
```javascript
// Current:
const planningDir = path.join(cwd, '.planning');

// Modified:
const planningDir = path.join(cwd, '.planning', projectName, version);
```

All path construction in gsd-tools.js needs project/version context.

### Pattern 2: Continuous Phase Flow State Machine

**What:** Replace discrete plan→execute→verify stages with continuous planning phases

**Current flow:**
```
new-project → plan-phase → execute-phase → verify-phase → [next phase]
              ↓             ↓                ↓
              PLAN.md       SUMMARY.md       VERIFICATION.md
```

**Modified flow:**
```
new-project → plan-phase → plan-phase → ... → complete-milestone
              ↓             ↓                   ↓
              PLAN.md       PLAN.md            (tag + archive)
              (phase 1)     (phase 2)
```

**When to use:** Removing execution capability while preserving planning

**Trade-offs:**
- ✅ Simpler state progression
- ✅ No execution/verification complexity
- ✅ Auto-advance eliminates manual transitions
- ❌ Loses execution feedback loop
- ❌ Must define "completion" without code verification

**Implementation approach:**

STATE.md changes:
```markdown
# Current
Status: [Planning / In progress / Phase complete / Ready to execute]

# Modified
Status: [Planning / Plan complete / Milestone complete]
```

Auto-advance logic:
```javascript
// After plan-phase completes:
// 1. Mark phase complete in ROADMAP.md
// 2. Check if more phases exist
// 3. If yes: update STATE.md to next phase, return "Ready for next phase"
// 4. If no: prompt for milestone completion
```

### Pattern 3: Git Branch-Per-Project with Phase Tags

**What:** Create branch for each project/milestone, tag phases as completed

**Current git strategy:**
```
config.json: branching_strategy = "none" | "phase" | "milestone"

"phase" → creates branch per phase: gsd/phase-01-setup
"milestone" → creates branch per milestone: gsd/v1.0-mvp
```

**Modified git strategy:**
```
config.json: branching_strategy = "project" (new option)

Creates:
- Branch: planning/{project-name}/v1
- Tags: v1/phase-01, v1/phase-02, ... (at each phase completion)
- Milestone tag: v1/complete (when milestone done)
```

**When to use:** Multi-project PM planning with clear milestone history

**Trade-offs:**
- ✅ Clean history per project
- ✅ Easy to see phase progression via tags
- ✅ Can compare planning across milestones
- ❌ More complex branch management
- ❌ Requires tag cleanup strategies

**Implementation:**
```javascript
// In gsd-tools.js, add new branching mode:
if (config.branching_strategy === 'project') {
  const branchName = `planning/${projectName}/${version}`;
  execGit(cwd, ['checkout', '-b', branchName]);
}

// After phase completion:
const tagName = `${version}/phase-${phaseNumber}`;
execGit(cwd, ['tag', '-a', tagName, '-m', `Phase ${phaseNumber} planned`]);
```

### Pattern 4: Edit-Phase Capability

**What:** Allow users to revise already-completed planning phases

**Current:** Plans are write-once. Revision requires manual file editing.

**Modified:** Add `/gsd:edit-phase <N>` command that:
1. Loads existing phase plans
2. Presents to gsd-planner with revision context
3. Updates plans in place
4. Updates ROADMAP.md if dependencies changed
5. Commits with "edit: phase N revised" message

**When to use:** Iterative planning where requirements evolve

**Trade-offs:**
- ✅ Natural workflow for planning iterations
- ✅ Maintains git history of changes
- ✅ Can propagate changes to dependent phases
- ❌ Risk of inconsistency if dependencies broken
- ❌ Need validation that edits don't break roadmap coherence

**Implementation:**

New workflow: `edit-phase.md`
```markdown
<process>
1. Load phase context (PLAN.md, RESEARCH.md, CONTEXT.md)
2. Present current plan to user
3. Ask: "What do you want to change?"
4. Spawn gsd-planner with:
   - mode: "revision"
   - existing_plans: [current plans]
   - user_feedback: [what to change]
5. Planner updates plans in place
6. Update ROADMAP.md if phase goal/requirements changed
7. Validate dependencies still satisfied
8. Commit
</process>
```

## Data Flow Changes

### Planning State Progression (Modified)

**Current execution flow:**
```
Plan Phase → Execute Phase → Verify Phase → Transition
     ↓             ↓              ↓             ↓
  PLAN.md      SUMMARY.md    VERIFICATION.md  STATE.md
  (tasks)      (completed)   (gaps)           (metrics)
```

**Modified planning-only flow:**
```
Plan Phase → [Auto-advance] → Plan Phase → Complete Milestone
     ↓                              ↓              ↓
  PLAN.md                        PLAN.md        MILESTONE.md
  (phase 1)                      (phase 2)      (archive)
```

**Auto-advance trigger:**
- After plan-phase completes successfully
- If plan-checker passes (or skipped)
- Update STATE.md: `current_phase: N+1, status: "Ready to plan"`
- Display: "Phase N planned ✓. Ready for Phase N+1."

**Milestone completion trigger:**
- All phases planned
- User runs `/gsd:complete-milestone`
- Archive to `.planning/archive/{project}/{version}/`
- Tag git: `{version}/complete`
- Optionally create `MILESTONES.md` summary

### Path Resolution (Modified)

**Current:**
```javascript
// gsd-tools.js paths
const planningDir = path.join(cwd, '.planning');
const roadmapPath = path.join(planningDir, 'ROADMAP.md');
const phasesDir = path.join(planningDir, 'phases');
```

**Modified:**
```javascript
// Need project/version context in ALL operations
function getPlanningDir(cwd, projectName, version) {
  return path.join(cwd, '.planning', projectName, version);
}

const planningDir = getPlanningDir(cwd, projectName, version);
const roadmapPath = path.join(planningDir, 'ROADMAP.md');
const phasesDir = path.join(planningDir, 'phases');
```

**Context injection:**
- Add `project_name` and `version` to STATE.md
- All gsd-tools commands read context first
- Commands pass context through to all operations

## Component Modification Matrix

### Components That Need Major Changes

| Component | Modification | Reason | Risk Level |
|-----------|--------------|--------|------------|
| **gsd-tools.js** | Path resolution, project/version context | All file operations need project scope | HIGH |
| **new-project.md** | Add project name input, create nested structure | Entry point for project creation | MEDIUM |
| **plan-phase.md** | Remove execute-phase references, add auto-advance | Core planning workflow | MEDIUM |
| **STATE.md template** | Remove execution metrics, simplify status | Planning-only state | LOW |
| **config.json schema** | Add branching_strategy: "project", remove execution flags | Planning-focused config | LOW |
| **complete-milestone.md** | Archive to project/version structure | Milestone lifecycle | MEDIUM |

### Components That Need Minor Changes

| Component | Modification | Reason | Risk Level |
|-----------|--------------|--------|------------|
| **roadmap.md workflow** | Remove "Plans: TBD" pattern, phase stays "planned" | No execution tracking | LOW |
| **new-milestone.md** | Version folder creation within project | Milestone isolation | LOW |
| **progress.md** | Show planning completion %, not execution metrics | Planning progress only | LOW |
| **discuss-phase.md** | Keep as-is, still useful for planning context | Unchanged | NONE |

### Components That Can Stay Unchanged

| Component | Why Unchanged | Notes |
|-----------|---------------|-------|
| **gsd-project-researcher** | Research still needed for planning | No changes |
| **gsd-phase-researcher** | Research per phase still valuable | No changes |
| **gsd-roadmapper** | Creates roadmap same way | No changes |
| **gsd-planner** | Planning logic stays same | No changes |
| **Templates (PROJECT.md, REQUIREMENTS.md)** | Structure still valid | Minor field removals only |
| **References (TDD, git-workflows)** | Documentation only | No changes |

### Components to Remove

| Component | Reason | Impact |
|-----------|--------|--------|
| **execute-phase.md** | No execution in PM tool | Must remove to prevent confusion |
| **execute-plan.md** | No execution in PM tool | Must remove |
| **gsd-executor agent** | Executes code, not needed | Remove agent definition |
| **gsd-verifier agent** | Verifies execution, not needed | Remove agent definition |
| **verify-phase.md** | No execution to verify | Remove workflow |
| **SUMMARY.md template** | Only created after execution | Remove template |
| **VERIFICATION.md template** | Only for execution gaps | Remove template |

## Suggested Build Order

### Phase 1: Foundation (Path Abstraction)
**Goal:** Make gsd-tools.js project/version aware without breaking current behavior

**Changes:**
1. Add `getProjectContext(cwd)` function to read project/version from STATE.md
2. Add `getPlanningDir(cwd, project, version)` helper
3. Refactor all path construction to use helper (backward compatible with flat structure)
4. Add unit tests for path resolution

**Success criteria:**
- All existing tests pass
- gsd-tools.js works with both flat and nested structures
- No behavioral changes yet

**Risk mitigation:**
- Feature flag: `nested_structure: false` (default) in config.json
- Parallel path resolution (try nested, fallback to flat)

### Phase 2: State Model Changes
**Goal:** Remove execution concepts from STATE.md and simplify status flow

**Changes:**
1. Update STATE.md template: remove "Performance Metrics" section
2. Simplify status values: `Planning | Plan complete | Milestone complete`
3. Remove execution duration tracking from `state record-metric`
4. Update `state-snapshot` command to new schema
5. Add `current_project` and `current_version` fields to STATE.md

**Success criteria:**
- STATE.md reflects planning-only lifecycle
- Old STATE.md files migrate gracefully (ignore missing fields)

**Risk mitigation:**
- Migration script reads old STATE.md, writes new format
- Preserve all "Accumulated Context" (decisions, todos, blockers)

### Phase 3: Workflow Simplification
**Goal:** Remove execution workflows and simplify phase progression

**Changes:**
1. Remove workflows: `execute-phase.md`, `execute-plan.md`, `verify-phase.md`, `verify-work.md`
2. Remove agents: `gsd-executor.md`, `gsd-verifier.md`
3. Update `plan-phase.md`: add auto-advance at completion
4. Update `progress.md`: show planning completion, not execution metrics
5. Add edit-phase workflow

**Success criteria:**
- No execution references in workflows
- Auto-advance works after plan-phase completes
- User can edit phases iteratively

**Risk mitigation:**
- Keep removed files in `.archive/` during transition
- Update `/gsd:help` to remove execution commands

### Phase 4: Project/Version Structure
**Goal:** Enable multi-project planning with folder-per-project structure

**Changes:**
1. Update `new-project.md`: prompt for project name, create nested structure
2. Update `new-milestone.md`: create version folder within project
3. Add `switch-project` command to change active project/version
4. Update config.json: add `current_project`, `current_version`
5. Enable nested structure by default: `nested_structure: true`

**Success criteria:**
- Can create multiple projects in single repo
- Each project isolated in `.planning/{project}/`
- Each milestone isolated in `.planning/{project}/{version}/`

**Risk mitigation:**
- Migration script: moves `.planning/` → `.planning/default-project/v1/`
- Backward compat mode for flat structure (read-only)

### Phase 5: Git Integration
**Goal:** Branch-per-project with phase tags for milestone history

**Changes:**
1. Add `branching_strategy: "project"` to config options
2. Update branch template: `project_branch_template: "planning/{project}/{version}"`
3. Add phase tagging after plan completion: `{version}/phase-{N}`
4. Add milestone tagging after completion: `{version}/complete`
5. Update `complete-milestone.md` to create tag and archive

**Success criteria:**
- Each project gets dedicated branch
- Phase progression visible via git tags
- Milestone completion creates archive tag

**Risk mitigation:**
- Keep existing branching modes working ("none", "phase", "milestone")
- Document tag cleanup strategies (prune old milestones)

## Integration Points Between Changes

### Critical Dependencies

**Phase 2 depends on Phase 1:**
- STATE.md changes need project/version context
- Cannot add `current_project` field without path abstraction

**Phase 3 depends on Phase 2:**
- Auto-advance logic reads STATE.md status
- Need new status values before implementing auto-advance

**Phase 4 depends on Phase 1 + 2:**
- Nested structure needs path helpers (Phase 1)
- PROJECT.md location depends on project/version in STATE.md (Phase 2)

**Phase 5 depends on Phase 4:**
- Branch naming uses project/version from nested structure
- Cannot tag phases without project context

### Parallel Execution Opportunities

**Phase 1 + 2 can run in parallel:**
- Path abstraction doesn't touch STATE.md schema
- STATE.md changes don't touch path resolution

**Phase 3 can start during Phase 2:**
- Workflow simplification (removing files) independent of state model
- Only auto-advance implementation needs Phase 2 complete

## Risk Areas Where Changes Could Break Existing Functionality

### High Risk

**1. Path resolution in gsd-tools.js**
- **Risk:** 100+ path constructions could break if refactoring incomplete
- **Symptoms:** File not found errors, wrong directories created
- **Mitigation:**
  - Test suite covering all path operations
  - Feature flag for nested structure
  - Parallel resolver (try nested, fallback flat)

**2. STATE.md schema changes**
- **Risk:** Existing projects break if STATE.md fields removed
- **Symptoms:** Workflows crash reading missing fields
- **Mitigation:**
  - Graceful field access with defaults
  - Migration script from old to new format
  - Version field in STATE.md for backward compat detection

**3. Auto-advance logic**
- **Risk:** Infinite loops if phase detection broken, or skip phases accidentally
- **Symptoms:** Never advances, or skips unplanned phases
- **Mitigation:**
  - Explicit "ready to advance?" check
  - Confirm next phase exists before advancing
  - User confirmation gate before auto-advance

### Medium Risk

**4. Removing execution workflows**
- **Risk:** Users accidentally invoke removed commands
- **Symptoms:** Command not found errors
- **Mitigation:**
  - Update command registry to block execution commands
  - Helpful error: "Execution removed. Use for planning only."

**5. Git branching strategy changes**
- **Risk:** Conflicts with existing branch names, messy branch history
- **Symptoms:** Git errors, duplicate branches
- **Mitigation:**
  - Namespace branches: `planning/` prefix
  - Check branch exists before creating
  - Document cleanup in upgrade guide

**6. Multi-project state isolation**
- **Risk:** Cross-project state pollution, config bleed
- **Symptoms:** Wrong project ROADMAP.md loaded
- **Mitigation:**
  - All operations load STATE.md first for context
  - Config file per project/version (not global)
  - Validate project context before file operations

### Low Risk

**7. Template changes**
- **Risk:** Old templates incompatible with new workflow
- **Symptoms:** Missing sections in generated files
- **Mitigation:**
  - Templates are filled at creation time (no runtime dependency)
  - Old artifacts still readable

**8. Progress calculation**
- **Risk:** Wrong percentage if formula not updated
- **Symptoms:** Progress stuck at 0% or jumps to 100%
- **Mitigation:**
  - Redefine progress: (planned phases / total phases) × 100%
  - Test edge cases: 0 phases, all phases planned, decimal phases

## Testing Strategy Per Component

### gsd-tools.js (Phase 1)
```bash
# Path resolution tests
node gsd-tools.js state load --project myapp --version v1
# Should return STATE.md from .planning/myapp/v1/STATE.md

node gsd-tools.js roadmap get-phase 1 --project myapp --version v1
# Should read from .planning/myapp/v1/ROADMAP.md
```

### plan-phase.md (Phase 3)
```bash
# Auto-advance test
/gsd:plan-phase 1
# After completion, should show: "Ready for Phase 2"

# Verify STATE.md updated
cat .planning/STATE.md | grep "Phase: 2"
```

### new-project.md (Phase 4)
```bash
# Project name prompt
/gsd:new-project
# Should ask: "Project name?" and create .planning/{name}/v1/

# Verify structure
ls .planning/myapp/v1/
# Should show: PROJECT.md, STATE.md, ROADMAP.md, config.json
```

### Git branching (Phase 5)
```bash
# Branch creation
/gsd:new-project
# Should create branch: planning/myapp/v1

# Phase tagging
/gsd:plan-phase 1
# After completion, should create tag: v1/phase-01
git tag | grep v1/phase-01
```

## Rollback Procedures

### If Phase 1 breaks (Path abstraction)
```bash
# Revert gsd-tools.js to pre-Phase-1 version
git revert <commit-hash>

# Set feature flag
echo '{"nested_structure": false}' >> .planning/config.json

# All workflows continue with flat structure
```

### If Phase 2 breaks (State model)
```bash
# Restore old STATE.md schema
cp .planning/.archive/STATE.md.backup .planning/STATE.md

# Workflows detect old schema via version field
# Fall back to execution-aware status values
```

### If Phase 3 breaks (Workflow changes)
```bash
# Restore removed workflows from archive
cp .archive/execute-phase.md .claude/workflows/
cp .archive/gsd-executor.md .claude/agents/

# Set config flag
echo '{"execution_enabled": true}' >> .planning/config.json
```

### If Phase 4 breaks (Project structure)
```bash
# Flatten structure back to .planning/
mv .planning/{project}/v1/* .planning/
rm -rf .planning/{project}

# Update STATE.md: remove project/version fields
```

### If Phase 5 breaks (Git strategy)
```bash
# Switch back to main branch
git checkout main

# Remove planning branches
git branch -D planning/*

# Set branching_strategy: "none"
```

## Component Boundary Rules

**Golden Rules:**

1. **gsd-tools.js is the only file operation layer**
   - Workflows never construct file paths directly
   - All state/config/git operations go through gsd-tools.js
   - This ensures path resolution changes stay isolated

2. **STATE.md is single source of truth for context**
   - All workflows read STATE.md first
   - Project name, version, current phase come from STATE.md
   - No hardcoded project context in workflows

3. **Workflows orchestrate, agents execute**
   - Workflows spawn agents with context
   - Agents don't read global state (receive via prompt)
   - Clean separation enables parallel agent execution

4. **Templates define structure, not behavior**
   - Templates are passive (just markdown)
   - Behavior lives in workflows and agents
   - Changing templates doesn't break workflows

5. **Config.json controls workflow flags only**
   - Not used for state (that's STATE.md)
   - Only for user preferences (research enabled, model profile, branching)
   - Can be missing (sensible defaults)

---
*Architecture research for: GSD → PM Planning Tool modifications*
*Researched: 2026-02-10*
