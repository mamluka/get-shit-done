# Pitfalls Research

**Domain:** Workflow Streamlining (v1.2 milestone - adding shortcuts and automations to existing GSD framework)
**Researched:** 2026-02-12
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Recommended Settings Divergence

**What goes wrong:**
"Apply recommended settings" shortcut creates a snapshot of defaults at implementation time. As the framework evolves, the step-by-step settings flow updates (new options, changed defaults, different recommendations), but the shortcut's hardcoded "recommended" values become stale. Users who use the shortcut get outdated settings, while users who go step-by-step get current best practices. This creates two classes of configurations that behave differently, making debugging and support nightmares.

**Why it happens:**
The shortcut is implemented as a separate code path that directly sets values (e.g., `config.workflow.research = true`) instead of delegating to the same underlying mechanism the interactive flow uses. When the interactive flow changes (new workflow option added, default profile changes from "balanced" to "quality"), the shortcut code isn't updated in parallel.

**How to avoid:**
- **Single source of truth:** Define recommended settings as data (e.g., `RECOMMENDED_SETTINGS` constant or JSON file), not duplicated logic
- **Shared code path:** Shortcut should invoke the same setter functions as interactive flow, passing `answers = RECOMMENDED_SETTINGS`
- **Version the recommendations:** Track when recommended settings were last reviewed (e.g., `// Last reviewed: 2026-02-12 for v1.2`)
- **Test coverage:** Integration test that compares shortcut output to interactive flow output with all defaults selected
- **Update trigger:** When adding new settings to interactive flow, CI/CD lint rule requires updating RECOMMENDED_SETTINGS constant

**Warning signs:**
- User reports different behavior after using shortcut vs. interactive flow
- Settings file has unexpected values (e.g., `research: false` when shortcut docs say "research enabled")
- Support issues cluster around "I used recommended settings but X doesn't work"
- Git blame shows interactive flow changed recently but shortcut code hasn't

**Phase to address:**
Phase addressing "Apply recommended settings" feature (likely early in v1.2). Implement as DRY abstraction from day 1 — refactoring diverged code paths is harder than preventing divergence.

---

### Pitfall 2: Context Window Bloat from Chained Workflows

**What goes wrong:**
Chaining discuss-phase → research → planning in one session accumulates massive context: discussion transcript (4-6K tokens), research results (8-12K tokens), planning artifacts (5-10K tokens), plus framework instructions (3-5K tokens). Total: 20-33K tokens before user even starts. This hits three problems: (1) Exceeds effective context window (~60-70% of advertised max), causing "lost in the middle" where model misses earlier decisions. (2) Costs spike 3-5x vs. separate sessions. (3) Model performance degrades — verbose discussions early in context get ignored during planning.

**Why it happens:**
Auto-advance feels smooth (no manual command invocation), so it's tempting to chain everything. Workflow authors see "200K context window" and assume chaining is free. Real-world research shows models effectively use only 10-20% of available context, and information in the middle gets lost. Chain-of-thought (discussion) improves quality but consumes massive context. Trade-off between seamless UX and context efficiency isn't obvious until users hit degraded output quality.

**How to avoid:**
- **Hard limit on chain depth:** Max 2 auto-advances per session (e.g., discuss → plan, then STOP; or plan → auto-complete, then STOP)
- **Context checkpoints:** After discussion, write CONTEXT.md and suggest `/clear` before planning: "Discussion complete. `/clear` recommended before planning to free context window."
- **Measure and warn:** Track cumulative tokens (count discussion + research + planning prompts). If > 15K, warn: "Context heavy (15K+ tokens). Consider `/clear` for better quality."
- **Make chaining opt-in:** Default to single-step execution. Require `--chain` flag or config setting for auto-advance
- **Token budget per step:** Discussion agent limited to 3K tokens output, research to 8K, planning to 10K — enforced truncation prevents runaway growth

**Warning signs:**
- Users report "planner ignored my discussion decisions" (information lost in middle)
- Token costs 3-5x higher than expected for milestone
- Quality degrades in later phases (model has less effective context remaining)
- Users manually run `/clear` between steps (signal that chaining is too aggressive)

**Phase to address:**
Phase implementing auto-advance from plan-phase (current v1.1 behavior). Add context budget tracking BEFORE extending chains further. Phase adding discuss-phase integration should include `/clear` checkpoint, not seamless chaining.

---

### Pitfall 3: Notion URL Format Parsing Fragility

**What goes wrong:**
Users paste four types of Notion URLs, but code only handles one:
1. **Page URLs:** `https://www.notion.so/WORKSPACE-PAGE_ID` (works)
2. **Workspace URLs:** `https://www.notion.so/WORKSPACE_NAME-WORKSPACE_ID` (fails — workspace ID ≠ page ID)
3. **Shared links:** `https://notion.so/PAGE_ID?pvs=21` (query params break regex)
4. **Database URLs:** `https://www.notion.so/DATABASE_ID?v=VIEW_ID` (database ID works like page ID, but view param confuses parser)

Code assumes format #1, extracts last segment as page ID, fails silently for others. User sees "Sync successful" (no pages created) or "Invalid page ID" (API error). Debugging requires understanding Notion URL structure, which users don't have.

**Why it happens:**
Initial implementation uses simple regex: `url.match(/\/([a-f0-9]{32})/)[1]`. This works for canonical page URLs but doesn't handle query params, workspace-only URLs, or the `notion.so` vs `www.notion.so` variance. Notion API docs don't clearly document URL format variations. Developers test with their own pages (format #1), miss edge cases.

**How to avoid:**
- **Robust parser with error messages:** Parse URL, then validate:
  ```javascript
  const match = url.match(/([a-f0-9]{32})/); // Extract any 32-char hex
  if (!match) return { error: "No page ID found. Use a full Notion page URL (e.g., https://notion.so/workspace-page123...)" };
  const pageId = match[1];
  // Then verify it's a page, not workspace ID, via API
  ```
- **Strip query params:** `url.split('?')[0]` before parsing
- **Validate via API:** After extracting ID, call Notion API `GET /pages/{id}` to verify it's a page. If error: "This looks like a workspace/database URL. Open a specific page and copy that URL."
- **User guidance:** Show example URL in prompt: "Paste your Notion parent page URL (e.g., https://notion.so/yourworkspace-abc123...)"
- **Fallback to manual ID entry:** If URL parsing fails, offer: "Can't parse URL. Enter page ID directly (32-character hex string):"

**Warning signs:**
- User reports "sync says success but nothing appeared in Notion"
- Support requests with database URLs: "I pasted my workspace, why doesn't it work?"
- Error logs show `Invalid page ID` with workspace IDs in the error
- Regex works in unit tests (only test format #1) but fails in production

**Phase to address:**
Phase implementing Notion parent page configuration (likely when adding sync-to-Notion workflow integration). Include URL validation and error handling from day 1 — retrofitting clear errors into brittle regex is painful.

---

### Pitfall 4: Missing Notion API Key Pre-Check

**What goes wrong:**
User completes milestone, prompted "Upload planning docs to Notion?", says yes, workflow triggers `notion-sync.js sync` which immediately fails with "Missing API key" or "Authentication failed." Milestone is already tagged and archived (irreversible), but sync didn't happen. User now has to manually run sync later, defeating the automation's purpose. Worse: if config.json exists but `notion.api_key` is empty string, code may not fail early — sync attempts, hits auth error mid-upload, leaves partial state (some pages created, others failed).

**Why it happens:**
Workflow checks `if (config.notion && config.notion.api_key)` but this passes for `api_key: ""` (empty string is truthy object property). Notion API returns 401 Unauthorized, but error handling assumes network issues, not config issues. Prompt appears too late (after milestone completion), when user expects automation to "just work." Install flow prompts for API key but doesn't validate it (copy-paste errors, expired keys, wrong format).

**How to avoid:**
- **Strict validation in prompt step:** Check `api_key && api_key.trim() !== '' && (api_key.startsWith('secret_') || api_key.startsWith('ntn_'))`
- **Auth-check before prompt:** Before asking "Upload to Notion?", run `notion-sync.js auth-check --raw` (returns `{authenticated: true/false, error: null}`). If false, skip prompt or show: "Notion not configured. Run /gsd:settings to add API key."
- **Early failure, clear recovery:** If auth-check fails during sync, STOP and show: "Notion sync failed (auth error). Your milestone is complete and tagged. Fix API key in .planning/config.json, then run /gsd:sync-notion manually."
- **Validate during install:** When user enters API key, make test API call (`GET /users/me`) to verify it works BEFORE saving to config
- **Idempotent sync:** Sync should be safe to re-run (hash-based change detection). If sync partially fails, user can fix config and re-run without duplicates

**Warning signs:**
- Users report "said it would sync but nothing happened"
- Error logs show 401 after milestone tag created (too late to recover gracefully)
- Support tickets: "How do I add API key after milestone completion?"
- Empty `api_key` values in config.json (install flow accepted invalid input)

**Phase to address:**
Phase integrating Notion sync into complete-milestone workflow (v1.2). Pre-check must happen BEFORE prompting user — failing after user says "yes" erodes trust. Phase adding API key configuration should validate immediately, not defer to first use.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode recommended settings in shortcut function | Fast to implement (5 lines) | Diverges from interactive flow defaults; creates two config paths to maintain | Never — always delegate to shared setter |
| Chain all workflows without context checkpoints | Seamless UX; user runs one command | Context bloat (20-33K tokens); quality degradation; 3-5x cost increase | Only for short chains (<10K tokens cumulative) |
| Simple regex URL parser without validation | Works for 80% of URLs (canonical format) | Silent failures for workspace/shared/database URLs; hard to debug | Only if paired with "or enter page ID manually" fallback |
| Skip API auth check, assume config is valid | One less network call | Sync fails after irreversible milestone tag; poor error messages; user confusion | Only in offline/testing mode, never in production workflow |
| Parse Notion URLs client-side only | No server dependency; works offline | Fragile to Notion URL format changes; can't distinguish page vs workspace IDs | Only if combined with server-side validation API call |
| Auto-advance without token budget tracking | Feels magical; no manual steps | Invisible quality degradation; users don't know why output is worse | Only with hard-coded chain depth limit (max 2 steps) |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Notion API (parent page) | Assume pasted URL is always a page ID | Parse URL, extract ID, then validate via `GET /pages/{id}` API call; offer manual ID entry fallback |
| Notion API (auth) | Check config exists, assume key is valid | Validate key format (starts with `secret_` or `ntn_`), then test with `GET /users/me` before saving |
| Notion API (sync trigger) | Prompt user → run sync → handle errors | Auth-check BEFORE prompting; if no key, skip prompt entirely; never prompt for action that can't succeed |
| Interactive readline | Assume stdin is always TTY | Check `process.stdin.isTTY` before readline prompts; fallback to defaults or error in non-interactive environments |
| Readline validation | Validate after user confirms | Validate each input immediately (e.g., API key format) with retries; prevent saving invalid config |
| Auto-advance chains | Chain operations, handle errors at end | Measure cumulative token budget; break chain at checkpoints; suggest `/clear` when budget exceeds threshold |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Chaining workflows without context limits | First milestone fine, later ones produce lower-quality plans | Track cumulative tokens (discussion + research + planning); warn at 15K, break chain at 20K | After 2-3 phases in one session (~25K tokens) |
| Loading all SUMMARY.md files without pagination | Fast for 5-10 phases, slow for 50+ phases | Stream files or paginate; extract only needed fields (one_liner) via `summary-extract` | 20+ phases (~1MB of markdown) |
| Regex-only URL parsing without API validation | Works until user pastes workspace/database URL | Always validate extracted ID via API call; treat regex as hint, not source of truth | When users discover workspace URLs (10-20% of attempts) |
| Setting recommended defaults without versioning | Smooth until defaults change in v1.3 | Version recommendations (`RECOMMENDED_SETTINGS_V1_2`); migrate old configs during install | When new setting added or default changes (every major version) |
| Auto-advance without user-visible checkpoints | Magic until context window fills | Show token count after each step: "Discussion: 4K tokens, Planning: 8K tokens (12K total)" | After 15-20K tokens (model effectiveness drops) |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Prompt "Upload to Notion?" when API key missing | User says yes → immediate error → confusion | Pre-check auth; if not configured, skip prompt or show "Notion not set up (run /gsd:settings to configure)" |
| Show "Sync successful" when no pages created | User thinks it worked, checks Notion, sees nothing → erodes trust | Count created/updated/skipped pages; show "Synced 5 pages (3 created, 2 updated)" or "No changes to sync" |
| Silent failure on invalid Notion URL | User pastes workspace URL, sees generic error, doesn't know what's wrong | Parse URL, detect format, show specific error: "This is a workspace URL. Open a page and copy that URL instead." |
| Chaining workflows without showing progress | User waits, doesn't know if it's stuck or working | Display: "Step 1/3: Discussion complete (4K tokens)... Step 2/3: Researching... Step 3/3: Planning..." |
| Apply recommended settings without showing what changed | User clicks shortcut, doesn't know what was set | After applying, show table: "Applied recommended settings: Research ON, Plan Check ON, Profile Balanced" |
| Auto-advance without escape hatch | User realizes mid-chain they wanted to stop, can't | Show: "Auto-advancing to Phase 2 in 3s... (Ctrl+C to stop)" or check for user confirmation between steps |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Recommended settings shortcut:** Often missing update trigger when interactive flow changes — verify shortcut and interactive flow produce identical config for same inputs
- [ ] **Notion URL parsing:** Often missing query param stripping — verify `?v=view&pvs=21` URLs work
- [ ] **Notion sync prompt:** Often missing API key validation — verify prompt is skipped if auth-check fails
- [ ] **Context chain limits:** Often missing cumulative token tracking — verify chain breaks or warns at 15-20K tokens
- [ ] **Auto-advance checkpoints:** Often missing `/clear` suggestions — verify user is prompted to clear context between heavy steps
- [ ] **Readline validation:** Often missing retry logic — verify invalid input (empty string, wrong format) prompts user again, doesn't save
- [ ] **Error messages for Notion:** Often generic ("Invalid page ID") — verify error distinguishes workspace URLs, shared links, auth failures
- [ ] **Sync idempotency:** Often missing hash-based change detection — verify re-running sync after partial failure doesn't create duplicates

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Recommended settings diverged from interactive flow | MEDIUM | 1. Extract RECOMMENDED_SETTINGS constant. 2. Update shortcut to use constant. 3. Add integration test comparing outputs. 4. Document "last reviewed" date. |
| Context chain caused quality degradation | LOW | 1. User runs `/clear`. 2. Re-run planning step fresh. 3. Add token budget tracking for future. |
| Invalid Notion URL parsed incorrectly | LOW | 1. Show error with correct URL format example. 2. Offer manual page ID entry. 3. Add URL validation to prevent recurrence. |
| Sync failed due to missing API key | MEDIUM | 1. Milestone already tagged (can't roll back). 2. User adds API key to config.json. 3. User runs `/gsd:sync-notion` manually. 4. Add pre-check for future. |
| Workspace URL mistaken for page URL | LOW | 1. Parse URL, detect workspace ID pattern. 2. Show: "This is a workspace URL. Open a page in your workspace and copy that URL." 3. User pastes correct URL. |
| Readline accepted invalid input (empty API key) | MEDIUM | 1. User edits .planning/config.json manually. 2. Deletes empty `api_key: ""` or adds valid key. 3. Add validation with retries to install flow. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Recommended settings divergence | Phase adding shortcut feature (early v1.2) | Integration test: shortcut output === interactive flow output with all defaults |
| Context window bloat | Phase implementing auto-advance from plan-phase (current v1.1), Phase adding discuss-phase chaining (v1.2) | Token counter in workflow; test that chain breaks at 20K tokens; `/clear` prompt appears |
| Notion URL parsing fragility | Phase adding parent page URL configuration (likely early v1.2 Notion integration) | Unit tests for all 4 URL formats; error message test (workspace URL shows specific guidance) |
| Missing Notion API key pre-check | Phase integrating Notion sync into complete-milestone workflow (v1.2) | Auth-check runs before prompt; prompt skipped if auth fails; test with missing/invalid key |

## Sources

**Framework Context (Internal):**
- install.js (lines 1492-1577) — promptNotionKey interactive flow with readline validation
- plan-phase.md workflow — auto-advance loop (step 14d, lines 411-423)
- discuss-phase.md — interactive AskUserQuestion creating CONTEXT.md
- complete-milestone.md (step prompt_notion_sync, lines 586-643) — Notion sync trigger after milestone

**External Research:**

**Context Window & AI Performance:**
- [Context Length Comparison: Leading AI Models in 2026](https://www.elvex.com/blog/context-length-comparison-ai-models-2026) — Effective capacity is 60-70% of advertised max
- [The Next AI Failure Mode Isn't Hallucinations. It's Bloat.](https://itbusinessnet.com/2026/02/the-next-ai-failure-mode-isnt-hallucinations-its-bloat/) — Context bloat from verbose examples and unnecessary tooling
- [Context Window Management: Strategies for Long-Context AI Agents and Chatbots](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) — Dynamic context allocation, preventing bloat
- [Fix AI Agents that Miss Critical Details From Context Windows](https://datagrid.com/blog/optimize-ai-agent-context-windows-attention) — Lost in the middle effect; models effectively use 10-20% of context
- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Scaling without bloating orchestrator prompt

**Configuration Management:**
- [Are default values an anti-pattern?](https://medium.com/@marcus.nielsen82/are-default-values-an-anti-pattern-54d5d40310f3) — Configuration drift patterns
- [What is Configuration Drift?](https://www.reach.security/blog/what-is-configuration-drift-5-best-practices-for-your-teams-security-posture) — Causes: temporary changes not documented, undocumented quick fixes, variations accumulate
- [Environment variables and configuration anti patterns in Node.js applications](https://lirantal.com/blog/environment-variables-configuration-anti-patterns-node-js-applications) — Node.js-specific config anti-patterns

**Node.js Interactive Prompts:**
- [Master Node.js readline/promises: Production-Ready Guide](https://kitemetric.com/blogs/mastering-node-js-readline-promises-a-production-ready-guide) — Best practices: always close interface, handle errors, validate input
- [Node.js — Accept input from the command line](https://nodejs.org/en/learn/command-line/accept-input-from-the-command-line-in-nodejs) — Error handling, TTY detection
- [Node.js Interactive Command Line Prompts](https://mangohost.net/blog/node-js-interactive-command-line-prompts-how-to-use/) — Common pitfalls: forgetting close(), not handling errors, ignoring input validation

**Notion API:**
- [Start building with the Notion API](https://developers.notion.com/docs/getting-started) — Base URL https://api.notion.com, workspace URL formats
- [Retrieving page URLs through Notion's Public API](https://community.latenode.com/t/retrieving-page-urls-through-notions-public-api/18531) — Page URLs not directly in API; ID extraction challenges
- [Introduction - Notion Docs](https://developers.notion.com/reference/intro) — API authentication, page vs. database objects

---
*Pitfalls research for: v1.2 Workflow Streamlining*
*Researched: 2026-02-12*
