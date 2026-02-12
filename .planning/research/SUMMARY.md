# Project Research Summary

**Project:** v1.2 Streamlined Workflow
**Domain:** CLI workflow optimization for Node.js meta-prompting framework
**Researched:** 2026-02-12
**Confidence:** HIGH

## Executive Summary

v1.2 focuses on streamlining the new-project-to-Notion workflow in the GSD framework through four targeted improvements: quick settings shortcuts, auto-discussion before planning, Notion sync prompts, and parent page URL collection. Research reveals that all features can be implemented using Node.js built-ins (readline, URL API) with zero new dependencies, integrating cleanly into existing workflow orchestration patterns validated in v1.0/v1.1.

The recommended approach leverages existing architecture: modify workflow markdown files to insert new prompts/gates, reuse install.js readline patterns for yes/no questions, and delegate to existing utilities (gsd-tools.js, notion-sync.js) rather than creating new modules. The primary architectural insight is that GSD's markdown-based workflow orchestration is simpler than traditional orchestration frameworks and well-suited for linear phase progression with occasional user decision points.

Key risks center on configuration drift (recommended settings hardcoded separately from interactive flow) and context window bloat (chaining discuss → research → plan accumulates 20-33K tokens). Mitigation requires single-source-of-truth for defaults, token budget tracking with hard limits, and strategic `/clear` checkpoints between heavy operations. Notion integration risks include URL parsing fragility (workspace vs page URLs) and missing API key pre-checks, addressed through robust validation and early auth verification.

## Key Findings

### Recommended Stack

All v1.2 features use Node.js built-ins — no new dependencies required. This is not new development but strategic reuse of existing validated patterns.

**Core technologies:**
- **Node.js built-in readline** — yes/no prompts, "Apply recommended?" UX. Already proven in install.js for Notion API key prompts. Callback-based API matches existing patterns.
- **Node.js built-in URL** — parse Notion page URLs to extract IDs. WHATWG URL API (stable since Node.js v10) handles protocol/domain/query params safely, avoiding regex fragility.

**What NOT to use:**
- Inquirer.js (25M weekly downloads) — overkill for simple yes/no prompts; v1.2 only needs binary choices, not multi-select/autocomplete/spinners
- Orchestration frameworks (Zenaton, node-workflow) — heavy dependencies (Redis, BPMN parsers); GSD workflows are markdown + sequential prompts, not distributed state machines

**Version compatibility:**
- Node.js >=16.7.0 (already required in package.json)
- All patterns validated in install.js (lines 1510-1576) and existing workflow files

### Expected Features

**Must have (table stakes):**
- **Default/Recommended Settings Shortcut** — CLI tools universally provide `-y`/`--yes` flags (npm, apt, yarn). Users expect one-click setup.
- **Validation Feedback During Input** — users expect immediate feedback on config values (Notion URL format, API key prefix) to avoid re-doing entire process.
- **Post-Workflow Optional Actions** — CLIs prompt for related actions after completing workflows (git commit → push, npm install → start).
- **URL Format Flexibility** — tools accept various URL formats and extract IDs automatically (GitHub CLI accepts full URLs or repo slugs).

**Should have (competitive):**
- **Discussion-Before-Planning Loop** — conversational context gathering before formal planning reduces errors and improves plan quality. Research shows interactive planning receives feedback to alter steps.
- **Context-Aware Workflow Chaining** — auto-advance through discuss → plan → complete → next phase without manual commands reduces cognitive load for PMs.
- **Smart Setting Recommendations** — curated recommendations based on user type (PM vs Dev) vs generic defaults improves first-run experience.
- **Rich Interactive Prompts** — structured prompts with descriptions vs raw Y/N questions improves decision quality (already implemented in new-project workflow).

**Defer (v2+):**
- Selective Auto-Discuss (only complex phases) — wait for user feedback: "Phase 1 doesn't need discussion"
- Recommended Settings Profiles by Role — wait for evidence of different user types (technical vs non-technical PMs)
- Phase-Specific Sync (sync individual phases mid-milestone) — wait for WIP sharing use cases
- Notion Workspace Introspection (browse databases/pages in CLI) — requires Search API, complex UX, unclear value vs URL paste

### Architecture Approach

v1.2 integrates into existing workflows through targeted modifications — no new modules, only enhancements to proven patterns. GSD's three-layer architecture (Commands → Workflows → Agents → Utilities) remains unchanged.

**Major components modified:**

1. **new-project.md Step 6** — insert AskUserQuestion gate before 8-question flow. "Apply recommended or customize?" shortcut skips to config.json creation with hardcoded defaults.

2. **plan-phase.md Step 4** — insert CONTEXT.md check. If missing, offer auto-discuss (invoke discuss-phase inline) before proceeding to research/planning. CONTEXT.md created, then reload for planner.

3. **plan-phase.md Step 14d** — insert Notion sync check when milestone_complete. Auth-check before prompt, run notion-sync.js if user accepts, continue to "All Phases Complete" message.

4. **install.js promptNotionKey()** — add parent page URL prompt after API key validation. Extract page ID from URL (using URL constructor + regex), validate format, write to config.notion.parent_page_id.

**Data flow patterns:**
- Quick settings: User response → hardcoded JSON or existing AskUserQuestion flow → config.json write
- Auto-discuss: CONTEXT.md missing → AskUserQuestion → invoke discuss-phase inline → reload CONTEXT.md → pass to planner
- Notion sync: milestone_complete → auth-check → AskUserQuestion → run notion-sync.js → report results
- Parent URL: User enters URL → extractPageId() → validate length → write to config → notion-sync reads config

**Configuration changes:**
- Only addition: `config.notion.parent_page_id` (optional field)
- Fully backward compatible — no removals, no renames

### Critical Pitfalls

1. **Recommended Settings Divergence** — "Apply recommended" shortcut creates hardcoded snapshot of defaults. As framework evolves, interactive flow updates but shortcut's values become stale, creating two config classes. **Prevention:** Single source of truth (RECOMMENDED_SETTINGS constant), shared code path, integration test comparing outputs, version recommendations, CI/CD lint rule requiring updates when settings change.

2. **Context Window Bloat from Chained Workflows** — chaining discuss → research → planning accumulates 20-33K tokens (discussion 4-6K, research 8-12K, planning 5-10K, framework 3-5K). Hits three problems: exceeds effective context window (60-70% of advertised max), costs spike 3-5x, "lost in the middle" effect where earlier decisions get ignored. **Prevention:** Hard limit on chain depth (max 2 auto-advances), context checkpoints (suggest `/clear` after discussion), measure and warn at 15K+ tokens, make chaining opt-in, token budget per step (truncation).

3. **Notion URL Format Parsing Fragility** — users paste four URL types but code only handles one: page URLs work, workspace URLs fail (workspace ID ≠ page ID), shared links with query params break regex, database URLs confuse parser. **Prevention:** Robust parser with error messages, strip query params before parsing, validate via API (GET /pages/{id}), show example URL in prompt, fallback to manual ID entry if parsing fails.

4. **Missing Notion API Key Pre-Check** — user completes milestone, prompted "Upload to Notion?", says yes, workflow triggers sync which immediately fails with "Missing API key." Milestone already tagged (irreversible) but sync didn't happen. Worse if config.json exists but api_key is empty string (auth error mid-upload, partial state). **Prevention:** Strict validation (api_key && trim() !== '' && startsWith('secret_' or 'ntn_')), auth-check before prompt (skip if not configured), early failure with clear recovery, validate during install (test API call before saving), idempotent sync (safe to re-run).

5. **Technical Debt Patterns** — shortcuts that seem reasonable but create long-term problems: hardcoded recommended settings (diverges from interactive flow), chaining without context checkpoints (quality degradation), simple regex URL parser (silent failures), skipping API auth check (sync fails after irreversible milestone tag), parsing Notion URLs client-side only (fragile to format changes), auto-advance without token budget tracking (invisible quality degradation).

## Implications for Roadmap

Based on research, all four features can be developed in parallel (no shared code, different files/sections). Suggested phase structure prioritizes standalone features first, then chained features, with integration testing at each step.

### Phase 1: Quick Settings Shortcut

**Rationale:** Standalone feature, modifies only new-project.md Step 6. No dependencies on other v1.2 features. Addresses user feedback about "too many questions" during setup. Can ship independently.

**Delivers:**
- "Apply recommended or customize?" gate before 8-question flow
- Recommended values: YOLO mode, Standard depth, Parallel processing, Git tracking, all agents enabled, Balanced models
- Single-source-of-truth pattern (RECOMMENDED_SETTINGS constant)

**Addresses (from FEATURES.md):**
- Default/Recommended Settings Shortcut (table stakes)
- Smart Setting Recommendations (differentiator)

**Avoids (from PITFALLS.md):**
- Recommended Settings Divergence — implement as shared code path from day 1, not duplicated logic

**Implementation notes:**
- Use Node.js built-in readline (no dependencies)
- Extract RECOMMENDED_SETTINGS constant to prevent divergence
- Integration test: shortcut output === interactive flow with all defaults

### Phase 2: Notion Parent Page URL Configuration

**Rationale:** Standalone feature, modifies only install.js promptNotionKey(). No dependencies on other v1.2 features. Completes Notion setup during install (users currently don't know where pages will go when syncing). Can ship independently.

**Delivers:**
- Parent page URL prompt after API key validation in install.js
- extractPageId() function (URL constructor + regex for 32-char hex ID)
- Write to config.notion.parent_page_id (optional field)
- Reuses existing hierarchy-builder.js logic

**Addresses (from FEATURES.md):**
- URL Format Flexibility (table stakes)
- Validation Feedback During Input (table stakes)

**Avoids (from PITFALLS.md):**
- Notion URL Format Parsing Fragility — robust parser with error messages, strip query params, validate via API, show example URL, fallback to manual ID entry

**Implementation notes:**
- Use Node.js built-in URL constructor (no dependencies)
- Validate page ID format (32 chars hex or UUID)
- Optional field (skip if user presses Enter)

### Phase 3: Auto-Discuss Before Planning

**Rationale:** Depends on existing discuss-phase.md workflow (already stable in v1.1). Improves plan quality by gathering context before formal planning. Addresses feedback about "plans miss important details." More complex than Phase 1/2 (inserts discuss step into plan-phase loop, maintains state).

**Delivers:**
- CONTEXT.md check in plan-phase.md Step 4
- If missing, offer "Discuss first or plan directly?" prompt
- Invoke discuss-phase inline (not redirect)
- Reload CONTEXT.md after discussion, pass to researcher/planner/checker

**Addresses (from FEATURES.md):**
- Discussion-Before-Planning Loop (differentiator)
- Context-Aware Workflow Chaining (differentiator)

**Avoids (from PITFALLS.md):**
- Context Window Bloat — add `/clear` checkpoint suggestion after discussion, warn at 15K+ tokens, limit chain depth

**Implementation notes:**
- Use Node.js built-in readline for "Discuss or plan?" prompt
- Inline workflow invocation (follow all discuss-phase.md steps)
- CONTEXT.md always created before planning (no more "missing context")
- Auto-advance still works (discuss → plan → complete in one flow)

**Research flag:** STANDARD PATTERN — conversational planning well-documented, no deeper research needed during phase planning.

### Phase 4: Notion Sync Prompt After Planning

**Rationale:** Depends on existing notion-sync.js (already stable in v1.1). Closes the loop on Notion integration, addresses "I forget to sync after planning." Benefits from Phase 2 (parent page configured during install). More complex than Phase 1/2 (auth-check before prompt, error handling).

**Delivers:**
- Notion sync check in plan-phase.md Step 14d (after all phases complete)
- Auth-check before prompt (skip if not configured)
- If configured, offer "Upload planning docs to Notion?" prompt
- Run notion-sync.js if user accepts
- Report results (created/updated/skipped), continue to final message

**Addresses (from FEATURES.md):**
- Post-Workflow Optional Actions (table stakes)

**Avoids (from PITFALLS.md):**
- Missing Notion API Key Pre-Check — strict validation (api_key format), auth-check before prompt, early failure with clear recovery, idempotent sync

**Implementation notes:**
- Auth-check logic: config.notion.api_key && trim() !== '' && (startsWith('secret_') || startsWith('ntn_'))
- Only prompt when milestone_complete (not per-phase)
- Non-blocking error handling (sync fails → report error, user can run manually later)
- Reuses complete-milestone.md prompt_notion_sync pattern (lines 586-642)

**Research flag:** STANDARD PATTERN — post-workflow prompts well-documented (git, npm, docker examples), no deeper research needed.

### Phase Ordering Rationale

- **Phases 1-2 first (parallel):** Standalone features, no dependencies, can ship independently. Quick wins that address immediate user feedback.
- **Phases 3-4 second (parallel after 1-2 complete):** Depend on existing stable workflows (discuss-phase.md, notion-sync.js). More complex (chaining, auth-check) but build on validated patterns.
- **Integration testing after each pair:** Test standalone features (1-2), then chained features (3-4), then full flow (all 4 together).

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Quick Settings — npm `-y` pattern universally understood
- **Phase 2:** Notion Parent URL — GitHub CLI URL extraction pattern widely used
- **Phase 3:** Auto-Discuss — conversational planning well-documented in arXiv papers
- **Phase 4:** Notion Sync Prompt — post-workflow prompts common in git/npm/docker CLIs

**No phases need deeper research during planning.** All patterns validated through existing tools, official docs, and academic sources.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations use Node.js built-ins already validated in install.js. Zero new dependencies. |
| Features | HIGH | All features extend existing workflows (new-project, plan-phase, install). Table stakes validated via npm/git/GitHub CLI patterns. |
| Architecture | HIGH | All integration points verified against existing code (new-project.md, plan-phase.md, install.js, notion-sync.js). No new modules. |
| Pitfalls | HIGH | Pitfalls identified from official Node.js docs, context window research (arXiv), Notion API docs, and existing codebase patterns. |

**Overall confidence:** HIGH

All four features reuse existing validated stack (Node.js built-ins, readline patterns from install.js, workflow orchestration from plan-phase.md, Notion modules from v1.1). Research identified concrete pitfalls with prevention strategies tested in production (configuration drift, context bloat, URL parsing fragility, auth pre-checks).

### Gaps to Address

**Context window effectiveness tracking:** Research shows models effectively use only 10-20% of available context, but GSD doesn't yet track cumulative token usage across chained workflows. Phase 3 (Auto-Discuss) should implement token counter to warn at 15K+ tokens and suggest `/clear` at 20K+ tokens. **Validation:** Test discuss → research → plan flow; measure tokens at each step; verify warning appears.

**Notion URL format edge cases:** Research identified four URL types (page, workspace, shared links, database) but only page URLs are valid for parent page configuration. Phase 2 (Notion Parent URL) should detect workspace URLs and show specific error: "This is a workspace URL. Open a page and copy that URL." **Validation:** Unit tests for all four URL formats; error message test for workspace URL.

**Recommended settings versioning:** As GSD adds new workflow options (e.g., v1.3 adds "discussion_mode" setting), Phase 1's RECOMMENDED_SETTINGS constant must be updated. Currently no automation for this. **Future work:** Add CI/CD lint rule that requires RECOMMENDED_SETTINGS update when new-project.md Step 6 changes. **For now:** Document "last reviewed" date and manual review process.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Node.js v25.6.1 Readline Documentation](https://nodejs.org/api/readline.html) — readline API patterns
- [Node.js v25.6.1 URL Documentation](https://nodejs.org/api/url.html) — WHATWG URL API
- [Notion Working with page content](https://developers.notion.com/docs/working-with-page-content) — Page ID format specification
- [Notion API Introduction](https://developers.notion.com/reference/intro) — Authentication, page vs database objects
- [npm-init Documentation](https://docs.npmjs.com/cli/v10/commands/npm-init/) — `-y` flag pattern

**Codebase Analysis:**
- `get-shit-done/workflows/new-project.md` (lines 1-1080) — Step 6 workflow preferences flow
- `get-shit-done/workflows/plan-phase.md` (lines 1-440) — Auto-advance loop, Step 14d routing
- `get-shit-done/workflows/discuss-phase.md` (lines 1-409) — CONTEXT.md creation pattern
- `get-shit-done/workflows/complete-milestone.md` (lines 586-642) — Notion sync prompt pattern
- `bin/install.js` (lines 1492-1577) — promptNotionKey() readline validation

### Secondary (MEDIUM confidence)

**CLI UX Patterns:**
- [UX patterns for CLI tools](https://www.lucasfcosta.com/blog/ux-patterns-cli-tools) — Interactive prompts, default values
- [Command Line Interface Guidelines](https://clig.dev/) — Best practices for CLI design
- [10 design principles for delightful CLIs - Atlassian](https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis) — User experience patterns

**Conversational Planning:**
- [Conversational Planning for Personal Plans - arXiv](https://arxiv.org/html/2502.19500v1) — Interactive planning with natural language feedback
- [A Workflow Analysis of Context-driven Conversational Recommendation](https://dl.acm.org/doi/pdf/10.1145/3442381.3450123) — Structured information gathering
- [Agentic Workflows for Conversational Human-AI Interaction Design - arXiv](https://arxiv.org/html/2501.18002v1) — Context distribution between users and AI

**Context Window Management:**
- [Context Length Comparison: Leading AI Models in 2026](https://www.elvex.com/blog/context-length-comparison-ai-models-2026) — Effective capacity 60-70% of advertised max
- [Fix AI Agents that Miss Critical Details From Context Windows](https://datagrid.com/blog/optimize-ai-agent-context-windows-attention) — Lost in the middle effect
- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Scaling without bloating orchestrator prompt

**Configuration Management:**
- [Are default values an anti-pattern?](https://medium.com/@marcus.nielsen82/are-default-values-an-anti-pattern-54d5d40310f3) — Configuration drift patterns
- [Environment variables and configuration anti patterns in Node.js applications](https://lirantal.com/blog/environment-variables-configuration-anti-patterns-node-js-applications) — Node.js-specific patterns

### Tertiary (LOW confidence)

**Validation Only:**
- [How to Get Your Root Notion Page ID](https://docs.engine.so/root-notion-page-id) — ID extraction from URLs (verified with official docs)
- [Notion Update Page failing discussion](https://community.n8n.io/t/notion-update-page-failing-could-not-extract-page-id-from-url/248772) — Real-world ID extraction issues (community anecdotes)
- [Master Node.js readline/promises: Production-Ready Guide](https://kitemetric.com/blogs/mastering-node-js-readline-promises-a-production-ready-guide) — Best practices (tutorial)

---
*Research completed: 2026-02-12*
*Ready for roadmap: yes*
