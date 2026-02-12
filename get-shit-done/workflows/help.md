<purpose>
Display the complete GSD command reference. Output ONLY the reference content. Do NOT add project-specific analysis, git status, next-step suggestions, or any commentary beyond the reference.
</purpose>

<reference>
# GSD Command Reference

**GSD** (Get Shit Done) creates hierarchical project plans optimized for solo agentic development with Claude Code.

## Quick Start

1. `/gsd:new-project` - Initialize project (includes research, requirements, roadmap)
2. `/gsd:plan-phase 1` - Plan phase, auto-complete, and auto-advance through all phases

## Staying Updated

GSD evolves fast. Update periodically:

```bash
npx get-shit-done-cc@latest
```

## Core Workflow

```
/gsd:new-project → /gsd:plan-phase (auto-completes and advances through all phases)
```

### Project Initialization

**`/gsd:new-project`**
Initialize new project through unified flow.

One command takes you from idea to ready-for-planning:
- Deep questioning to understand what you're building
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with v1/v2/out-of-scope scoping
- Roadmap creation with phase breakdown and success criteria

Creates all `.planning/` artifacts:
- `PROJECT.md` — vision and requirements
- `config.json` — workflow mode (interactive/yolo)
- `research/` — domain research (if selected)
- `REQUIREMENTS.md` — scoped requirements with REQ-IDs
- `ROADMAP.md` — phases mapped to requirements
- `STATE.md` — project memory

Usage: `/gsd:new-project`

**`/gsd:map-codebase`**
Map an existing codebase for brownfield projects.

- Analyzes codebase with parallel Explore agents
- Creates `.planning/codebase/` with 7 focused documents
- Covers stack, architecture, structure, conventions, testing, integrations, concerns
- Use before `/gsd:new-project` on existing codebases

Usage: `/gsd:map-codebase`

### Phase Planning

**`/gsd:discuss-phase <number>`**
Help articulate your vision for a phase before planning.

- Captures how you imagine this phase working
- Creates CONTEXT.md with your vision, essentials, and boundaries
- Use when you have ideas about how something should look/feel

Usage: `/gsd:discuss-phase 2`

**`/gsd:research-phase <number>`**
Comprehensive ecosystem research for niche/complex domains.

- Discovers standard stack, architecture patterns, pitfalls
- Creates RESEARCH.md with "how experts build this" knowledge
- Use for 3D, games, audio, shaders, ML, and other specialized domains
- Goes beyond "which library" to ecosystem knowledge

Usage: `/gsd:research-phase 3`

**`/gsd:list-phase-assumptions <number>`**
See what Claude is planning to do before it starts.

- Shows Claude's intended approach for a phase
- Lets you course-correct if Claude misunderstood your vision
- No files created - conversational output only

Usage: `/gsd:list-phase-assumptions 3`

**`/gsd:plan-phase <number>`**
Create detailed execution plan for a specific phase, then auto-complete and advance.

- Generates `.planning/phases/XX-phase-name/XX-YY-PLAN.md`
- Breaks phase into concrete, actionable tasks
- Includes verification criteria and success measures
- After planning: auto-validates, marks phase complete, and advances to next phase
- Loops through all phases until milestone is complete or user interrupts

Usage: `/gsd:plan-phase 1`
Result: Plans phase 1, marks it complete, then auto-advances to plan phase 2, and so on

### Phase Completion

**`/gsd:complete-phase <phase-number>`**
Manually mark a phase as complete (typically not needed — plan-phase auto-completes).

- Validates planning artifacts exist (plans, requirement mapping)
- Displays warnings for incomplete artifacts (non-blocking)
- Marks phase complete in ROADMAP.md and updates STATE.md
- Auto-advances to next phase or prompts for milestone completion
- Commits changes with proper tracking

Usage: `/gsd:complete-phase 1`

### Editing

**`/gsd:edit-phase <phase-number> [artifact-type]`**
Revise planning artifacts for any phase.

- Discovers available artifacts (plans, research, context, roadmap)
- Routes to appropriate editing flow based on artifact type
- Makes targeted edits preserving file structure
- Commits changes with descriptive message
- Allows iterating on planning artifacts after initial creation

Usage: `/gsd:edit-phase 2`
Usage: `/gsd:edit-phase 2 plan` - Edit plan directly

### Roadmap Management

**`/gsd:add-phase <description>`**
Add new phase to end of current milestone.

- Appends to ROADMAP.md
- Uses next sequential number
- Updates phase directory structure

Usage: `/gsd:add-phase "Add admin dashboard"`

**`/gsd:insert-phase <after> <description>`**
Insert urgent work as decimal phase between existing phases.

- Creates intermediate phase (e.g., 7.1 between 7 and 8)
- Useful for discovered work that must happen mid-milestone
- Maintains phase ordering

Usage: `/gsd:insert-phase 7 "Fix critical auth bug"`
Result: Creates Phase 7.1

**`/gsd:remove-phase <number>`**
Remove a future phase and renumber subsequent phases.

- Deletes phase directory and all references
- Renumbers all subsequent phases to close the gap
- Only works on future (unstarted) phases
- Git commit preserves historical record

Usage: `/gsd:remove-phase 17`
Result: Phase 17 deleted, phases 18-20 become 17-19

### Milestone Management

**`/gsd:new-milestone <name>`**
Start a new milestone through unified flow.

- Deep questioning to understand what you're building next
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with scoping
- Roadmap creation with phase breakdown

Mirrors `/gsd:new-project` flow for brownfield projects (existing PROJECT.md).

Usage: `/gsd:new-milestone "v2.0 Features"`

**`/gsd:complete-milestone <version>`**
Archive completed milestone and prepare for next version.

- Creates MILESTONES.md entry with stats
- Archives full details to milestones/ directory
- Creates git tag for the release
- Prepares workspace for next version

Usage: `/gsd:complete-milestone 1.0.0`

### Progress Tracking

**`/gsd:progress`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from SUMMARY files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next plan or create it if missing
- Detects 100% milestone completion

Usage: `/gsd:progress`

### Session Management

**`/gsd:resume-work`**
Resume work from previous session with full context restoration.

- Reads STATE.md for project context
- Shows current position and recent progress
- Offers next actions based on project state

Usage: `/gsd:resume-work`

**`/gsd:pause-work`**
Create context handoff when pausing work mid-phase.

- Creates .continue-here file with current state
- Updates STATE.md session continuity section
- Captures in-progress work context

Usage: `/gsd:pause-work`

### Debugging

**`/gsd:debug [issue description]`**
Systematic debugging with persistent state across context resets.

- Gathers symptoms through adaptive questioning
- Creates `.planning/debug/[slug].md` to track investigation
- Investigates using scientific method (evidence → hypothesis → test)
- Survives `/clear` — run `/gsd:debug` with no args to resume
- Archives resolved issues to `.planning/debug/resolved/`

Usage: `/gsd:debug "login button doesn't work"`
Usage: `/gsd:debug` (resume active session)

### Todo Management

**`/gsd:add-todo [description]`**
Capture idea or task as todo from current conversation.

- Extracts context from conversation (or uses provided description)
- Creates structured todo file in `.planning/todos/pending/`
- Infers area from file paths for grouping
- Checks for duplicates before creating
- Updates STATE.md todo count

Usage: `/gsd:add-todo` (infers from conversation)
Usage: `/gsd:add-todo Add auth token refresh`

**`/gsd:check-todos [area]`**
List pending todos and select one to work on.

- Lists all pending todos with title, area, age
- Optional area filter (e.g., `/gsd:check-todos api`)
- Loads full context for selected todo
- Routes to appropriate action (work now, add to phase, brainstorm)
- Moves todo to done/ when work begins

Usage: `/gsd:check-todos`
Usage: `/gsd:check-todos api`

### Milestone Auditing

**`/gsd:audit-milestone [version]`**
Audit milestone completion against original intent.

- Reads all phase VERIFICATION.md files
- Checks requirements coverage
- Spawns integration checker for cross-phase wiring
- Creates MILESTONE-AUDIT.md with gaps and tech debt

Usage: `/gsd:audit-milestone`

**`/gsd:plan-milestone-gaps`**
Create phases to close gaps identified by audit.

- Reads MILESTONE-AUDIT.md and groups gaps into phases
- Prioritizes by requirement priority (must/should/nice)
- Adds gap closure phases to ROADMAP.md
- Ready for `/gsd:plan-phase` on new phases

Usage: `/gsd:plan-milestone-gaps`

### Notion Integration

**`/gsd:sync-notion`**
Push .planning/ markdown files to Notion workspace.

- Validates Notion config (API key format, parent page)
- Runs notion-sync.js with live progress output
- Creates new pages, updates changed pages, skips unchanged
- Also triggered automatically after milestone planning completes

Usage: `/gsd:sync-notion`

**`/gsd:notion-comments`**
Pull and triage unresolved comments from synced Notion pages.

- Fetches comments from Notion pages
- Identifies themes across feedback
- Maps themes to roadmap phases
- Interactive triage discussion

Usage: `/gsd:notion-comments`

### Configuration

**`/gsd:settings`**
Configure workflow toggles and model profile interactively.

- Toggle researcher, plan checker, verifier agents
- Select model profile (quality/balanced/budget)
- Updates `.planning/config.json`

Usage: `/gsd:settings`

**`/gsd:set-profile <profile>`**
Quick switch model profile for GSD agents.

- `quality` — Opus everywhere except verification
- `balanced` — Opus for planning, Sonnet for execution (default)
- `budget` — Sonnet for writing, Haiku for research/verification

Usage: `/gsd:set-profile budget`

### Utility Commands

**`/gsd:help`**
Show this command reference.

**`/gsd:update`**
Update GSD to latest version with changelog preview.

- Shows installed vs latest version comparison
- Displays changelog entries for versions you've missed
- Highlights breaking changes
- Confirms before running install
- Better than raw `npx get-shit-done-cc`

Usage: `/gsd:update`

**`/gsd:join-discord`**
Join the GSD Discord community.

- Get help, share what you're building, stay updated
- Connect with other GSD users

Usage: `/gsd:join-discord`

## Files & Structure

```
.planning/
├── PROJECT.md            # Project vision
├── ROADMAP.md            # Current phase breakdown
├── STATE.md              # Project memory & context
├── config.json           # Workflow mode & gates
├── todos/                # Captured ideas and tasks
│   ├── pending/          # Todos waiting to be worked on
│   └── done/             # Completed todos
├── debug/                # Active debug sessions
│   └── resolved/         # Archived resolved issues
├── codebase/             # Codebase map (brownfield projects)
│   ├── STACK.md          # Languages, frameworks, dependencies
│   ├── ARCHITECTURE.md   # Patterns, layers, data flow
│   ├── STRUCTURE.md      # Directory layout, key files
│   ├── CONVENTIONS.md    # Coding standards, naming
│   ├── TESTING.md        # Test setup, patterns
│   ├── INTEGRATIONS.md   # External services, APIs
│   └── CONCERNS.md       # Tech debt, known issues
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-core-features/
        ├── 02-01-PLAN.md
        └── 02-01-SUMMARY.md
```

## Workflow Modes

Set during `/gsd:new-project`:

**Interactive Mode**

- Confirms each major decision
- Pauses at checkpoints for approval
- More guidance throughout

**YOLO Mode**

- Auto-approves most decisions
- Executes plans without confirmation
- Only stops for critical checkpoints

Change anytime by editing `.planning/config.json`

## Planning Configuration

Configure how planning artifacts are managed in `.planning/config.json`:

**`planning.commit_docs`** (default: `true`)
- `true`: Planning artifacts committed to git (standard workflow)
- `false`: Planning artifacts kept local-only, not committed

When `commit_docs: false`:
- Add `.planning/` to your `.gitignore`
- Useful for OSS contributions, client projects, or keeping planning private
- All planning files still work normally, just not tracked in git

**`planning.search_gitignored`** (default: `false`)
- `true`: Add `--no-ignore` to broad ripgrep searches
- Only needed when `.planning/` is gitignored and you want project-wide searches to include it

Example config:
```json
{
  "planning": {
    "commit_docs": false,
    "search_gitignored": true
  }
}
```

## Common Workflows

**Starting a new project:**

```
/gsd:new-project        # Unified flow: questioning → research → requirements → roadmap
/clear
/gsd:plan-phase 1       # Plans phase 1, auto-completes, auto-advances through all phases
```

**Resuming work after a break:**

```
/gsd:progress  # See where you left off and continue
```

**Adding urgent mid-milestone work:**

```
/gsd:insert-phase 5 "Critical security fix"
/gsd:plan-phase 5.1    # Plans, auto-completes, and resumes remaining phases
```

**Completing a milestone:**

```
/gsd:complete-milestone 1.0.0
/clear
/gsd:new-milestone  # Start next milestone (questioning → research → requirements → roadmap)
```

**Capturing ideas during work:**

```
/gsd:add-todo                    # Capture from conversation context
/gsd:add-todo Fix modal z-index  # Capture with explicit description
/gsd:check-todos                 # Review and work on todos
/gsd:check-todos api             # Filter by area
```

**Debugging an issue:**

```
/gsd:debug "form submission fails silently"  # Start debug session
# ... investigation happens, context fills up ...
/clear
/gsd:debug                                    # Resume from where you left off
```

## Getting Help

- Read `.planning/PROJECT.md` for project vision
- Read `.planning/STATE.md` for current context
- Check `.planning/ROADMAP.md` for phase status
- Run `/gsd:progress` to check where you're up to
</reference>
