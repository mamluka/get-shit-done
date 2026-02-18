# Phase 14: Notion Sync Integration - Research

**Researched:** 2026-02-12
**Domain:** Workflow integration, Notion API validation, CLI prompts
**Confidence:** HIGH

## Summary

Phase 14 integrates Notion sync into the plan-phase auto-complete workflow. After all phases in a milestone are planned (when `milestone_complete === true`), the workflow performs an auth pre-check, and if Notion is properly configured, prompts the user to sync planning docs before displaying the final completion message. If the user accepts, `notion-sync.js sync` runs automatically, syncing .planning/ files to Notion with parent/child hierarchy.

The implementation extends plan-phase.md's existing step 14d milestone completion detection. When `milestone_complete` is true, instead of stopping immediately, the workflow first runs a Notion auth pre-check (validates API key format, parent page ID exists), then conditionally prompts for sync. This prevents post-completion failures and provides a seamless planning-to-stakeholder-sharing flow.

**Primary recommendation:** Extend plan-phase.md step 14d with Notion pre-check (validate config.json notion section), conditional prompt (only when valid config exists), and spawn notion-sync.js as child process with stdout streaming for progress visibility. Use existing complete-milestone.md prompt_notion_sync pattern as reference (lines 587-642).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js child_process | Built-in | Spawn notion-sync.js subprocess | Zero dependencies, already used throughout GSD for CLI tool execution |
| fs (Node.js) | Built-in | Read config.json for pre-check | Standard for config validation, used in lib/notion/client.js |
| JSON parsing | Built-in | Parse config.json structure | Native JSON support, proven in existing config validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bin/notion-sync.js | Current | Sync orchestrator with progress output | Already implements full sync pipeline, reuse via child process |
| lib/notion/client.js | Current | validateAuth, loadNotionConfig functions | Auth pre-check reuses existing validation logic |
| Existing milestone workflow pattern | complete-milestone.md | Notion sync prompting UX | Proven pattern from Phase 10 workflow integration |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Child process spawn | Direct function import from sync-orchestrator.js | Child process keeps plan-phase.md focused on workflow, avoids tight coupling to Notion internals |
| Pre-check with Notion API call | validateAuth() network request | Network call adds latency before prompt — format validation is faster, API validation deferred to sync step |
| Inline sync prompt code | Extract to separate workflow helper | Inline keeps logic visible in plan-phase.md, matches existing pattern from complete-milestone.md |

**Installation:**

None required — using Node.js built-ins and existing GSD CLI tools.

## Architecture Patterns

### Recommended Workflow Structure

```
plan-phase.md (orchestrator)
  → step 14b: Mark phase complete
  → step 14c: Commit completion
  → step 14d: Route to next
    → IF milestone_complete === true:
      → NEW: step 14e: Notion sync prompt
        → Pre-check config (API key + parent page)
        → IF valid: Prompt user
          → IF yes: Spawn notion-sync.js sync
          → IF no: Skip with message
        → IF invalid: Skip silently
      → Display completion message
      → STOP
    → ELSE: Auto-advance to next phase
```

Extension point: Between step 14d milestone detection and completion message display.

### Pattern 1: Notion Auth Pre-Check

**What:** Validate Notion configuration exists and has correct structure before showing sync prompt

**When to use:** Before prompting for Notion sync — prevents showing prompt when sync will fail

**Pre-check criteria:**
1. `.planning/config.json` exists
2. `config.notion` object exists
3. `config.notion.api_key` exists and non-empty
4. API key matches expected prefix (`secret_` or `ntn_`)
5. OPTIONAL: `config.notion.parent_page_id` exists (sync will work without parent page, just creates pages at workspace root)

**Implementation:**

```bash
# Fast pre-check without network call
NOTION_CHECK=$(node -e "
const fs = require('fs');
const path = require('path');
const configPath = path.join(process.cwd(), '.planning', 'config.json');

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const hasKey = config.notion && config.notion.api_key && config.notion.api_key.trim() !== '';
  const validPrefix = hasKey && (config.notion.api_key.startsWith('secret_') || config.notion.api_key.startsWith('ntn_'));
  const hasParent = config.notion && config.notion.parent_page_id;

  console.log(JSON.stringify({
    configured: hasKey && validPrefix,
    has_parent: !!hasParent,
    reason: !hasKey ? 'no_api_key' : !validPrefix ? 'invalid_prefix' : 'valid'
  }));
} catch (e) {
  console.log(JSON.stringify({ configured: false, reason: 'no_config' }));
}
" 2>/dev/null)

CONFIGURED=$(echo "$NOTION_CHECK" | jq -r '.configured')
```

**Why format validation, not API call:**
- Fast: No network latency before showing prompt
- Offline-safe: Doesn't fail when offline
- API validation happens during actual sync: `notion-sync.js` calls `validateAuth()` as first step

**Source:** Adapted from complete-milestone.md lines 590-602 (Phase 10 implementation)

### Pattern 2: Conditional Prompt (Only When Valid Config)

**What:** Only show Notion sync prompt if pre-check passes — silent skip otherwise

**When to use:** After pre-check determines config validity

**Decision tree:**

```
IF milestone_complete === true:
  RUN pre-check

  IF configured === true:
    PROMPT: "Sync planning docs to Notion? (yes/skip)"

    IF user says "yes":
      SPAWN: notion-sync.js sync
      DISPLAY: Sync results (created/updated/skipped)

    IF user says "skip":
      DISPLAY: "Skipped. Run /gsd:sync-notion later."

  IF configured === false:
    SKIP silently (no prompt, no message)

  DISPLAY: "🎉 All Phases Complete" message
  STOP
```

**Why silent skip when not configured:**
- Users who don't use Notion shouldn't see irrelevant prompts
- No action needed — Notion integration is optional feature
- Matches existing pattern from complete-milestone.md (lines 604-605)

**Source:** complete-milestone.md lines 587-642 (proven UX pattern from Phase 10)

### Pattern 3: Spawn notion-sync.js as Child Process

**What:** Run `notion-sync.js sync` as subprocess and stream output to user

**When to use:** When user accepts sync prompt

**Implementation:**

```bash
# Spawn sync as child process, inherit stdio for progress visibility
node bin/notion-sync.js sync --cwd "$(pwd)"
```

**Why child process vs direct import:**
- notion-sync.js handles its own error output, exit codes, progress formatting
- Keeps plan-phase.md decoupled from Notion sync internals
- Stdout streaming shows real-time progress (files syncing, images uploading)
- Exit code indicates success/failure naturally

**Alternative (if parent page from config):**

```bash
# Read parent page from config for sync command
PARENT_PAGE=$(cat .planning/config.json | jq -r '.notion.parent_page_id // empty')

if [ -n "$PARENT_PAGE" ]; then
  node bin/notion-sync.js sync --cwd "$(pwd)" --parent-page "$PARENT_PAGE"
else
  node bin/notion-sync.js sync --cwd "$(pwd)"
fi
```

**Note:** `notion-sync.js sync` already reads parent_page_id from config.json OR notion-sync.json if not provided via flag (see bin/notion-sync.js lines 287-305). Passing `--cwd` is sufficient.

**Source:** bin/notion-sync.js lines 283-395 (sync subcommand implementation), complete-milestone.md lines 629-631

### Pattern 4: Display Sync Results

**What:** Parse notion-sync.js stdout to show summary before completion message

**When to use:** After sync subprocess completes

**Sync output format (from bin/notion-sync.js line 383-387):**

```
✓ Sync complete: 12 created, 3 updated, 5 skipped, 0 errors (20 total), 2 images (1 uploaded, 1 cached)
```

**OR with warnings:**

```
✓ Sync complete with warnings: 10 created, 2 updated, 3 skipped, 1 errors (16 total)
```

**Handling:**

```bash
# Spawn sync and capture output
SYNC_OUTPUT=$(node bin/notion-sync.js sync --cwd "$(pwd)" 2>&1)
SYNC_EXIT=$?

if [ $SYNC_EXIT -eq 0 ]; then
  echo "Sync completed successfully."
  echo "$SYNC_OUTPUT" | grep "Sync complete"
else
  echo "Sync encountered errors:"
  echo "$SYNC_OUTPUT"
fi
```

**Why capture and re-display:**
- notion-sync.js already formats output with colors, counts, progress
- No need to parse — just show the CLI output directly
- User sees same experience as running `/gsd:sync-notion` manually

**Source:** bin/notion-sync.js lines 370-387 (sync result formatting)

### Anti-Patterns to Avoid

- **Prompting when Notion not configured:** Don't show sync prompt if config check fails — creates confusion for users who don't use Notion
- **Network pre-check with validateAuth():** Don't call Notion API before showing prompt — adds latency, fails offline, unnecessary (sync will validate)
- **Blocking milestone completion on sync errors:** Sync is best-effort convenience, not required for milestone completion — show errors but proceed to completion message
- **Inline sync logic:** Don't reimplement sync in plan-phase.md — notion-sync.js already handles all edge cases (parent page validation, retries, chunking, images)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Notion API authentication | Custom API key validation with network call | Format validation (prefix check) + defer to notion-sync.js | Sync already calls validateAuth() as first step, pre-check just needs format validation |
| Markdown-to-Notion conversion | Custom block builder in workflow | bin/notion-sync.js CLI tool | Already implements converter, chunker, image handling, hierarchy — 500+ LOC |
| Sync progress display | Parse JSON and format output | Stream notion-sync.js stdout directly | CLI already formats with colors, icons, counts — reuse UX |
| Config validation | Custom JSON parser and field checker | Reuse lib/notion/client.js loadNotionConfig pattern | Proven validation logic, consistent error messages |

**Key insight:** Phase 6-10 already built a complete Notion sync pipeline. Phase 14 is workflow integration — orchestrate existing tools, don't rebuild them.

## Common Pitfalls

### Pitfall 1: Showing Prompt When Notion Will Fail

**What goes wrong:** User sees "Sync to Notion?" prompt, accepts, sync fails immediately with "No API key configured" error. Frustrating UX — prompt shouldn't appear if sync can't succeed.

**Why it happens:** No pre-check before showing prompt — workflow assumes Notion is always configured.

**How to avoid:**

```bash
# PRE-CHECK before showing prompt
NOTION_CHECK=$(node -e "
  const config = JSON.parse(fs.readFileSync('.planning/config.json', 'utf8'));
  const valid = config.notion && config.notion.api_key && config.notion.api_key.trim() !== '';
  console.log(valid ? 'true' : 'false');
" 2>/dev/null || echo "false")

if [ "$NOTION_CHECK" = "true" ]; then
  # Show prompt
else
  # Skip silently
fi
```

**Warning signs:**
- User reports "Notion sync fails every time after planning"
- Error appears immediately after accepting prompt (no network delay)

### Pitfall 2: Network Call in Pre-Check Adds Latency

**What goes wrong:** Pre-check calls `validateAuth()` to verify API key works. User waits 2-3 seconds before seeing prompt. Sync then calls `validateAuth()` again. Double latency, poor UX.

**Why it happens:** Over-validation — trying to guarantee sync will work before showing prompt.

**How to avoid:**

```bash
# FAST: Format validation only
const validPrefix = apiKey.startsWith('secret_') || apiKey.startsWith('ntn_');

# SLOW: Network validation (AVOID in pre-check)
# const result = await validateAuth(notion); // Do this in sync, not pre-check
```

**Rule:** Pre-check validates structure, sync validates functionality. Defer network calls to the actual sync step.

**Warning signs:**
- Noticeable delay between "mark phase complete" and prompt appearing
- Sync fails even when pre-check passes (network issues)

### Pitfall 3: Blocking Completion on Sync Errors

**What goes wrong:** Sync encounters network error or rate limit. Workflow stops, user doesn't see "All Phases Complete" message, doesn't know milestone is done.

**Why it happens:** Treating sync as required step instead of best-effort convenience.

**How to avoid:**

```bash
# Run sync, capture exit code, but proceed regardless
node bin/notion-sync.js sync --cwd "$(pwd)" || true

# OR: Show error but continue
if ! node bin/notion-sync.js sync --cwd "$(pwd)"; then
  echo "Sync encountered errors. You can retry with /gsd:sync-notion"
fi

# Always show completion message
echo "🎉 All Phases Complete"
```

**Rule:** Milestone completion is a planning artifact operation (update ROADMAP.md, STATE.md, commit). Notion sync is a publishing operation. Completion succeeds even if publishing fails.

**Warning signs:**
- User stuck in workflow after network failure
- Roadmap phases marked incomplete even though planning finished

### Pitfall 4: Not Streaming Sync Progress

**What goes wrong:** Spawn `notion-sync.js sync`, wait for exit, show summary. User sees no feedback for 10-20 seconds while sync runs. Appears frozen.

**Why it happens:** Capturing stdout instead of streaming it.

**How to avoid:**

```bash
# GOOD: Inherit stdio, stream progress live
node bin/notion-sync.js sync --cwd "$(pwd)"

# BAD: Capture and wait (appears frozen)
# OUTPUT=$(node bin/notion-sync.js sync --cwd "$(pwd)")
# echo "$OUTPUT"  # Only shows after sync completes
```

**Why streaming matters:** notion-sync.js shows per-file progress (`● Creating .planning/ROADMAP.md (1/12)`). User sees activity, knows it's working.

**Warning signs:**
- User interrupts (Ctrl-C) thinking workflow is stuck
- Reports "sync takes forever" when it's actually progressing

### Pitfall 5: Assuming Parent Page is Always Configured

**What goes wrong:** Workflow passes `--parent-page` flag to sync, but config.json doesn't have parent_page_id. Sync fails with "No parent page ID specified."

**Why it happens:** Phase 12 made parent page optional — user could skip it during install.

**How to avoid:**

```bash
# DON'T assume parent page exists
# node bin/notion-sync.js sync --parent-page "$PARENT_PAGE"  # Fails if empty

# DO let sync read from config
node bin/notion-sync.js sync --cwd "$(pwd)"  # Sync reads notion-sync.json or config.json

# Sync handles missing parent page gracefully:
# - Uses workspace_page_id from notion-sync.json if exists
# - Creates pages at workspace root if no parent configured
# - Only errors if BOTH are missing AND user didn't provide --parent-page flag
```

**Source:** bin/notion-sync.js lines 287-305 (parent page resolution logic)

**Warning signs:**
- Sync fails with "No parent page ID" even though API key is valid
- User skipped parent page during install but sync expects it

## Code Examples

Verified patterns from existing GSD codebase:

### Pre-Check Pattern (from complete-milestone.md)

```bash
# Source: get-shit-done/workflows/complete-milestone.md lines 589-602
NOTION_CHECK=$(node -e "
const fs = require('fs');
const configPath = require('path').join(process.cwd(), '.planning', 'config.json');
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const hasKey = config.notion && config.notion.api_key && config.notion.api_key.trim() !== '';
  console.log(JSON.stringify({ configured: hasKey }));
} catch (e) {
  console.log(JSON.stringify({ configured: false }));
}
" 2>/dev/null)

CONFIGURED=$(echo "$NOTION_CHECK" | jq -r '.configured')
```

**Source:** Phase 10 complete-milestone workflow (verified working pattern)

**Confidence:** HIGH — proven in production, handles missing config, parse errors, empty keys

### Enhanced Pre-Check with Prefix Validation

```bash
# Improved version with API key format validation
NOTION_CHECK=$(node -e "
const fs = require('fs');
const path = require('path');
const configPath = path.join(process.cwd(), '.planning', 'config.json');

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const hasKey = config.notion && config.notion.api_key && config.notion.api_key.trim() !== '';

  if (!hasKey) {
    console.log(JSON.stringify({ configured: false, reason: 'no_api_key' }));
    process.exit(0);
  }

  const key = config.notion.api_key.trim();
  const validPrefix = key.startsWith('secret_') || key.startsWith('ntn_');

  if (!validPrefix) {
    console.log(JSON.stringify({ configured: false, reason: 'invalid_prefix' }));
    process.exit(0);
  }

  const hasParent = config.notion && config.notion.parent_page_id;

  console.log(JSON.stringify({
    configured: true,
    has_parent: !!hasParent,
    reason: 'valid'
  }));
} catch (e) {
  console.log(JSON.stringify({ configured: false, reason: 'parse_error' }));
}
" 2>/dev/null || echo '{"configured":false,"reason":"exec_error"}')
```

**Why validate prefix:** Notion API keys always start with `secret_` (internal integrations) or `ntn_` (public integrations). If key has wrong prefix, sync will fail auth immediately.

**Source:** lib/notion/client.js (API key usage), Phase 12 research (page ID validation pattern)

**Confidence:** HIGH — prefix check prevents common copy-paste errors (user pasted wrong token type)

### Conditional Prompt with AskUserQuestion

```markdown
# Integration into plan-phase.md step 14d

**If `milestone_complete === true`:**

# Step 14e: Notion Sync Prompt

Run pre-check:

```bash
NOTION_CHECK=$(node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('.planning/config.json', 'utf8'));
const hasKey = config.notion && config.notion.api_key && config.notion.api_key.trim() !== '';
const validPrefix = hasKey && (config.notion.api_key.startsWith('secret_') || config.notion.api_key.startsWith('ntn_'));
console.log(JSON.stringify({ configured: hasKey && validPrefix }));
" 2>/dev/null || echo '{"configured":false}')

CONFIGURED=$(echo "$NOTION_CHECK" | jq -r '.configured')
```

**If CONFIGURED is "true":**

Display:
```
───────────────────────────────────────────────────────────────

## Upload Planning Docs to Notion?

Your milestone planning docs are finalized and ready to share.

This will sync .planning/ markdown files to Notion:
• New files create pages
• Changed files update existing pages
• Unchanged files are skipped

───────────────────────────────────────────────────────────────
```

Then use AskUserQuestion:
- header: "Notion Sync"
- question: "Sync planning docs to Notion?"
- options:
  - "Sync now" — Run notion-sync.js
  - "Skip" — Continue to completion message

**If user selects "Sync now":**

```bash
echo "Syncing to Notion..."
node bin/notion-sync.js sync --cwd "$(pwd)"
SYNC_EXIT=$?

if [ $SYNC_EXIT -eq 0 ]; then
  echo "✓ Planning docs synced to Notion"
else
  echo "⚠ Sync encountered errors. Retry with /gsd:sync-notion"
fi
```

**If user selects "Skip":**

```
Skipped Notion sync. Run /gsd:sync-notion later to upload docs.
```

**If CONFIGURED is "false":**

Skip silently (no prompt, no message).

Continue to step 14f (display completion message).
```

**Source:** Adapted from complete-milestone.md lines 587-642, plan-phase.md step 14d structure

**Confidence:** HIGH — reuses proven patterns from Phase 10 and existing plan-phase orchestration

### Sync Spawn with Error Handling

```bash
# Source: Adapted from complete-milestone.md lines 629-631
# Run sync as child process, inherit stdio for progress visibility
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " GSD ► SYNCING TO NOTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if node bin/notion-sync.js sync --cwd "$(pwd)"; then
  echo ""
  echo "✓ Planning docs synced to Notion"
else
  echo ""
  echo "⚠ Sync encountered errors. You can retry with /gsd:sync-notion"
  echo "  Milestone completion will proceed regardless."
fi

echo ""
```

**Why inherit stdio:** User sees real-time progress from notion-sync.js (file-by-file status, image uploads, errors).

**Why proceed on error:** Notion sync is optional publishing step — milestone is complete regardless of sync status.

**Source:** complete-milestone.md workflow integration pattern

**Confidence:** HIGH — verified working in Phase 10 implementation

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual /gsd:sync-notion after milestone | Auto-prompt after planning complete | Phase 14 (2026-02) | Reduced friction — user doesn't forget to sync, docs reach stakeholders faster |
| Sync prompt after archive (complete-milestone) | Sync prompt after planning (plan-phase) | Phase 14 (2026-02) | Earlier feedback loop — stakeholders see planning docs before implementation starts |
| No pre-check, sync fails post-prompt | Pre-check before showing prompt | Phase 14 (2026-02) | Better UX — users without Notion don't see irrelevant prompts |

**Deprecated/outdated:**

- **Manual sync invocation:** Phase 10 required user to run `/gsd:sync-notion` manually after planning. Phase 14 auto-prompts at completion — fewer steps.
- **Sync-only-after-shipping:** Old pattern synced after code completion (complete-milestone). New pattern syncs after planning completion (plan-phase) — enables earlier stakeholder review.

## Open Questions

1. **Should we show Notion workspace/bot name in prompt?**
   - What we know: validateAuth() returns workspace name and bot name
   - What's unclear: Whether showing this info helps user confirm they're syncing to the right workspace
   - Recommendation: Skip for Phase 14 — adds network call latency before prompt. If users want confirmation, they can check config.json notion section manually.

2. **Should we validate parent page exists via API before sync?**
   - What we know: Pre-check validates parent_page_id format (32-char hex), sync validates it exists via pages.retrieve()
   - What's unclear: Whether pre-check should call API to confirm page is accessible
   - Recommendation: Skip API validation in pre-check (same reasoning as Q1 — defer to sync step where error context is clearer). Format validation is sufficient for prompting.

3. **Should we offer "Review config" option in prompt?**
   - What we know: Users might want to verify parent page, API key before syncing
   - What's unclear: Whether this adds value vs "just run sync and see errors"
   - Recommendation: Skip for Phase 14 — users can abort sync (Ctrl-C) if they see wrong workspace in progress output. Future enhancement: `notion-sync.js config-check` subcommand.

## Sources

### Primary (HIGH confidence)

- GSD codebase: `get-shit-done/workflows/complete-milestone.md` (lines 587-642) — Proven Notion sync prompt pattern from Phase 10
- GSD codebase: `get-shit-done/workflows/plan-phase.md` (lines 430-484) — Milestone completion detection and routing logic
- GSD codebase: `bin/notion-sync.js` (lines 283-395) — Sync subcommand implementation, exit codes, output formatting
- GSD codebase: `lib/notion/client.js` (lines 19-46) — loadNotionConfig validation logic, error handling patterns
- Node.js child_process documentation: https://nodejs.org/api/child_process.html — Spawning subprocesses, stdio inheritance

### Secondary (MEDIUM confidence)

- [Command Line Interface Guidelines](https://clig.dev/) — Best practices for yes/no prompts, confirmation UX
- [How to prompt for Yes/No/Cancel input in a Linux shell script](https://www.geeksforgeeks.org/linux-unix/how-to-prompt-for-yes-no-cancel-input-in-a-linux-shell-script/) — Bash prompt patterns

### Tertiary (LOW confidence)

None — all findings verified against GSD codebase or official Node.js documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Node.js built-ins, existing CLI tools, proven patterns from Phase 10
- Architecture: HIGH — Direct extension of plan-phase.md step 14d, reuses complete-milestone.md prompt pattern
- Pitfalls: HIGH — Pre-check validation, error handling, progress streaming patterns all verified in existing code

**Research date:** 2026-02-12
**Valid until:** 60 days (stable Node.js APIs, established GSD patterns, unlikely to change)
