# Project Research Summary

**Project:** GSD PM Planning Tool Modifications
**Domain:** AI-assisted PM planning tools (CLI framework adaptation)
**Researched:** 2026-02-10
**Confidence:** HIGH

## Executive Summary

The Get Shit Done (GSD) framework is a mature AI-orchestrated development tool built on Node.js with zero external dependencies and a git-backed markdown architecture. To transform it into a PM planning tool, we need to preserve its core strengths (AI-powered phase generation, research synthesis, markdown-native planning) while fundamentally restructuring how it manages state and organizes artifacts. The recommended approach is a phased refactoring that introduces multi-project support through folder isolation (`.planning/{project}/v{N}/`), removes execution workflows entirely, and simplifies state progression to planning-only lifecycle.

The critical risk is path management complexity. The codebase has 100+ hardcoded path references to `.planning/` that must be abstracted before any structural changes. Without a robust path abstraction layer in Phase 1, all subsequent phases will cascade into broken file operations, missing artifacts, and corrupted state. Secondary risks include auto-advance logic creating infinite loops, error messages using developer terminology that confuses PMs, and no migration path for existing GSD users leading to adoption failure.

The recommended mitigation strategy is incremental transformation with aggressive rollback procedures. Each phase must preserve backward compatibility and include escape hatches. Phase 1 (path abstraction + state refactoring) is foundational and cannot be skipped. Phases 2-3 (git integration, workflow simplification) build on that foundation. Phases 4-5 (UX polish, MCP integration) are optional polish that can wait until core functionality stabilizes.

## Key Findings

### Recommended Stack

**Preserve GSD's zero-dependency architecture.** The existing stack (Node.js >=16.7.0, native fs/path/child_process modules, Git >=2.0, YAML frontmatter, JSON-RPC 2.0 for MCP) is production-ready and requires no additions. Do not introduce new dependencies for "developer experience" improvements. Maintain the philosophical commitment to reliability through simplicity.

**Core technologies:**
- **Node.js native modules (fs, path, child_process)**: All file and git operations — eliminates external dependency surface, proven reliable in production
- **YAML frontmatter**: Planning artifact metadata — industry standard for markdown-based PM tools (89% discoverability improvement reported)
- **Git branches + tags**: Version control and milestone tracking — native audit trail for planning decisions without external database
- **JSON-RPC 2.0 (MCP)**: Jira integration transport — official 2025-11-25 specification for Model Context Protocol

**Critical additions:**
- **Folder-per-project structure**: `.planning/{project-name}/v{N}/` — enables multi-project planning, essential table stakes feature
- **Path abstraction layer**: `getProjectPath(project, version, ...segments)` utility — single source of truth for all file operations
- **Streamable HTTP with chunked encoding**: MCP transport upgrade — replaces deprecated Server-Sent Events per 03-26-2025 spec update

**What NOT to add:**
- External CLI frameworks (Commander.js, Oclif) — GSD's CLI architecture already works
- Databases (SQLite, PostgreSQL) — planning artifacts must remain human-readable markdown in git
- Markdown parsers (marked, markdown-it) — simple regex sufficient for frontmatter extraction
- npm utility packages (lodash, ramda) — native Node.js APIs handle all requirements

### Expected Features

**Must have (table stakes):**
- **Multiple concurrent projects** — PMs manage 3-5 initiatives; single-project limitation is dealbreaker
- **Edit existing plans** — plans change constantly; inability to revise = product exit trigger
- **Git integration** — version control for planning docs already exists, must preserve
- **Markdown-native format** — competitive advantage over visual tools; PMs using Claude expect markdown
- **Phase dependencies** — "Phase 3 requires Phase 1 complete" is basic sequencing requirement
- **Progress tracking** — "where are we?" asked daily; already exists via STATE.md
- **Project structure visualization** — PMs need phase/milestone view at glance; ROADMAP.md provides this
- **Requirements traceability** — "which requirement does Phase 5 address?" must be answerable

**Should have (competitive differentiators):**
- **AI-powered phase generation** — PM describes goal, AI generates realistic breakdown (already exists, core value prop)
- **Automatic research synthesis** — AI researches domain, identifies pitfalls, recommends stack (huge time saver)
- **Context-aware questioning** — AI asks smart follow-ups based on project type (quality differentiator)
- **Consistency validation** — check new phases against existing project decisions
- **Scenario branching** — git branching for "what if" planning scenarios
- **Auto-advancing phase flow** — complete Phase 1 → auto-surface Phase 2 (reduces cognitive load)
- **Assumption surfacing** — "this plan assumes authentication exists" catches gaps early
- **Stakeholder view generation** — auto-generate exec summary from technical roadmap

**Defer (v2+):**
- **Cross-project learning** — "we solved similar auth in Project X" requires pattern matching
- **Real-time collaboration hints** — file watching + notifications, adds complexity
- **Custom report templates** — beyond exec summary, lower priority
- **Gantt chart visualization** — PMs trained on MS Project want this, but markdown export to specialized tools better approach
- **Time tracking per phase** — AI orchestration times aren't meaningful for humans

### Architecture Approach

**Layered architecture with path abstraction as foundation.** The existing GSD system has clear separation: Commands → Workflows → Agents → gsd-tools.js → Storage (git). This must be preserved. The critical modification is introducing a two-tier folder isolation (project-name + version layers) that requires refactoring every path construction in gsd-tools.js (4,503 lines) and all 30+ workflow templates. The path abstraction layer must detect both v1 (flat `.planning/`) and v2 (nested `.planning/{project}/v{N}/`) structures for backward compatibility.

**State management shifts from execution-aware to planning-only.** Current STATE.md tracks "Planning / In progress / Phase complete / Ready to execute" with performance metrics. Modified STATE.md tracks "Planning / Plan complete / Milestone complete" with accumulated context (decisions, todos, blockers) but no execution data. Auto-advance logic replaces manual plan→execute→verify transitions. Active project tracking via `.planning/.active-project` resolves multi-project ambiguity.

**Major components and responsibilities:**
1. **Path Abstraction Layer (new)** — `getProjectPath(project, version, ...segments)` utility; all file operations route through this; handles v1/v2 structure detection
2. **gsd-tools.js (modified)** — add project/version context to all state/config/git operations; refactor 100+ path constructions
3. **STATE.md (modified)** — add `project_name`, `version` fields; remove execution metrics; simplify status values
4. **Workflows (modified)** — remove execute-phase.md, execute-plan.md, verify-phase.md; add edit-phase.md; update plan-phase.md with auto-advance
5. **Agents (remove)** — delete gsd-executor.md, gsd-verifier.md; keep gsd-planner, gsd-roadmapper, researchers
6. **Git Strategy (enhanced)** — add `branching_strategy: "project"` creating `planning/{project}/{version}` branches with phase tags

### Critical Pitfalls

**1. Hardcoded Path References (100+ locations) — CATASTROPHIC if not addressed first**
- Pre-migration audit: `grep -r "\.planning"` to find all references
- Path abstraction layer: Single `getProjectPath()` utility before any refactoring
- Incremental migration: Replace paths in gsd-tools.js first (highest risk), then workflows/agents
- Backward compatibility: Auto-detect v1 (flat) vs v2 (nested) structure
- Warning signs: Files end up in wrong locations, STATE.md reads return empty, "phase not found" errors

**2. State Management Assumes Flat Structure — breaks multi-project support**
- Active project tracking: `.planning/.active-project` file resolves "which project is current?"
- State schema migration: Add `project_name`, `version` to STATE.md frontmatter
- Config hierarchy: Global `.planning/config.json` + optional per-project overrides
- Warning signs: State updates affect wrong project, "phase not found" despite existence

**3. Git Branch Strategy Assumes Single Project — branch creation fails with edge cases**
- Branch naming validation: Sanitize project names (lowercase, replace spaces, strip special chars)
- Graceful operations: Check uncommitted changes before branch switches
- Milestone tag strategy: `project-{name}-milestone-{N}` prevents conflicts
- Warning signs: "invalid characters in branch name", files disappear after branch switch

**4. Auto-Advance Without Validation Gates — infinite loops or premature advancement**
- Explicit validation: Verify all plans complete, requirements mapped before allowing advancement
- User confirmation: "Phase 3 complete. Start Phase 4? [Y/n/pause]" prevents accidental progression
- Escape hatches: `/gsd:pause`, `/gsd:resume`, `/gsd:goto-phase`, `/gsd:undo-advance`
- Warning signs: Users report "CLI won't stop creating phases", phase counter skips ahead

**5. PM-Facing Error Messages Use Developer Terminology — support burden increases**
- Translation layer: "Failed to parse frontmatter YAML" → "Project status file corrupted, run /gsd:repair"
- Contextual help: Every error includes: what went wrong (simple), why it matters (impact), what to do (action)
- Progressive disclosure: Simple message default, `--verbose` flag for technical details
- Warning signs: Support requests "what's frontmatter?", PMs manually editing files to avoid errors

## Implications for Roadmap

Based on research, suggested 5-phase structure with critical-path dependencies:

### Phase 1: Foundation (Path Abstraction + State Refactoring)
**Rationale:** All subsequent phases depend on path abstraction working correctly. Cannot restructure folders without path layer. State management changes enable multi-project support. This is the highest-risk phase requiring most testing.

**Delivers:**
- `getProjectPath(project, version, ...segments)` utility in gsd-tools.js
- Path resolution that handles both v1 (flat) and v2 (nested) structures
- STATE.md schema with `project_name`, `version`, simplified status values
- `.planning/.active-project` tracking file
- Migration script: `gsd-tools migrate:to-v2` with automated backup/rollback
- Config hierarchy: Global config + per-project overrides

**Addresses features:**
- Multiple concurrent projects (folder-per-project structure)
- Project switching mechanism (active project tracking)
- Edit capability foundation (state validation)

**Avoids pitfalls:**
- Pitfall 1: Hardcoded path references (path abstraction prevents scattered updates)
- Pitfall 2: State management flat assumption (multi-project state tracking)
- Pitfall 7: No migration path for existing users (automated migration script)

**Testing requirements:**
- Unit tests for all path operations (50+ test cases covering edge cases)
- Test v1→v2 migration on 5+ varied existing projects
- Create 3 projects in parallel, verify state isolation
- Stress test with project names containing spaces, hyphens, Unicode

**Risks:**
- HIGH: Breaking existing GSD installations if path refactoring incomplete
- MEDIUM: Data loss if migration script fails halfway
- MEDIUM: State corruption from concurrent operations without locking

### Phase 2: Git Integration (Branch-Per-Project + Phase Tags)
**Rationale:** Git branching must happen after path/state foundation exists. Project-based branches depend on project context from STATE.md. Tag strategy prevents milestone history loss.

**Delivers:**
- `branching_strategy: "project"` config option
- Branch template: `planning/{project}/{version}` with sanitization
- Phase tagging: `project-{name}-milestone-{N}` after phase completion
- Milestone tagging: `project-{name}-milestone-{N}` after completion
- Git command safety: Check uncommitted changes, use execFileSync() to prevent injection
- Branch listing/switching: `/gsd:switch-project` command

**Uses stack:**
- Git >=2.0 for branch operations
- Native child_process for safe command execution
- Git tags for milestone history

**Implements architecture:**
- Git strategy enhancement from ARCHITECTURE.md (Phase 5 in architecture research)
- Branch-per-project pattern with tag-based milestone tracking

**Avoids pitfalls:**
- Pitfall 3: Git branch strategy assumptions (validation, graceful operations)
- Shell injection risks from CONCERNS.md (execFileSync with array args)

**Testing requirements:**
- Create projects with edge-case names (spaces, special chars, Unicode, very long)
- Verify branch creation, switching, tagging on 10+ project variations
- Test with uncommitted changes (should block or prompt)
- Verify tag conflicts prevented across projects

**Risks:**
- MEDIUM: Branch creation failures with invalid characters
- MEDIUM: Uncommitted changes lost during branch switches
- LOW: Tag naming conflicts (mitigated by project prefix)

### Phase 3: Workflow Simplification (Remove Execution, Add Auto-Advance)
**Rationale:** Planning-only tool shouldn't have execution workflows. Auto-advance reduces cognitive load for PMs but needs validation gates. Edit-phase capability addresses "plans change constantly" requirement.

**Delivers:**
- Remove workflows: execute-phase.md, execute-plan.md, verify-phase.md, verify-work.md
- Remove agents: gsd-executor.md, gsd-verifier.md
- Remove templates: SUMMARY.md (execution artifact), VERIFICATION.md
- Update plan-phase.md: Add auto-advance logic with validation gates
- New workflow: edit-phase.md for plan revision
- Auto-advance confirmation: "Phase N complete. Start Phase N+1? [Y/n/pause]"
- Escape hatches: `/gsd:pause`, `/gsd:resume`, `/gsd:goto-phase`, `/gsd:undo-advance`
- Progress calculation: (planned phases / total phases) × 100%

**Addresses features:**
- Edit existing plans (edit-phase workflow)
- Auto-advancing phase flow (reduces "what next?" cognitive load)
- Disable code execution (remove execute workflows)

**Avoids pitfalls:**
- Pitfall 4: Auto-advance without validation (explicit gates, user confirmation)
- Premature advancement (validate requirements mapped, plans complete)

**Testing requirements:**
- Complete phase with incomplete plans, verify advancement blocked
- Test auto-advance at last phase (should prompt for milestone completion, not crash)
- Edit phase, verify ROADMAP.md updated if dependencies changed
- Verify escape hatches work (pause, resume, goto, undo)

**Risks:**
- HIGH: Auto-advance infinite loops if phase detection broken
- MEDIUM: Users lose control without clear escape hatches
- LOW: Edit-phase creates inconsistency if dependency validation insufficient

### Phase 4: UX Polish (PM-Friendly Errors + Stakeholder Export)
**Rationale:** PM audience requires non-technical language. Error messages using "frontmatter", "git ref", "phase directory" create support burden. Stakeholder export addresses communication needs.

**Delivers:**
- Error message translation layer (developer terms → business language)
- Contextual help: Every error includes what/why/action
- Progressive disclosure: Simple default, `--verbose` for technical details
- Terminology glossary applied: "project header" not "frontmatter", "project workspace" not "git branch"
- Stakeholder export template: Generate exec summary from ROADMAP.md + REQUIREMENTS.md
- Progress feedback: "Analyzing phases... (3/15)" for long operations
- Silent failure elimination: Always show "✓ success" or "✗ failed: reason"

**Addresses features:**
- Stakeholder export template (exec-friendly summary)
- PM-friendly UX (table stakes for non-developer audience)

**Avoids pitfalls:**
- Pitfall 5: Developer terminology in errors (translation layer)
- UX pitfalls from PITFALLS.md (no progress feedback, technical errors, silent failures)

**Testing requirements:**
- Trigger all error paths, verify PM-friendly language
- Test with actual PMs: "What would you do next?" after each error
- Verify `--verbose` provides technical details for support
- Generate stakeholder export for 3+ varied projects

**Risks:**
- LOW: Translation incomplete, some errors still technical
- LOW: Export template doesn't cover all project types

### Phase 5: MCP Integration (Jira Validation, Optional Features)
**Rationale:** Jira integration is valuable but not foundational. Core PM planning must work without MCP. Soft prerequisites prevent installation blockers.

**Delivers:**
- Soft prerequisite check: Warn if Jira MCP missing but allow continuation
- Lazy validation: Check MCP only when Jira features used (not at project creation)
- Health check pattern: `validateMcpHealth('jira')` before Jira operations
- Graceful degradation: Core features work without MCP, optional features require it
- Clear installation guidance: "Install: npm install @modelcontextprotocol/server-jira"
- Config option: `skip_prerequisite_checks: true` for air-gapped environments
- Jira validation command: `/gsd:jira-validate-requirements` (optional feature)

**Uses stack:**
- JSON-RPC 2.0 for MCP communication
- Streamable HTTP with chunked encoding (MCP spec 2025-11-25)
- Atlassian Remote MCP Server for OAuth authentication

**Addresses features:**
- Jira MCP validation (table stakes feature, but implemented as optional)

**Avoids pitfalls:**
- Pitfall 6: Prerequisite check dependency hell (soft check, lazy validation)
- False positives/negatives in detection (health check with version validation)

**Testing requirements:**
- Test with MCP uninstalled (verify core features work)
- Test with MCP installed but misconfigured (verify graceful error)
- Test with MCP installed correctly (verify Jira features work)
- Test in air-gapped environment with `skip_prerequisite_checks: true`

**Risks:**
- LOW: Prerequisite check blocks users unnecessarily (mitigated by soft check)
- LOW: MCP version incompatibility (health check validates version)

### Phase Ordering Rationale

**Critical path dependencies:**
- Phase 2 depends on Phase 1: Git branch operations need project/version context from STATE.md
- Phase 3 depends on Phase 1+2: Auto-advance logic reads STATE.md, needs git tagging from Phase 2
- Phase 4 is independent but builds on Phase 3: Can't polish UX until workflows finalized
- Phase 5 is fully independent: MCP integration doesn't affect core planning flow

**Parallel execution opportunities:**
- Phase 4 can start during Phase 3: Error message translation doesn't depend on workflow completion
- Phase 5 can be developed independently: MCP is optional, can be added anytime after Phase 1

**Risk mitigation through sequencing:**
- Phase 1 first prevents cascading path failures in all other phases
- Phase 2 after Phase 1 prevents git operations on wrong directory structure
- Phase 3 after Phase 2 ensures auto-advance has stable git context
- Phase 4 late allows real usage patterns to inform UX improvements
- Phase 5 last prevents MCP issues from blocking core development

**Rollback strategy per phase:**
- Phase 1 rollback: Feature flag `nested_structure: false` reverts to flat structure
- Phase 2 rollback: Switch to main branch, set `branching_strategy: "none"`
- Phase 3 rollback: Restore removed workflows from `.archive/`, set `execution_enabled: true`
- Phase 4 rollback: Revert error translations, keep technical messages
- Phase 5 rollback: Set `enable_jira: false`, core features unaffected

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 1:** State machine design patterns for planning-only lifecycle (medium confidence from current research)
- **Phase 3:** Auto-advance validation logic (edge cases need exploration — last phase, circular dependencies, blocked phases)
- **Phase 5:** MCP health check implementation (MCP best practices from mcpcat.io are 2025 guidance, may evolve)

**Phases with standard patterns (skip detailed research-phase):**
- **Phase 2:** Git branching strategies are well-documented (DataCamp guide, Java Code Geeks 2026 strategies)
- **Phase 4:** UX error message patterns established (Smashing Magazine validation guide, Tenet UX mistakes guide)

**Architecture research already comprehensive:**
- ARCHITECTURE.md provides complete component modification matrix
- Build order, integration points, risk areas, rollback procedures documented
- Testing strategy per component included (no additional research needed)

**Stack research definitive:**
- STACK.md has HIGH confidence rating based on official MCP specification
- Zero-dependency philosophy confirmed with existing GSD codebase
- No ambiguity on technology choices (all decisions justified with sources)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official MCP specification (2025-11-25), Node.js native APIs verified, existing GSD codebase validates approach |
| Features | MEDIUM | 25+ PM tool sources confirm table stakes vs differentiators, but user validation needed for priority ranking |
| Architecture | HIGH | Existing codebase fully analyzed (CONCERNS.md, STRUCTURE.md), component boundaries clear, modification strategy detailed |
| Pitfalls | HIGH | Based on actual GSD codebase analysis + industry refactoring patterns, critical risks identified with specific prevention |

**Overall confidence:** HIGH

**Rationale:**
- Stack and architecture research grounded in official documentation and existing working codebase
- Features research covers 25+ sources across PM tools, AI workflows, markdown planning, and git collaboration
- Pitfalls research combines codebase-specific concerns (CONCERNS.md analysis) with industry best practices
- MCP integration has official specification (modelcontextprotocol.io) and Atlassian implementation guide
- Zero-dependency philosophy proven in production with existing GSD framework

**Confidence qualifiers:**
- Feature prioritization (P1/P2/P3) needs PM user validation before finalizing roadmap
- Auto-advance validation gates may need iteration based on real usage patterns
- Error message translations should be tested with actual PMs, not just developer assumptions
- MCP health check implementation may evolve as MCP specification matures (currently at 2025-11-25 spec)

### Gaps to Address

**Multi-project state locking:**
- Research covers single-user workflow extensively, but concurrent operations from multiple users mentioned only briefly
- Need to validate: What happens if two users plan different projects simultaneously?
- Mitigation during Phase 1: Add file locking mechanism (`.planning/.lock`) or atomic STATE.md updates

**Project name character restrictions:**
- PITFALLS.md recommends "alphanumeric + hyphens only" for safety, but FEATURES.md shows PMs expect natural language names
- Gap: Balance between safety (preventing injection, git issues) and UX (allowing "Q1 Mobile App" as project name)
- Mitigation during Phase 1: Define clear sanitization rules, test with real PM project names, document restrictions

**Migration verification completeness:**
- PITFALLS.md specifies verification checks (phases present, STATE.md readable, ROADMAP.md parseable)
- Gap: No specification for what "parseable" means or how to validate ROADMAP.md structure without execution
- Mitigation during Phase 1: Define ROADMAP.md validation schema, implement `gsd-tools validate:roadmap` command

**Stakeholder export format options:**
- FEATURES.md mentions PMs want "PDF/slides" but implementation details missing
- Gap: What format? Markdown to PDF? HTML? Specific template structure?
- Mitigation during Phase 4: Research markdown-to-PDF options (pandoc, markdown-pdf), define minimal template, iterate based on PM feedback

**Cross-project learning implementation:**
- Deferred to v2+ but no concrete approach specified
- Gap: How to detect similar patterns across projects? Full-text search? Semantic similarity? Manual tagging?
- Mitigation: Defer architectural decision until v1 adoption validates need

**MCP version compatibility matrix:**
- STACK.md cites MCP spec 2025-11-25 but doesn't specify minimum/maximum compatible versions
- Gap: Will health check accept any MCP server? Specific version range for Jira MCP?
- Mitigation during Phase 5: Document tested MCP versions, implement version range check in health validation

## Sources

### Primary (HIGH confidence)
- **Model Context Protocol Specification 2025-11-25** ([modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2025-11-25)) — MCP protocol requirements, JSON-RPC 2.0, Streamable HTTP transport
- **Atlassian Remote MCP Server** ([atlassian.com](https://www.atlassian.com/blog/announcements/remote-mcp-server)) — Jira MCP integration patterns, OAuth authentication
- **GSD Codebase Analysis** (Internal: `.planning/codebase/CONCERNS.md`, `STRUCTURE.md`) — Technical debt identification, fragile areas, directory layout
- **Node.js Documentation** (Official) — Native module APIs (fs, path, child_process), feature availability by version
- **Git Documentation** (Official) — Branch naming rules, tag strategies, command safety

### Secondary (MEDIUM confidence)
- **Backlog.md Repository** ([github.com/MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md)) — Markdown-native folder structure patterns, versioning approaches
- **MCP Best Practices Guide** ([modelcontextprotocol.info](https://modelcontextprotocol.info/docs/best-practices/)) — Server health checks, discovery patterns
- **PM Tool Feature Analysis** (25+ sources: Wrike, Monday.com, Asana, Jira, Linear guides from 2026) — Table stakes vs differentiators, workflow patterns
- **Git Branching Strategies 2026** ([DataCamp](https://www.datacamp.com/tutorial/git-branching-strategy-guide), [Java Code Geeks](https://www.javacodegeeks.com/2025/11/agile-git-branching-strategies-in-2026.html)) — Branch-per-project patterns, tag strategies
- **Code Refactoring Best Practices** ([Tembo](https://www.tembo.io/blog/code-refactoring), [CodeSee](https://www.codesee.io/learning-center/code-refactoring)) — Path abstraction, incremental migration

### Tertiary (LOW confidence, requires validation)
- **AI Project Management Trends** ([Forecast 2026 tools](https://www.forecast.app/blog/10-best-ai-project-management-software), [Zapier best AI tools](https://zapier.com/blog/best-ai-project-management-tools/)) — Market trends, not technical specifications
- **Product Management Workflows 2026** ([Productside AI workflows](https://productside.com/the-ai-product-management-workflows-2026/), [Medium PM preparation](https://medium.com/design-bootcamp/what-every-product-manager-should-prepare-for-in-2026-ec810c33c675)) — Directional guidance, not implementation patterns
- **State Machine Workflows** ([Workflow Engine comparison](https://workflowengine.io/blog/workflow-engine-vs-state-machine/), [Microsoft WF docs](https://learn.microsoft.com/en-us/dotnet/framework/windows-workflow-foundation/state-machine-workflows)) — General patterns, need adaptation to CLI context

---
*Research completed: 2026-02-10*
*Ready for roadmap: yes*
*Synthesized from: STACK.md (HIGH confidence), FEATURES.md (MEDIUM confidence), ARCHITECTURE.md (HIGH confidence), PITFALLS.md (HIGH confidence)*
