# GSD for PMs

## What This Is

A modification of the GSD (Get Shit Done) framework that transforms it from a developer execution tool into a product management planning tool. PMs use Claude to collaboratively define projects, research domains, scope requirements, build roadmaps, and create detailed phase plans — without code execution. Supports multiple concurrent projects with git branch isolation, optional Jira integration, Notion sync for stakeholder collaboration, and PM-friendly business language throughout.

## Core Value

PMs can go from idea to fully planned, phase-by-phase project specification using a conversational AI workflow — producing artifacts that are version-controlled, historically preserved, and ready for handoff to engineering.

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
- ✓ Notion API key collection during npx setup, saved to config — v1.1
- ✓ Post-milestone prompt to upload planning docs to Notion — v1.1
- ✓ Notion page creation with parent/child hierarchy matching .planning/ structure — v1.1
- ✓ Markdown-to-Notion block formatting (headings, tables, checkboxes, code blocks) — v1.1
- ✓ Local image upload and external link preservation in Notion pages — v1.1
- ✓ notion-sync.json per project folder for page ID tracking — v1.1
- ✓ CLI tool (notion-sync.js) using @notionhq/client for all Notion operations — v1.1
- ✓ `/gsd:sync-notion` command to push .md files to Notion (create or update) — v1.1
- ✓ `/gsd:notion-comments` command to pull comments, save as dated .md, triage by theme and phase — v1.1
- ✓ Quick settings "Apply recommended?" shortcut during new-project — v1.2
- ✓ Auto-discuss before planning (full interactive discussion per phase) — v1.2
- ✓ Notion sync prompt after all phases planned with auth pre-check — v1.2
- ✓ Notion parent page URL collection during install with format detection — v1.2
- ✓ Comment understanding with Claude interpretation of stakeholder feedback — v1.3
- ✓ Long output overflow to .md file when too verbose for conversation — v1.3
- ✓ Intelligent phase integration (update existing phases vs create new phases) — v1.3
- ✓ User choice: discuss changes interactively or let Claude auto-incorporate — v1.3

### Active

#### Current Milestone: v1.4 Jira Sync

**Goal:** Push planning artifacts (requirements + phases) into Jira as actionable tickets under an epic, with Notion page links, team assignment, and create+update semantics.

**Target features:**
- Jira MCP detection with install command guidance
- Granularity choice per run (phase-level, category-level, requirement-level)
- Epic creation per milestone as parent for all tickets
- Ticket preview before pushing to Jira
- Notion page links on each ticket (requires Notion sync first)
- Team member retrieval and assignment (epic + tickets)
- Create + update with local ID tracking (jira-sync.json)

### Deferred

- [ ] Dual-mode auto-detection for flat and nested folder structures
- [ ] Switch-project command (`/gsd:switch-project {name}`)
- [ ] Auto-advance pause/resume
- [ ] Phase jump (`/gsd:goto-phase {N}`)
- [ ] Stakeholder export (exec-friendly summary)
- [ ] Verbose flag for technical details on all commands
- [ ] Smart change detection — only sync modified files based on hash comparison (ESYNC-01)
- [ ] Internal link preservation — convert relative markdown links to Notion page links (ESYNC-02)
- [ ] Selective sync filtering by path (ESYNC-03)
- [ ] Sync delete detection — remove Notion pages when local files are deleted (ESYNC-04)

### Out of Scope

- Bidirectional Jira sync (Jira → planning docs) — one-way push only, avoids divergence
- Cross-project search — grows important at scale but not needed yet
- Cross-project learning — high complexity, requires multi-project pattern matching
- Web UI or dashboard — CLI-based workflow is sufficient
- Multi-user collaboration features — git handles async collaboration
- Code execution capability — deliberately removed, this is planning-only
- Lazy Jira validation — currently checks at project creation, which works
- Bidirectional Notion sync (Notion → markdown) — divergence nightmare, conflict resolution unclear
- Real-time auto-sync on file save — rate limiting concerns, users lose control of what's published
- MCP-based Notion integration — user chose .js CLI tool; MCP not available in all environments

## Context

Shipped v1.3 with 29 plans across 16 phases over 4 milestones. v1.1 added 3,371 LOC across 55 files for Notion integration (lib/notion/*, bin/notion-sync.js). v1.2 added streamlined setup, auto-discussion, and Notion sync integration. v1.3 added comment-driven planning with interpretation, overflow handling, and phase integration workflow.

Tech stack: Node.js, @notionhq/client, @tryfabric/martian, mime-types, git-backed planning artifacts.

Architecture: Commands (slash commands) → Workflows (orchestration) → Agents (specialized subprocesses) → Utilities (gsd-tools.js). PathResolver class handles multi-project path resolution. Notion modules in lib/notion/ with CLI entry point at bin/notion-sync.js.

Key patterns established:
- Best-effort git operations (never block core workflows)
- Warning-only validation (PMs can override)
- Tombstone pattern for removed features (helpful redirects)
- Progressive disclosure for errors (business language by default, technical via GSD_VERBOSE)
- TDD with Node.js built-in test runner for Notion modules
- Error accumulation (never lose content, convert failures to warnings)
- Atomic per-file state persistence for resume-on-error
- Marker-based preprocessing for pipeline extensibility

## Constraints

- **Codebase**: Must modify existing GSD framework (not fork/rewrite) — preserves update path
- **Compatibility**: Changes should not break existing GSD installations that use execution
- **Runtime**: Node.js >=16.7.0, dependencies: @notionhq/client, @tryfabric/martian, mime-types
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
| Allow @notionhq/client dependency | Notion API is complex; SDK significantly reduces code and maintenance vs raw HTTP | ✓ Good — clean SDK integration, 3,371 LOC for full Notion pipeline |
| CLI tool over MCP for Notion | User explicitly chose .js CLI tool; MCP not available in all environments | ✓ Good — consistent CLI entry point, portable across environments |
| Parent/child page hierarchy | Matches .planning/ folder structure; intuitive for stakeholders browsing Notion | ✓ Good — breadth-first creation with parent validation |
| Martian for markdown conversion | @tryfabric/martian handles core markdown-to-Notion blocks | ✓ Good — custom preprocessor fills gaps for GSD patterns |
| Delete-all-append-new for page updates | Simpler than block-level diffing | ✓ Good — sufficient for planning docs, revisit if performance issues |
| Marker-based image preprocessing | Image URLs replaced with markers before Martian, injected after | ✓ Good — zero regression risk, keeps Martian unchanged |
| Just-in-time image upload | Upload per-file instead of batch to respect 1-hour expiry | ✓ Good — resilient for long-running syncs |
| Error accumulation pattern | Conversion errors become warnings, never lose content | ✓ Good — partial success preferred over batch failure |

---
| Jira MCP for ticket creation | MCP provides authenticated Jira access; no SDK dependency needed | — Pending |

---
*Last updated: 2026-02-12 after v1.4 milestone start*
