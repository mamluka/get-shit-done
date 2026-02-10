# Architecture

**Analysis Date:** 2026-02-10

## Pattern Overview

**Overall:** Spec-driven AI development orchestration system with multi-agent coordination, context engineering, and automated workflow management.

**Key Characteristics:**
- Command-driven workflow orchestration (entry via `/gsd:*` commands)
- Subagent spawning pattern for autonomous task execution and specialized analysis
- State machine progression through project phases and planning milestones
- Git-backed artifact storage and atomic commit tracking
- Context engineering via templated prompts and reference documents
- Deviation-aware execution with automatic rollback and remediation

## Layers

**Presentation/Command Layer:**
- Purpose: User-facing entry points and interactive CLI workflows
- Location: `commands/gsd/` (markdown command files) and `agents/` (specialized agents)
- Contains: Command definitions with YAML frontmatter, workflow documentation
- Depends on: Orchestration layer, utility scripts, templates
- Used by: Claude Code, OpenCode, Gemini CLI runtimes

**Orchestration/Workflow Layer:**
- Purpose: Stateful workflow execution, phase/milestone management, subagent spawning
- Location: `get-shit-done/workflows/` (workflow templates), `get-shit-done/bin/gsd-tools.js` (CLI tool)
- Contains: Workflow specifications, process step definitions, initialization templates
- Depends on: Core utilities layer, state management system, template system
- Used by: Commands, agents, subagent execution flows

**Specialized Agents Layer:**
- Purpose: Focused AI agents for specific tasks (executing plans, planning phases, researching, debugging, etc.)
- Location: `agents/gsd-*.md` (agent role definitions)
- Contains: Agent personas, tool permissions, execution constraints, specialized prompts
- Depends on: Core utilities, orchestration workflows
- Used by: Orchestration layer (spawns agents via Task tool)

**Core Utilities Layer:**
- Purpose: Centralized CLI tool providing atomic operations for state, config, git, phase/plan management
- Location: `get-shit-done/bin/gsd-tools.js` (4,597 lines)
- Contains: State CRUD, config parsing, git operations, phase numbering, frontmatter manipulation, summary verification
- Depends on: Node.js stdlib (fs, path, child_process)
- Used by: All workflows, commands, agents

**Reference/Template Layer:**
- Purpose: Shared knowledge, patterns, and document templates
- Location: `get-shit-done/references/` (2,911 lines total), `get-shit-done/templates/`
- Contains: Model profiles, TDD patterns, git workflows, markdown templates for PROJECT/REQUIREMENTS/PLAN/SUMMARY
- Depends on: Nothing (read-only reference material)
- Used by: Workflows, agents, user-facing documentation

**Runtime Integration Layer:**
- Purpose: Cross-platform installation and hook management for Claude Code, OpenCode, Gemini
- Location: `bin/install.js` (1,740 lines), `hooks/`, `scripts/`
- Contains: Multi-runtime installer, hook registration, attribute preservation, file manifest tracking
- Depends on: Filesystem, environment variables
- Used by: Installation process, runtime lifecycle

## Data Flow

**Project Initialization Flow:**

1. User runs `/gsd:new-project`
2. Command spawns `gsd-project-researcher` agent (research phase optional)
3. Agent gathers requirements via questioning, stores in `.planning/REQUIREMENTS.md`
4. Command spawns `gsd-roadmapper` agent
5. Roadmapper creates `.planning/ROADMAP.md` (phase structure)
6. Command creates `.planning/STATE.md` (project memory) and `.planning/config.json` (preferences)
7. Commit planning docs if `commit_docs: true`

**Phase Execution Flow:**

1. User runs `/gsd:plan-phase <N>` (planning stage)
2. Planner creates `.planning/phases/<N>-name/<phase>-PLAN.md` documents
3. Planner may invoke `gsd-plan-checker` to validate plan structure
4. User runs `/gsd:execute-phase <N>` (execution stage)
5. Executor spawns `gsd-executor` subagent (if plan is autonomous/segmented)
6. Subagent executes tasks atomically, committing each via `gsd-tools commit`
7. Subagent creates `.planning/phases/<N>-name/<phase>-SUMMARY.md`
8. Executor optionally spawns `gsd-verifier` (if verifier enabled)
9. Executor updates `.planning/STATE.md` with completion metrics
10. All planning docs committed with `gsd-tools commit`

**State Management Flow:**

1. Every operation loads `.planning/STATE.md` as authoritative project state
2. Workflows update via `gsd-tools state <command>` (e.g., `state update phase_number 2`)
3. STATE.md contains: current phase, plan counter, decisions, blockers, session continuity
4. On resumption, STATE.md provides context for checkpoint recovery and continuation

**Git Integration Flow:**

1. Planning artifacts (*.md files) are tracked in `.planning/` directory
2. `gsd-tools commit` checks:
   - `commit_docs` config setting
   - `.planning/` gitignore status
   - If both allow: creates atomic commit via `git commit`
3. Each plan execution creates multiple commits:
   - Per-task commits during execution (via `gsd-executor` subagent)
   - Summary commit at plan completion
   - Rollback commits if deviations detected

**Agent Spawning Pattern:**

1. Workflow decides agent type based on task (executor, planner, researcher, verifier, debugger)
2. Workflow looks up model from `MODEL_PROFILES` (quality/balanced/budget)
3. Workflow spawns via Task tool: `task(subagent_type="gsd-<type>", model="<model>", prompt="...", resume=<bool>)`
4. Subagent executes with full context isolation
5. Subagent returns structured result
6. Main context updates tracking, aggregates results, continues

## Key Abstractions

**Phase:**
- Purpose: Logical unit of work (feature, refactor, integration)
- Examples: `01-setup`, `02-authentication`, `03-dashboard`, `01.1-hotfix`
- Pattern: Decimal numbering supports nesting; phase directories contain all artifacts

**Plan (PLAN.md):**
- Purpose: Actionable specification for implementing a phase
- Examples: `.planning/phases/02-authentication/02-001-PLAN.md`
- Pattern: Contains frontmatter (phase, plan number, type, wave, dependencies), objectives, context references, tasks with types and success criteria

**Summary (SUMMARY.md):**
- Purpose: Post-execution report documenting what was built, deviations, metrics
- Examples: `.planning/phases/02-authentication/02-001-SUMMARY.md`
- Pattern: Mirrors plan structure, adds completed tasks, commit hashes, execution time, deviations, verification results

**State (STATE.md):**
- Purpose: Single source of truth for project progression, decisions, blockers
- Location: `.planning/STATE.md`
- Pattern: Sections for current phase/plan, decisions table, blockers list, session continuity, execution metrics

**Config (config.json):**
- Purpose: User preferences for workflow behavior
- Location: `.planning/config.json`
- Pattern: Sections for model_profile, workflow flags (research, plan_checker, verifier), git strategy, branching templates

**Context (CONTEXT.md):**
- Purpose: User's vision and acceptance criteria for a phase
- Location: `.planning/phases/<N>-name/CONTEXT.md` (optional)
- Pattern: User-authored; referenced by agents to align execution with intent

## Entry Points

**Command Entry:**
- Location: `commands/gsd/*.md` (28 commands listed)
- Triggers: User runs `/gsd:<command>` in Claude Code CLI
- Responsibilities: Parse arguments, validate state, spawn workflows/agents, present results

**Agent Entry:**
- Location: `agents/gsd-*.md` (11 agents)
- Triggers: Spawned via Task tool by orchestration layer
- Responsibilities: Execute specialized task, produce output artifacts, return structured summary

**Installation Entry:**
- Location: `bin/install.js`
- Triggers: User runs `npx get-shit-done-cc`
- Responsibilities: Multi-runtime detection, file copying, hook registration, settings configuration

**Utility Entry:**
- Location: `get-shit-done/bin/gsd-tools.js`
- Triggers: Invoked via `node ~/.claude/get-shit-done/bin/gsd-tools.js <command>`
- Responsibilities: Atomic state/config/git/phase operations, centralized business logic

## Error Handling

**Strategy:** Graceful degradation with deviation rules and auto-recovery.

**Patterns:**
- **Missing state:** Error if `.planning/` not initialized; offer project reconstruction
- **Plan execution failures:** Executor auto-applies deviation rules (auto-fix bugs, add missing features, resolve auth gates)
- **Git commit failures:** Skip silently if `commit_docs: false` or path gitignored; log reason to output
- **Interrupted execution:** State tracking via `current-agent-id.txt` and `agent-history.json` allows resumption from last checkpoint
- **Invalid phase numbers:** Validation via `decimal-phase-calculation.md` patterns; renumbering support for phase removal

## Cross-Cutting Concerns

**Logging:** Structured output to stdout; color-coded status (green=success, yellow=warning, dim=supplementary). No file-based logs.

**Validation:**
- Frontmatter validation for PLAN/SUMMARY/VERIFICATION via `frontmatter validate`
- Plan structure validation via `verify plan-structure`
- Phase completeness checking via `verify phase-completeness`

**Authentication:**
- Custom gates via plan task type `type="auth"`
- Executor auto-detects auth failures and pauses for user input
- Resumption after auth success

**Version Management:**
- Installer writes `VERSION` file to installation target
- Update checker compares installed vs. npm package version
- Local patch persistence via `gsd-local-patches/` and `gsd-file-manifest.json`

---

*Architecture analysis: 2026-02-10*
