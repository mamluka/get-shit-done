# Phase 10: Workflow Integration & Comment Retrieval - Research

**Researched:** 2026-02-11
**Domain:** Notion Comments API, interactive user workflows, comment triage systems
**Confidence:** HIGH

## Summary

Phase 10 integrates Notion sync into the milestone completion workflow and builds a bidirectional feedback system via comment retrieval. The technical domain involves: (1) Notion Comments API for retrieving unresolved comments from synced pages, (2) interactive multi-step user workflows with confirmation gates, and (3) LLM-based comment clustering to identify themes and map them to roadmap phases.

The Notion Comments API is well-documented with cursor-based pagination, returns only unresolved comments, and requires read comment permissions. Interactive workflows follow GSD's established pattern of step-by-step user prompts with AskUserQuestion gates. Theme identification leverages Claude's native ability to cluster text and identify patterns without custom NLP libraries.

**Primary recommendation:** Use @notionhq/client SDK's `notion.comments.list()` for comment retrieval, implement interactive triage as a multi-step prompt workflow (not a subprocess), and save triage results as dated markdown files in `.planning/` root for historical reference.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @notionhq/client | latest (already installed) | Notion Comments API access | Official SDK, already used for sync operations |
| Node.js fs/path | native | File I/O for triage output | Native modules, no dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gsd-tools.js | internal | Commit helper, config loading | When committing triage files |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @notionhq/client | Raw fetch() to Notion API | SDK handles auth, rate limiting, pagination — no reason to hand-roll |
| LLM clustering | NLP libraries (sklearn-js, natural) | Claude can cluster/theme natively without dependencies |
| Subprocess spawning | Interactive prompt flow | GSD pattern: use AskUserQuestion for user interaction, not Task spawning |

**Installation:**
No new dependencies required — all capabilities exist in current stack.

## Architecture Patterns

### Recommended Project Structure
```
lib/notion/
├── client.js              # Existing SDK factory
├── sync-orchestrator.js   # Existing sync pipeline
├── comment-retriever.js   # NEW: Comment fetching with pagination
└── comment-triage.js      # NEW: Theme clustering and phase mapping

bin/
└── notion-sync.js         # Add 'comments' subcommand

.claude/get-shit-done/workflows/
├── complete-milestone.md  # ADD: Prompt for Notion sync after archival
└── notion-comments.md     # NEW: Interactive triage workflow

.planning/
└── notion-comments-YYYY-MM-DD.md  # Dated triage output
```

### Pattern 1: Paginated Comment Retrieval

**What:** Fetch all unresolved comments from synced pages with cursor-based pagination
**When to use:** When retrieving comments from multiple pages in notion-sync.json

**Example:**
```javascript
// Source: https://developers.notion.com/docs/working-with-comments
const { Client } = require('@notionhq/client');

async function retrieveAllComments(notion, pageId) {
  const comments = [];
  let cursor = undefined;

  while (true) {
    const response = await notion.comments.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100
    });

    comments.push(...response.results);

    if (!response.has_more) {
      break;
    }
    cursor = response.next_cursor;
  }

  return comments;
}
```

### Pattern 2: Interactive Multi-Step Workflow with User Gates

**What:** GSD workflows use sequential prompts with AskUserQuestion for user interaction
**When to use:** For guided processes requiring user decisions (triage, approvals)

**Example:**
```javascript
// Conceptual — GSD workflows use prompt templates, not code
// See: complete-milestone.md step-by-step pattern

Step 1: Present themes → AskUserQuestion("Review theme?")
Step 2: User responds → Next theme or action
Step 3: Save results → Commit with gsd-tools
```

### Pattern 3: Theme Clustering with LLM (No External Libraries)

**What:** Use Claude's prompt to identify patterns across comments without NLP dependencies
**When to use:** For grouping feedback by topic/concern

**Example:**
```markdown
## Clustering Prompt Pattern

Given these comments from Notion pages:
1. "The authentication flow is confusing"
2. "Can we add SSO?"
3. "Login timeout is too short"

Identify 2-3 themes, group comments by theme, and map each theme to affected roadmap phases.

**Output:**
Theme: Authentication UX
- Comments: 1, 3
- Affected phases: Phase 2 (Git Integration), Phase 4 (UX Polish)
```

### Pattern 4: Dated Output Files for Historical Reference

**What:** Save triage results with ISO 8601 date prefix for chronological sorting
**When to use:** For audit trails and reference across milestones

**Example:**
```bash
# Harvard Library and UConn best practices: YYYY-MM-DD prefix
.planning/notion-comments-2026-02-11.md
.planning/notion-comments-2026-03-15.md
```

### Anti-Patterns to Avoid

- **Spawning subagents for triage:** GSD interactive workflows use prompt steps + AskUserQuestion, not Task/subagent spawning (overkill, context loss)
- **Writing custom pagination logic:** SDK handles cursor pagination — wrap it, don't reimplement
- **Querying resolved comments:** API only returns unresolved comments; attempting to retrieve resolved comments will return empty results
- **Starting discussion threads via API:** API cannot start new discussions — only reply to existing ones (limitation documented)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Notion API pagination | Custom cursor tracking with loops | SDK's built-in pagination handling | SDK includes retry logic, rate limiting, error handling |
| Text clustering/theming | Custom NLP tokenizer + TF-IDF | Claude prompt: "Group these comments by theme" | Claude excels at pattern recognition; no dependencies |
| Interactive prompt flow | Custom readline/inquirer prompts | GSD's AskUserQuestion + workflow steps | Consistent with GSD patterns, maintains conversation context |
| Discussion thread parsing | Custom discussion_id grouping | Sort comments by discussion_id (SDK returns it) | Comments already include discussion_id field |

**Key insight:** Notion SDK handles all API complexity. Claude handles all text analysis. Don't add libraries for problems already solved by existing stack.

## Common Pitfalls

### Pitfall 1: Attempting to Retrieve Resolved Comments

**What goes wrong:** API call returns empty results even when resolved comments exist
**Why it happens:** Notion Comments API only returns unresolved comments by design
**How to avoid:** Document this limitation clearly; only present unresolved comments to user
**Warning signs:** User reports "missing comments" that are actually resolved in Notion UI

### Pitfall 2: Missing Read Comment Permissions

**What goes wrong:** API returns 403 Forbidden when listing comments
**Why it happens:** Integration was not granted "read comment" capability in Notion dashboard
**How to avoid:** Validate permissions with SDK before comment operations; provide actionable error message with link to Notion integration settings
**Warning signs:** auth-check passes but comments.list() fails with 403

### Pitfall 3: Stale Page IDs in notion-sync.json

**What goes wrong:** Comment retrieval fails because page was deleted/moved in Notion
**Why it happens:** User modified Notion workspace after sync; sync state not updated
**How to avoid:** Validate page existence before fetching comments (reuse validatePageExists from page-manager.js); skip stale pages with warning
**Warning signs:** API returns 404 for page_id that exists in sync state

### Pitfall 4: Prompting for Sync at Wrong Workflow Step

**What goes wrong:** User prompted to sync Notion before milestone archival completes, resulting in inconsistent state
**Why it happens:** complete-milestone.md has multiple steps; sync prompt added too early
**How to avoid:** Add sync prompt AFTER git tag creation (step: offer_next), not before archival
**Warning signs:** Notion pages sync with old ROADMAP.md before archive step runs

### Pitfall 5: Overwriting Triage Files Without Date

**What goes wrong:** Previous triage results lost when new triage runs
**Why it happens:** Using fixed filename like "notion-comments.md" instead of dated version
**How to avoid:** Always use YYYY-MM-DD date prefix (ISO 8601); never overwrite
**Warning signs:** User reports "I lost the feedback from last week"

## Code Examples

Verified patterns from official sources:

### List Comments with Pagination
```javascript
// Source: https://developers.notion.com/docs/working-with-comments
const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function fetchCommentsFromPage(pageId) {
  const allComments = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.comments.list({
      block_id: pageId,
      start_cursor: startCursor,
      page_size: 100 // Max per request
    });

    allComments.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return allComments;
}
```

### Comment Object Structure
```javascript
// Source: https://developers.notion.com/reference/comment-object
{
  "object": "comment",
  "id": "4dec6e98-a4ad-414a-9e9e-dc5eeaf3d8e9",
  "discussion_id": "8fa6e3ecbebf494b94bae5e9737842fb",
  "created_time": "2025-09-03T21:51:00.000Z",
  "last_edited_time": "2025-09-03T21:51:00.000Z",
  "created_by": { /* user object */ },
  "rich_text": [
    {
      "type": "text",
      "text": { "content": "Hello world" }
    }
  ],
  "attachments": []
}
```

### Iterate Over Synced Pages
```javascript
// Pattern: Read notion-sync.json and iterate over doc_pages
const { loadSyncState } = require('./lib/notion/sync-state.js');

function getSyncedPageIds(cwd, projectSlug = 'default') {
  const syncState = loadSyncState(cwd);
  const project = syncState.projects[projectSlug];

  if (!project || !project.doc_pages) {
    return [];
  }

  return Object.entries(project.doc_pages).map(([filePath, mapping]) => ({
    filePath,
    pageId: mapping.page_id || mapping // Handle legacy string format
  }));
}
```

### Interactive Workflow Step Pattern
```markdown
<!-- Source: GSD complete-milestone.md pattern -->
<step name="prompt_for_sync">

Check if Notion integration is configured:
```bash
cat .planning/config.json | jq -r '.notion_token' 2>/dev/null
```

If configured and not empty:

```
## 📤 Upload Planning Docs to Notion?

Your planning docs are ready to share with stakeholders in Notion.

Run `/gsd:sync-notion` to push .planning/ to your Notion workspace.

Continue? (yes/skip)
```

If user confirms "yes":
- Run sync workflow automatically
- Report results
- Continue to next step

If "skip":
- Continue to next step
- User can manually run later

</step>
```

### Date-Stamped Output File
```javascript
// ISO 8601 date format for file sorting
const today = new Date().toISOString().split('T')[0]; // "2026-02-11"
const triageFile = `.planning/notion-comments-${today}.md`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual comment review in Notion | Automated retrieval + LLM clustering | 2024-2025 | LLMs enable theme identification without ML training |
| Subprocess spawning for interaction | Inline prompt steps + AskUserQuestion | GSD v1.0 | Maintains context, simpler debugging |
| Custom NLP libraries (sklearn) | LLM native text analysis | 2023-2024 | Zero dependencies for clustering/classification |
| Fixed-name output files | ISO 8601 dated filenames | Standard since 2020s | Prevents overwrites, enables historical analysis |

**Deprecated/outdated:**
- **notion.blocks.children.list() for comments:** Comments have dedicated endpoint (comments.list), not retrieved via blocks API
- **Recursive discussion parsing:** API returns flat list sorted chronologically; discussion_id field identifies threads

## Open Questions

1. **Should comment triage track per-comment status (addressed/deferred)?**
   - What we know: CMNT-05 requires dated .md output, doesn't specify granular tracking
   - What's unclear: If user triages comments across multiple sessions, how to avoid re-triaging?
   - Recommendation: Phase 10 saves dated output only; future phase could add stateful tracking to notion-sync.json if user requests (YAGNI for MVP)

2. **How to handle comments on pages not in sync state (manually created Notion pages)?**
   - What we know: comment-retriever only queries pages in notion-sync.json doc_pages
   - What's unclear: If user adds comments to manually created pages, should they be included?
   - Recommendation: Phase 10 scope: synced pages only. Document limitation. Future: add `--all-workspace` flag if needed.

3. **Should theme mapping be automatic or user-confirmed?**
   - What we know: CMNT-03 requires mapping themes to roadmap phases
   - What's unclear: User preference for full automation vs. review gate
   - Recommendation: Interactive approval — show Claude's mapping, ask "Adjust any mappings?" before saving (matches GSD interactive pattern)

## Sources

### Primary (HIGH confidence)
- [Notion List Comments API Reference](https://developers.notion.com/reference/list-comments) - Endpoint specification, parameters, pagination
- [Notion Working with Comments](https://developers.notion.com/docs/working-with-comments) - SDK examples, limitations, discussion threads
- [Notion Comment Object](https://developers.notion.com/reference/comment-object) - Response schema, field definitions
- GSD complete-milestone.md workflow - Step-by-step interactive pattern (internal)
- GSD sync-orchestrator.js - Pagination, error handling, state management patterns (internal)

### Secondary (MEDIUM confidence)
- [Harvard Library File Naming Best Practices](https://guides.library.harvard.edu/c.php?g=1033502&p=7496710) - ISO 8601 date format for filenames
- [UConn Data Management File Naming](https://guides.lib.uconn.edu/c.php?g=832372&p=8226285) - YYYY-MM-DD prefix standard
- [Claude Code Common Workflows](https://code.claude.com/docs/en/common-workflows) - Interactive session patterns
- [Build an LLM Agent for Log Clustering & Triage](https://www.typedef.ai/blog/build-an-llm-agent-for-log-clustering-and-triage) - LLM clustering patterns

### Tertiary (LOW confidence)
- Web search results on LLM-based comment triage - General concepts only, not implementation details

## Metadata

**Confidence breakdown:**
- Notion Comments API: HIGH - Official docs verified with WebFetch, SDK examples confirmed
- Interactive workflows: HIGH - Internal GSD codebase patterns established in Phases 1-9
- File naming conventions: HIGH - Multiple authoritative sources (Harvard, UConn standards)
- Theme clustering: MEDIUM - No specific library/implementation verified, relies on Claude capabilities (known to work but not formally tested)

**Research date:** 2026-02-11
**Valid until:** 2026-04-11 (60 days for stable APIs; Notion API changes infrequently)
