# gsd-pm

A meta-prompting, context engineering and spec-driven development system for Claude Code, OpenCode, and Gemini CLI.

This is a personal fork of [get-shit-done](https://github.com/glittercowboy/get-shit-done) by [TÂCHES (Lex Christopherson)](https://github.com/glittercowboy), extended with Notion/Jira sync and other workflow additions.

## What It Does

GSD solves context rot — the quality degradation that happens as Claude fills its context window. It gives Claude everything it needs to do the work *and* verify it, through structured context engineering, multi-agent orchestration, and atomic git commits.

Behind the scenes: XML prompt formatting, subagent orchestration, state management. What you see: a few `/gsd-pm:*` commands that just work.

## Install

```bash
npx @david-xpn/gsd-pm@latest
```

The installer prompts you to choose a runtime (Claude Code, OpenCode, Gemini) and location (global or local).

Verify with `/gsd-pm:help` inside your chosen runtime.

## Core Workflow

```
/gsd-pm:new-project          # Questions -> research -> requirements -> roadmap
/gsd-pm:discuss-phase 1      # Capture implementation decisions (optional)
/gsd-pm:plan-phase 1         # Research + plan + verify + auto-advance
/gsd-pm:verify-work 1        # Manual user acceptance testing
/gsd-pm:complete-milestone   # Archive milestone, tag release
/gsd-pm:new-milestone        # Start next version
```

## Commands

| Command | What it does |
|---------|--------------|
| `/gsd-pm:new-project` | Full initialization: questions, research, requirements, roadmap |
| `/gsd-pm:discuss-phase [N]` | Capture implementation decisions before planning |
| `/gsd-pm:plan-phase [N]` | Research + plan + verify + auto-complete + auto-advance |
| `/gsd-pm:verify-work [N]` | Manual user acceptance testing |
| `/gsd-pm:audit-milestone` | Verify milestone achieved its definition of done |
| `/gsd-pm:complete-milestone` | Archive milestone, tag release |
| `/gsd-pm:new-milestone` | Start next version |
| `/gsd-pm:progress` | Where am I? What's next? |
| `/gsd-pm:map-codebase` | Analyze existing codebase before new-project |
| `/gsd-pm:add-phase` | Append phase to roadmap |
| `/gsd-pm:insert-phase [N]` | Insert urgent work between phases |
| `/gsd-pm:remove-phase [N]` | Remove future phase, renumber |
| `/gsd-pm:pause-work` | Create handoff when stopping mid-phase |
| `/gsd-pm:resume-work` | Restore from last session |
| `/gsd-pm:settings` | Configure model profile and workflow agents |
| `/gsd-pm:debug [desc]` | Systematic debugging with persistent state |
| `/gsd-pm:help` | Show all commands |

## How It Works

### Context Engineering

| File | Purpose |
|------|---------|
| `PROJECT.md` | Project vision, always loaded |
| `research/` | Ecosystem knowledge |
| `REQUIREMENTS.md` | Scoped v1/v2 requirements with phase traceability |
| `ROADMAP.md` | Where you're going, what's done |
| `STATE.md` | Decisions, blockers, position across sessions |
| `PLAN.md` | Atomic task with XML structure, verification steps |
| `SUMMARY.md` | What happened, what changed, committed to history |

### Multi-Agent Orchestration

Every stage uses a thin orchestrator that spawns specialized agents, collects results, and routes to the next step. Your main context window stays at 30-40% while the heavy work happens in fresh subagent contexts.

### Atomic Git Commits

Each task gets its own commit immediately after completion — traceable, independently revertable, and meaningful for `git bisect`.

## Configuration

Settings live in `.planning/config.json`. Configure during `/gsd-pm:new-project` or update with `/gsd-pm:settings`.

### Model Profiles

| Profile | Planning | Execution | Verification |
|---------|----------|-----------|--------------|
| `quality` | Opus | Opus | Sonnet |
| `balanced` (default) | Opus | Sonnet | Sonnet |
| `budget` | Sonnet | Sonnet | Haiku |

Switch with `/gsd-pm:set-profile budget`.

## Fork Changes

This fork adds:
- Notion two-way sync (`/gsd-pm:sync-notion`)
- Jira import (`/gsd-pm:sync-jira`)
- External spec ingestion from Notion/Jira
- Various workflow refinements

## Credits

Originally created by [TÂCHES (Lex Christopherson)](https://github.com/glittercowboy) as [get-shit-done](https://github.com/glittercowboy/get-shit-done).

## License

MIT License. See [LICENSE](LICENSE) for details.
