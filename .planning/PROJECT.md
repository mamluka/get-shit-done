# GSD for PMs

## What This Is

A modification of the GSD (Get Shit Done) framework that transforms it from a developer execution tool into a product management planning tool. PMs use Claude to collaboratively define projects, research domains, scope requirements, build roadmaps, and create detailed phase plans — without code execution. Supports multiple concurrent projects with git branch isolation, optional Jira integration, and PM-friendly business language throughout.

## Core Value

PMs can go from idea to fully planned, phase-by-phase project specification using a conversational AI workflow — producing artifacts that are version-controlled, historically preserved, and ready for handoff to engineering.

## Current Milestone: v1.1 Notion Integration

**Goal:** Bridge planning artifacts in git with stakeholder collaboration in Notion — push specs, pull feedback.

**Target features:**
- Notion API key setup during npx install flow
- Auto-prompt to upload planning docs after milestone completion
- Parent/child page hierarchy mirroring .planning/ structure
- Local image and external link handling in Notion pages
- Page ID tracking (notion-sync.json per project) for incremental updates
- CLI tool using @notionhq/client for all Notion operations
- Sync command to push current .md files to Notion
- Comments command to pull Notion feedback, save as .md, and triage

## Requirements

### Validated

- ✓ Project initialization via `/gsd:new-project` with deep questioning — existing
- ✓ Domain research with parallel researcher agents (stack, features, architecture, pitfalls) — existing
- ✓ Requirements definition with category scoping and REQ-IDs — existing
- ✓ Roadmap creation with phase structure, requirement mapping, success criteria — existing
- ✓ Phase planning with detailed PLAN.md creation — existing
- ✓ State management via STATE.md for project progression tracking — existing
- ✓ Config system for workflow preferences (config.json) — existing
- ✓ Git-backed artifact storage with atomic commits — existing
- ✓ Template system for consistent document generation — existing
- ✓ Multi-model agent spawning (quality/balanced/budget profiles) — existing
- ✓ Milestone lifecycle management — existing
- ✓ Path abstraction layer with multi-project folder structure — v1.0
- ✓ Git branch-per-project isolation (project/{slug}) — v1.0
- ✓ Annotated git tags for milestone versioning — v1.0
- ✓ Planning-only architecture (execution removed, tombstoned with redirects) — v1.0
- ✓ Auto-advance phase completion with validation gates — v1.0
- ✓ Edit-phase command for artifact revision — v1.0
- ✓ PM-friendly error messages and business language throughout — v1.0
- ✓ Optional Jira MCP integration with non-blocking detection — v1.0
- ✓ Safe flat-to-nested migration with timestamped backup — v1.0

### Active

- [ ] Notion API key collection during npx setup, saved to config
- [ ] Post-milestone prompt to upload planning docs to Notion
- [ ] Notion page creation with parent/child hierarchy matching .planning/ structure
- [ ] Markdown-to-Notion block formatting (headings, tables, checkboxes, code blocks)
- [ ] Local image upload and external link preservation in Notion pages
- [ ] notion-sync.json per project folder for page ID tracking
- [ ] CLI tool (notion-sync.js) using @notionhq/client for all Notion operations
- [ ] `/gsd:sync-notion` command to push .md files to Notion (create or update)
- [ ] `/gsd:notion-comments` command to pull comments, save as dated .md, triage by theme and phase

### Deferred (from v1.0)

- [ ] Dual-mode auto-detection for flat and nested folder structures
- [ ] Switch-project command (`/gsd:switch-project {name}`)
- [ ] Auto-advance pause/resume
- [ ] Phase jump (`/gsd:goto-phase {N}`)
- [ ] Stakeholder export (exec-friendly summary)
- [ ] Verbose flag for technical details on all commands

### Out of Scope

- Jira sync (pushing artifacts to Jira) — deferred, one-way sync creates divergence
- Cross-project search — grows important at scale but not needed yet
- Cross-project learning — high complexity, requires multi-project pattern matching
- Web UI or dashboard — CLI-based workflow is sufficient
- Multi-user collaboration features — git handles async collaboration
- Code execution capability — deliberately removed, this is planning-only
- Lazy Jira validation — currently checks at project creation, which works

## Context

Shipped v1.0 with 4,503 LOC JavaScript (gsd-tools.js), 28 commands, 11 agents. 212 files modified across 5 phases and 12 plans in 2 days.

Tech stack: Node.js, zero external dependencies, git-backed planning artifacts.

Architecture: Commands (slash commands) → Workflows (orchestration) → Agents (specialized subprocesses) → Utilities (gsd-tools.js). PathResolver class handles multi-project path resolution with mode detection (flat vs nested).

Key patterns established:
- Best-effort git operations (never block core workflows)
- Warning-only validation (PMs can override)
- Tombstone pattern for removed features (helpful redirects)
- Progressive disclosure for errors (business language by default, technical via GSD_VERBOSE)

## Constraints

- **Codebase**: Must modify existing GSD framework (not fork/rewrite) — preserves update path
- **Compatibility**: Changes should not break existing GSD installations that use execution
- **Runtime**: Node.js >=16.7.0, zero external dependencies except @notionhq/client for Notion integration
- **Git**: Requires git — branch/tag strategy is core to the design

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Planning-only (no execution) | PMs don't write code; execution adds complexity and confusion | ✓ Good — clean separation, tombstones provide helpful redirects |
| `.planning/{name}/v{N}/` folder structure | Preserves history of all projects and milestones in one repo | ✓ Good — clean isolation with backward compatibility |
| `project/{name}` branch convention | Clean separation between projects, main stays clean | ✓ Good — best-effort approach prevents blocking |
| Milestone = git tag | Lightweight, standard git practice, easy to reference | ✓ Good — annotated tags store metadata |
| Auto-advance phases | Reduces friction for PMs — no need to remember next command | ✓ Good — guidance-only (not automatic execution) |
| Jira MCP as optional prerequisite | PM teams likely use Jira; check availability without forcing it | ✓ Good — non-blocking with setup guides |
| PathResolver with zero dependencies | Consistency with existing codebase patterns | ✓ Good — synchronous, predictable |
| Warning-only validation | PMs may need to force-complete with incomplete planning | ✓ Good — flexibility without losing guardrails |
| Tombstone vs delete for execution files | Helpful redirects for users who try old commands | ✓ Good — graceful transition |
| "Problem:" prefix instead of "Error:" | Less alarming for PM audience | ✓ Good — consistent with business tone |
| Allow @notionhq/client dependency | Notion API is complex; SDK significantly reduces code and maintenance vs raw HTTP | — Pending |
| CLI tool over MCP for Notion | User explicitly chose .js CLI tool; MCP not available in all environments | — Pending |
| Parent/child page hierarchy | Matches .planning/ folder structure; intuitive for stakeholders browsing Notion | — Pending |

---
*Last updated: 2026-02-11 after v1.1 milestone started*
