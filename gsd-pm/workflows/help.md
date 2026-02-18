<purpose>
Display the complete GSD command reference. Output ONLY the reference content. Do NOT add project-specific analysis, git status, next-step suggestions, or any commentary beyond the reference.
</purpose>

<reference>
# GSD Command Reference

**GSD** (Get Shit Done) creates hierarchical project plans optimized for solo agentic development with Claude Code.

## Quick Start

1. `/gsd-pm:new-project` - Initialize project (includes research, requirements, roadmap)
2. `/gsd-pm:plan-phase 1` - Plan phase, auto-complete, and auto-advance through all phases

## Staying Updated

GSD evolves fast. Update periodically:

```bash
npx @david-xpn/gsd-pm@latest
```

## Core Workflow

```
/gsd-pm:new-project → /gsd-pm:plan-phase (auto-completes and advances through all phases)
```

### Project Initialization

**`/gsd-pm:new-project`**
Initialize new project through unified flow.

One command takes you from idea to ready-for-planning:
- Deep questioning to understand what you're building
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with v1/v2/out-of-scope scoping
- Roadmap creation with phase breakdown and success criteria

Creates all `.planning-pm/` artifacts:
- `PROJECT.md` — vision and requirements
- `config.json` — workflow mode (interactive/yolo)
- `research/` — domain research (if selected)
- `REQUIREMENTS.md` — scoped requirements with REQ-IDs
- `ROADMAP.md` — phases mapped to requirements
- `STATE.md` — project memory

Usage: `/gsd-pm:new-project`

**`/gsd-pm:map-codebase`**
Map an existing codebase for brownfield projects.

- Analyzes codebase with parallel Explore agents
- Creates `.planning-pm/codebase/` with 7 focused documents
- Covers stack, architecture, structure, conventions, testing, integrations, concerns
- Use before `/gsd-pm:new-project` on existing codebases

Usage: `/gsd-pm:map-codebase`

### Phase Planning

**`/gsd-pm:discuss-phase <number>`**
Help articulate your vision for a phase before planning.

- Captures how you imagine this phase working
- Creates CONTEXT.md with your vision, essentials, and boundaries
- Use when you have ideas about how something should look/feel

Usage: `/gsd-pm:discuss-phase 2`

**`/gsd-pm:research-phase <number>`**
Comprehensive ecosystem research for niche/complex domains.

- Discovers standard stack, architecture patterns, pitfalls
- Creates RESEARCH.md with "how experts build this" knowledge
- Use for 3D, games, audio, shaders, ML, and other specialized domains
- Goes beyond "which library" to ecosystem knowledge

Usage: `/gsd-pm:research-phase 3`

**`/gsd-pm:list-phase-assumptions <number>`**
See what Claude is planning to do before it starts.

- Shows Claude's intended approach for a phase
- Lets you course-correct if Claude misunderstood your vision
- No files created - conversational output only

Usage: `/gsd-pm:list-phase-assumptions 3`

**`/gsd-pm:plan-phase <number>`**
Create detailed execution plan for a specific phase, then auto-complete and advance.

- Generates `.planning-pm/phases/XX-phase-name/XX-YY-PLAN.md`
- Breaks phase into concrete, actionable tasks
- Includes verification criteria and success measures
- After planning: auto-validates, marks phase complete, and advances to next phase
- Loops through all phases until milestone is complete or user interrupts

Usage: `/gsd-pm:plan-phase 1`
Result: Plans phase 1, marks it complete, then auto-advances to plan phase 2, and so on

### Phase Completion

**`/gsd-pm:complete-phase <phase-number>`**
Manually mark a phase as complete (typically not needed — plan-phase auto-completes).

- Validates planning artifacts exist (plans, requirement mapping)
- Displays warnings for incomplete artifacts (non-blocking)
- Marks phase complete in ROADMAP.md and updates STATE.md
- Auto-advances to next phase or prompts for milestone completion
- Commits changes with proper tracking

Usage: `/gsd-pm:complete-phase 1`

### Editing

**`/gsd-pm:edit-phase <phase-number> [artifact-type]`**
Revise planning artifacts for any phase.

- Discovers available artifacts (plans, research, context, roadmap)
- Routes to appropriate editing flow based on artifact type
- Makes targeted edits preserving file structure
- Commits changes with descriptive message
- Allows iterating on planning artifacts after initial creation

Usage: `/gsd-pm:edit-phase 2`
Usage: `/gsd-pm:edit-phase 2 plan` - Edit plan directly

### Roadmap Management

**`/gsd-pm:add-phase <description>`**
Add new phase to end of current milestone.

- Appends to ROADMAP.md
- Uses next sequential number
- Updates phase directory structure

Usage: `/gsd-pm:add-phase "Add admin dashboard"`

**`/gsd-pm:insert-phase <after> <description>`**
Insert urgent work as decimal phase between existing phases.

- Creates intermediate phase (e.g., 7.1 between 7 and 8)
- Useful for discovered work that must happen mid-milestone
- Maintains phase ordering

Usage: `/gsd-pm:insert-phase 7 "Fix critical auth bug"`
Result: Creates Phase 7.1

**`/gsd-pm:remove-phase <number>`**
Remove a future phase and renumber subsequent phases.

- Deletes phase directory and all references
- Renumbers all subsequent phases to close the gap
- Only works on future (unstarted) phases
- Git commit preserves historical record

Usage: `/gsd-pm:remove-phase 17`
Result: Phase 17 deleted, phases 18-20 become 17-19

### Milestone Management

**`/gsd-pm:new-milestone <name>`**
Start a new milestone through unified flow.

- Deep questioning to understand what you're building next
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with scoping
- Roadmap creation with phase breakdown

Mirrors `/gsd-pm:new-project` flow for brownfield projects (existing PROJECT.md).

Usage: `/gsd-pm:new-milestone "v2.0 Features"`

**`/gsd-pm:complete-milestone <version>`**
Archive completed milestone and prepare for next version.

- Creates MILESTONES.md entry with stats
- Archives full details to milestones/ directory
- Creates git tag for the release
- Prepares workspace for next version

Usage: `/gsd-pm:complete-milestone 1.0.0`

### Progress Tracking

**`/gsd-pm:progress`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from SUMMARY files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next plan or create it if missing
- Detects 100% milestone completion

Usage: `/gsd-pm:progress`

### Session Management

**`/gsd-pm:resume-work`**
Resume work from previous session with full context restoration.

- Reads STATE.md for project context
- Shows current position and recent progress
- Offers next actions based on project state

Usage: `/gsd-pm:resume-work`

**`/gsd-pm:pause-work`**
Create context handoff when pausing work mid-phase.

- Creates .continue-here file with current state
- Updates STATE.md session continuity section
- Captures in-progress work context

Usage: `/gsd-pm:pause-work`

### Debugging

**`/gsd-pm:debug [issue description]`**
Systematic debugging with persistent state across context resets.

- Gathers symptoms through adaptive questioning
- Creates `.planning-pm/debug/[slug].md` to track investigation
- Investigates using scientific method (evidence → hypothesis → test)
- Survives `/clear` — run `/gsd-pm:debug` with no args to resume
- Archives resolved issues to `.planning-pm/debug/resolved/`

Usage: `/gsd-pm:debug "login button doesn't work"`
Usage: `/gsd-pm:debug` (resume active session)

### Todo Management

**`/gsd-pm:add-todo [description]`**
Capture idea or task as todo from current conversation.

- Extracts context from conversation (or uses provided description)
- Creates structured todo file in `.planning-pm/todos/pending/`
- Infers area from file paths for grouping
- Checks for duplicates before creating
- Updates STATE.md todo count

Usage: `/gsd-pm:add-todo` (infers from conversation)
Usage: `/gsd-pm:add-todo Add auth token refresh`

**`/gsd-pm:check-todos [area]`**
List pending todos and select one to work on.

- Lists all pending todos with title, area, age
- Optional area filter (e.g., `/gsd-pm:check-todos api`)
- Loads full context for selected todo
- Routes to appropriate action (work now, add to phase, brainstorm)
- Moves todo to done/ when work begins

Usage: `/gsd-pm:check-todos`
Usage: `/gsd-pm:check-todos api`

### Milestone Auditing

**`/gsd-pm:audit-milestone [version]`**
Audit milestone completion against original intent.

- Reads all phase VERIFICATION.md files
- Checks requirements coverage
- Spawns integration checker for cross-phase wiring
- Creates MILESTONE-AUDIT.md with gaps and tech debt

Usage: `/gsd-pm:audit-milestone`

**`/gsd-pm:plan-milestone-gaps`**
Create phases to close gaps identified by audit.

- Reads MILESTONE-AUDIT.md and groups gaps into phases
- Prioritizes by requirement priority (must/should/nice)
- Adds gap closure phases to ROADMAP.md
- Ready for `/gsd-pm:plan-phase` on new phases

Usage: `/gsd-pm:plan-milestone-gaps`

### External Spec Import

**`/gsd-pm:use-external-spec`**
Import a spec from Jira or Notion into a new project or milestone.

- Interactive router: asks source (Jira/Notion) and target (project/milestone)
- Fetches content, writes `.planning-pm/external-spec.md`, then runs target in auto mode
- Combines fetch + create in one command

Usage: `/gsd-pm:use-external-spec`

**`/gsd-pm:new-project-from-jira [PROJ-123]`**
Import a Jira issue as spec and initialize a new project.

- Fetches Jira issue content (handles epics with children)
- Writes `.planning-pm/external-spec.md`
- Runs `/gsd-pm:new-project --auto` with the imported spec

Usage: `/gsd-pm:new-project-from-jira PROJ-123`

**`/gsd-pm:new-milestone-from-jira [PROJ-123]`**
Import a Jira issue as spec and start a new milestone.

- Fetches Jira issue content (handles epics with children)
- Writes `.planning-pm/external-spec.md`
- Runs `/gsd-pm:new-milestone --auto` with the imported spec

Usage: `/gsd-pm:new-milestone-from-jira PROJ-123`

**`/gsd-pm:new-project-from-notion [notion-url]`**
Import a Notion page as spec and initialize a new project.

- Fetches Notion page content (includes sub-pages)
- Writes `.planning-pm/external-spec.md`
- Runs `/gsd-pm:new-project --auto` with the imported spec

Usage: `/gsd-pm:new-project-from-notion https://notion.so/my-spec-page`

**`/gsd-pm:new-milestone-from-notion [notion-url]`**
Import a Notion page as spec and start a new milestone.

- Fetches Notion page content (includes sub-pages)
- Writes `.planning-pm/external-spec.md`
- Runs `/gsd-pm:new-milestone --auto` with the imported spec

Usage: `/gsd-pm:new-milestone-from-notion https://notion.so/my-spec-page`

### Notion Integration

**`/gsd-pm:sync-notion`**
Push .planning-pm/ markdown files to Notion workspace.

- Validates Notion config (API key format, parent page)
- Runs notion-sync.js with live progress output
- Creates new pages, updates changed pages, skips unchanged
- Also triggered automatically after milestone planning completes

Usage: `/gsd-pm:sync-notion`

**`/gsd-pm:notion-comments`**
Pull and triage unresolved comments from synced Notion pages.

- Fetches comments from Notion pages
- Identifies themes across feedback
- Maps themes to roadmap phases
- Interactive triage discussion

Usage: `/gsd-pm:notion-comments`

### Configuration

**`/gsd-pm:settings`**
Configure workflow toggles and model profile interactively.

- Toggle researcher, plan checker, verifier agents
- Select model profile (quality/balanced/budget)
- Updates `.planning-pm/config.json`

Usage: `/gsd-pm:settings`

**`/gsd-pm:set-profile <profile>`**
Quick switch model profile for GSD agents.

- `quality` — Opus everywhere except verification
- `balanced` — Opus for planning, Sonnet for execution (default)
- `budget` — Sonnet for writing, Haiku for research/verification

Usage: `/gsd-pm:set-profile budget`

### Utility Commands

**`/gsd-pm:help`**
Show this command reference.

**`/gsd-pm:update`**
Update GSD to latest version with changelog preview.

- Shows installed vs latest version comparison
- Displays changelog entries for versions you've missed
- Highlights breaking changes
- Confirms before running install
- Better than raw `npx @david-xpn/gsd-pm`

Usage: `/gsd-pm:update`

## Files & Structure

```
.planning-pm/
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

Set during `/gsd-pm:new-project`:

**Interactive Mode**

- Confirms each major decision
- Pauses at checkpoints for approval
- More guidance throughout

**YOLO Mode**

- Auto-approves most decisions
- Executes plans without confirmation
- Only stops for critical checkpoints

Change anytime by editing `.planning-pm/config.json`

## Planning Configuration

Configure how planning artifacts are managed in `.planning-pm/config.json`:

**`planning.commit_docs`** (default: `true`)
- `true`: Planning artifacts committed to git (standard workflow)
- `false`: Planning artifacts kept local-only, not committed

When `commit_docs: false`:
- Add `.planning-pm/` to your `.gitignore`
- Useful for OSS contributions, client projects, or keeping planning private
- All planning files still work normally, just not tracked in git

**`planning.search_gitignored`** (default: `false`)
- `true`: Add `--no-ignore` to broad ripgrep searches
- Only needed when `.planning-pm/` is gitignored and you want project-wide searches to include it

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
/gsd-pm:new-project        # Unified flow: questioning → research → requirements → roadmap
/clear
/gsd-pm:plan-phase 1       # Plans phase 1, auto-completes, auto-advances through all phases
```

**Resuming work after a break:**

```
/gsd-pm:progress  # See where you left off and continue
```

**Adding urgent mid-milestone work:**

```
/gsd-pm:insert-phase 5 "Critical security fix"
/gsd-pm:plan-phase 5.1    # Plans, auto-completes, and resumes remaining phases
```

**Completing a milestone:**

```
/gsd-pm:complete-milestone 1.0.0
/clear
/gsd-pm:new-milestone  # Start next milestone (questioning → research → requirements → roadmap)
```

**Capturing ideas during work:**

```
/gsd-pm:add-todo                    # Capture from conversation context
/gsd-pm:add-todo Fix modal z-index  # Capture with explicit description
/gsd-pm:check-todos                 # Review and work on todos
/gsd-pm:check-todos api             # Filter by area
```

**Debugging an issue:**

```
/gsd-pm:debug "form submission fails silently"  # Start debug session
# ... investigation happens, context fills up ...
/clear
/gsd-pm:debug                                    # Resume from where you left off
```

## Getting Help

- Read `.planning-pm/PROJECT.md` for project vision
- Read `.planning-pm/STATE.md` for current context
- Check `.planning-pm/ROADMAP.md` for phase status
- Run `/gsd-pm:progress` to check where you're up to
</reference>
