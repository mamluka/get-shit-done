# Pitfalls Research

**Domain:** Notion API Integration for CLI Tools
**Researched:** 2026-02-11
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Rate Limit Exhaustion Without Retry-After Handling

**What goes wrong:**
Integration hits Notion's 3 requests/second rate limit (2700 calls per 15 minutes), receives HTTP 429 errors, and fails silently or retries immediately, compounding the problem. Bulk operations like syncing multiple markdown files can exhaust rate limits quickly.

**Why it happens:**
Developers implement synchronous upload loops without rate limiting awareness, assuming "just retry" will work. The @notionhq/client SDK has retry logic but defaults to only 2 retries, insufficient for batch operations.

**How to avoid:**
- Configure SDK retry options: `maxRetries: 5`, `initialRetryDelayMs: 500`, `maxRetryDelayMs: 60000`
- Implement request queuing for batch operations (process sequentially or with throttling)
- Respect the `Retry-After` response header value when receiving 429 errors
- Add exponential backoff for failed requests
- For bulk operations, throttle to ~2 requests/second to stay safely under the 3 rps average

**Warning signs:**
- Intermittent 429 errors during bulk operations
- Operations work with single files but fail with multiple files
- Success rate decreases as batch size increases
- Error logs showing rapid-fire retries

**Phase to address:**
Phase 1 (SDK setup and core infrastructure) - build rate limiting into the foundation before implementing any batch operations.

---

### Pitfall 2: Markdown Block Conversion Character Limit Violations

**What goes wrong:**
Large markdown sections (>2000 characters) fail silently or truncate when converting to Notion blocks. Rich text arrays hit the 100-element limit. Documents that appear to upload successfully are missing content.

**Why it happens:**
Notion's API has a strict 2000 character limit per rich text array element and 100 element maximum per block. Developers convert markdown naively without chunking, assuming the API will handle large content.

**How to avoid:**
- Implement chunking logic that splits large text blocks into multiple Notion blocks before sending
- Monitor rich text array lengths and split when approaching 100 elements
- Use libraries like `martian` (@tryfabric/martian) that handle chunking automatically
- Validate converted content length before API calls
- Test with large markdown files (>10KB) during development

**Warning signs:**
- Content appears truncated in Notion after upload
- Long paragraphs cut off mid-sentence
- API validation errors mentioning "rich text" or "character limit"
- Complex markdown documents fail while simple ones succeed

**Phase to address:**
Phase 2 (markdown-to-Notion conversion) - implement chunking from the start, as retrofitting is complex and risks data corruption.

---

### Pitfall 3: Image Upload Expiration and Re-upload Loops

**What goes wrong:**
Uploaded images expire after 1 hour if not attached to a block. URLs fetched from Notion expire and break when re-fetched. Sync operations re-upload the same image repeatedly instead of reusing existing attachments.

**Why it happens:**
Developers don't realize Notion-hosted files have time-based expiration. Upload workflows assume "upload once, use forever" model. Image references aren't tracked between sync operations.

**How to avoid:**
- Attach uploaded images to blocks within 1 hour of upload
- Track image-to-block mappings in local metadata (page ID → image block IDs)
- Re-fetch file objects to refresh URLs when reading existing pages (don't cache URLs)
- For sync operations, detect unchanged images by comparing local file hashes to tracked uploads
- Implement idempotent image upload (upload only if local image changed)

**Warning signs:**
- Images work initially but show "expired" or broken later
- Same images uploaded multiple times during repeated syncs
- Orphaned uploads in Notion workspace (files not attached to pages)
- Sync operations take progressively longer due to unnecessary re-uploads

**Phase to address:**
Phase 3 (image upload) - implement upload tracking and expiration handling immediately, as fixing post-launch requires migration of existing metadata.

---

### Pitfall 4: Block Update vs Append Semantics Confusion

**What goes wrong:**
Attempting incremental page updates by using PATCH block endpoints fails because most block types can't be updated in place. Trying to "update" a page replaces entire content instead of merging changes. Images can't be updated at all and must be deleted/recreated.

**Why it happens:**
Developers assume PATCH semantics mean "merge changes" but Notion's API has separate update vs append operations. The page update endpoint (PATCH /v1/pages/:id) only updates properties/metadata, not content. Block children cannot be updated directly.

**How to avoid:**
- Track page block IDs in local metadata to enable surgical updates
- Use "append block children" endpoint to add new content at the end
- For content changes, delete old blocks and append new ones (no direct update)
- For images, delete old image block via block ID, then append new image block
- Implement "replace mode" flag: if true, use `erase_content: true` parameter (destructive); if false, append only
- Document that incremental updates require block ID tracking from initial creation

**Warning signs:**
- Page properties update but content doesn't change
- Error messages about "cannot update block children"
- Image updates fail with "operation not supported"
- Entire page content replaced when only partial update intended

**Phase to address:**
Phase 4 (incremental sync) - design sync strategy upfront with clear replace vs merge semantics, as changing strategy mid-project breaks existing workflows.

---

### Pitfall 5: Parent Page Hierarchy Immutability After Creation

**What goes wrong:**
Pages created with wrong parent cannot be moved programmatically. Parent-child hierarchy errors require manual Notion UI fixes. Attempting to reorganize page structure via API fails silently.

**Why it happens:**
The Notion API has no endpoint to change a page's parent after creation. Developers assume "create then organize" workflow but API only supports "organize during creation."

**How to avoid:**
- Verify parent page ID before creating child pages (no undo)
- Implement parent validation step that checks parent page exists and integration has access
- For nested markdown documents, resolve parent-child relationships before any API calls
- Build hierarchy bottom-up (deepest children first) or top-down with careful ID tracking
- Fail fast with clear error if parent page ID invalid or inaccessible
- Document limitation prominently: "Page parents cannot be changed after creation"

**Warning signs:**
- Pages created in wrong locations (flat instead of nested)
- Errors mentioning "parent access" or "parent not found"
- Manual Notion UI reorganization needed after API sync
- Hierarchy structure doesn't match local markdown directory structure

**Phase to address:**
Phase 2 (page hierarchy creation) - implement parent validation and hierarchy resolution before any page creation, as post-creation fixes require API deletion/recreation.

---

### Pitfall 6: Request Payload Size Limits in Bulk Operations

**What goes wrong:**
Creating pages with large content fails with "validation_error" despite individual blocks being under limits. Batch operations silently fail when payload exceeds 1000 blocks or 500KB total.

**Why it happens:**
Notion enforces overall payload limits (1000 blocks, 500KB) in addition to per-element limits. Developers check character limits but not aggregate payload size. Large markdown files converted to 200+ blocks exceed limits.

**How to avoid:**
- Implement payload size tracking: count total blocks and estimate size before API call
- For documents exceeding 900 blocks, split into multiple append operations
- Create page with first 900 blocks, then append remaining blocks via separate calls
- Monitor total payload size (estimate ~500 bytes per block as safety margin)
- Test with large markdown files (50+ KB) to validate chunking logic

**Warning signs:**
- Validation errors mentioning "request too large"
- Documents under per-block limits but still failing
- Success with small files, failure with large files at unpredictable threshold
- API returning 400 errors without specific field mentioned

**Phase to address:**
Phase 2 (markdown conversion) - build multi-request chunking into conversion pipeline, as retrofitting requires rewriting core upload logic.

---

### Pitfall 7: Comment API Read-Only Thread Limitations

**What goes wrong:**
Attempting to create new comment threads via API fails. Comments can only be added to existing threads started by users in Notion UI. Integration appears to "support comments" but can't initiate discussions.

**Why it happens:**
Notion's comment API is read-and-respond only - integrations cannot start new discussion threads on blocks, only reply to existing threads. Developers assume comment creation means "create thread" but API only supports "add to thread."

**How to avoid:**
- Document prominently that comment feature is "read and reply only"
- Implement comment retrieval to display existing discussions in CLI
- For comment-to-CLI workflow, detect existing threads and pull comments
- Don't implement "create comment" feature unless user has manually started thread in Notion
- Use `discussion_id` field to group comments by thread when displaying
- Consider alternative: append regular text blocks instead of inline comments for annotations

**Warning signs:**
- Errors mentioning "cannot start discussion"
- Comments appear in Notion but not attached to blocks
- Feature works for some pages (with existing threads) but not others (new pages)
- Integration lacks permission to create inline comments

**Phase to address:**
Phase 5 (comment retrieval) - scope as "read-only thread viewer" from the start to avoid building unusable "create comment" UI.

---

### Pitfall 8: Block Nesting Depth Limit Exceeded in Complex Markdown

**What goes wrong:**
Deeply nested markdown lists (toggle lists, nested bullet points >2 levels) fail during conversion. API silently truncates nested content or flattens structure.

**Why it happens:**
Notion API allows maximum 2 levels of nesting in a single request. Markdown with 4+ nesting levels exceeds this limit. Recursive conversion doesn't account for depth restrictions.

**How to avoid:**
- Implement nesting depth validation during markdown parsing
- Flatten deeply nested structures to 2 levels maximum (Notion's limit)
- For structures needing >2 levels, create parent blocks first, then append grandchildren in subsequent requests
- Track parent block IDs during recursive creation to enable multi-request nesting
- Test with complex markdown: nested toggles, nested lists, nested quotes

**Warning signs:**
- Nested lists appear flat in Notion
- Toggle blocks lose their nested children
- Indentation structure doesn't match source markdown
- Content appears but hierarchy is flattened

**Phase to address:**
Phase 2 (markdown conversion) - handle nesting limits during initial conversion logic, as fixing later requires re-parsing entire document structures.

---

### Pitfall 9: Heading Level Mismatch Due to Notion's Three-Level Limit

**What goes wrong:**
Markdown documents with H4, H5, H6 headings all convert to Notion's H3 (smallest heading). Document hierarchy appears flattened. Table of contents and navigation breaks.

**Why it happens:**
Notion only supports heading levels 1, 2, and 3. Markdown allows H1-H6. Naive conversion maps H4+ to H3, losing hierarchical distinction.

**How to avoid:**
- Document heading limitation prominently in user-facing docs
- Implement heading level normalization: H1→H1, H2→H2, H3+→H3
- Consider alternative: convert H4+ to bold paragraph text to preserve visual distinction
- For documents with deep heading hierarchies, suggest restructuring before conversion
- Provide warning during conversion: "H4+ headings downgraded to H3"

**Warning signs:**
- All subsections appear same size in Notion
- Document outline loses depth
- Navigation hierarchy flattened
- Users report "everything looks the same"

**Phase to address:**
Phase 2 (markdown conversion) - handle during initial heading conversion, as changing strategy later breaks consistency across synced documents.

---

### Pitfall 10: Integration Token Exposure in Git Commits

**What goes wrong:**
Developer commits `.env` file or hardcoded token to git, leaking Notion integration credentials. Token grants full access to all pages integration can reach.

**Why it happens:**
CLI tools often use local config files for tokens. Git integration in GSD auto-commits `.planning/` directory. Developers forget to gitignore sensitive files or accidentally include tokens in config files.

**How to avoid:**
- Store token exclusively in environment variable (`NOTION_API_KEY`)
- Never write token to any file in `.planning/` or git-tracked directories
- Add `.env*` to `.gitignore` before any development
- Document token setup: "Set NOTION_API_KEY environment variable - never commit token"
- Implement token validation on startup with clear error if missing
- Use git pre-commit hook to detect and block token patterns
- Rotate token immediately if accidentally committed (via Notion integration settings)

**Warning signs:**
- Token visible in git history
- Config files containing "secret_" or "ntn_" prefixes (Notion token format)
- `.env` files tracked in git
- Security scanner alerts about exposed credentials

**Phase to address:**
Phase 1 (SDK setup) - enforce environment variable pattern before any token usage, as leaked tokens require immediate rotation and audit.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip block ID tracking for sync | Faster initial implementation | Cannot do incremental updates, must replace entire pages | Never - tracking is essential for sync |
| Hardcode 3 rps throttle instead of Retry-After | Simple implementation | Doesn't adapt to Notion rate limit changes, wastes time waiting when unnecessary | Never - Retry-After header is authoritative |
| Convert markdown to Notion blocks without chunking | Works for small docs | Fails on large documents, requires rewrite | Only for proof-of-concept, never production |
| Store image URLs from Notion API responses | Avoids re-fetching | URLs expire after 1 hour, breaks existing references | Never - always re-fetch when displaying |
| Use PATCH to update page content | Seems like standard REST pattern | Doesn't work, blocks aren't updatable this way | Never - API semantics differ from REST conventions |
| Assume page parent can be changed later | Flexible "create first, organize later" workflow | No API to move pages, requires delete/recreate | Never - validate parent upfront |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| @notionhq/client SDK | Using default retry settings (2 retries) for bulk operations | Configure `maxRetries: 5` and exponential backoff for batch uploads |
| Markdown parsers (martian, notion-to-md) | Assuming they handle all API limits | Validate output: check block count (<1000), payload size (<500KB), nesting depth (≤2) |
| Git auto-commit in GSD | Committing Notion tokens in `.planning/config.json` | Store token in environment variable only, never in tracked files |
| Image file uploads | Uploading to Notion then referencing later | Attach uploaded images to blocks within 1 hour or they expire |
| Page hierarchy sync | Creating pages flat then trying to reorganize | Resolve parent-child relationships before API calls, create with correct parent |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous sequential uploads | Slow but works for 5-10 pages | Implement request queue with 2 rps throttling | >20 pages, takes 10+ seconds per page |
| Re-uploading unchanged images every sync | Unnecessary API calls, slow syncs | Track local file hashes, skip upload if unchanged | >10 images per sync, wastes rate limit budget |
| Fetching nested blocks recursively without caching | Excessive API calls for deep hierarchies | Cache page structure, invalidate only on sync | Pages with >50 nested blocks |
| Creating pages with all content in single request | Works until hitting 1000 block limit | Chunk into 900-block batches with append operations | Markdown files >50KB or >900 blocks |
| Not implementing incremental sync | Full replace works for small projects | Track block IDs, implement surgical updates | >50 pages, full sync takes minutes |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Notion token in `.planning/config.json` | Token leaked via git commit, grants full integration access | Use environment variable exclusively: `NOTION_API_KEY` |
| Not validating parent page access before creation | Creates pages in unauthorized locations, potential data leakage | Verify integration has access to parent via API call before creating children |
| Logging API responses with sensitive page content | User data exposed in CLI logs or terminal history | Sanitize logs: show page IDs but not content, use LogLevel.DEBUG only when needed |
| Sharing integration tokens between projects | Token compromise affects all projects, no isolation | Create separate integration per project or per environment |
| Not rotating tokens after team member departure | Former team member retains access via committed/shared token | Rotate token immediately when access should be revoked |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent failure on rate limit | User sees "sync failed" with no explanation, retries manually and makes it worse | Show clear message: "Rate limited, retrying in {N} seconds..." with progress indicator |
| No progress indicator for bulk uploads | User doesn't know if tool is frozen or working | Display "Uploading page 3/20..." with percentage and current page name |
| Syncing entire document when only metadata changed | Wastes time, user waits unnecessarily | Detect content vs property changes, update only what changed |
| Creating Notion pages without user preview | User sees unexpected formatting, has to manually fix in Notion | Show preview: "Will create page with N blocks, H1/H2/H3 headings, M images - proceed?" |
| No error recovery guidance | "Error: validation_error" leaves user stuck | Specific guidance: "Document too large (1200 blocks, limit 1000). Split into sections or reduce nesting." |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Markdown conversion:** Often missing chunking for 2000-char limit — verify with >10KB markdown file containing 3000+ char paragraphs
- [ ] **Image upload:** Often missing expiration handling — verify images still load after 2 hours
- [ ] **Rate limiting:** Often missing Retry-After header handling — verify bulk operation with 50+ pages respects 429 responses
- [ ] **Page hierarchy:** Often missing parent validation — verify error handling when parent page doesn't exist or lacks access
- [ ] **Incremental sync:** Often missing block ID tracking — verify second sync updates existing pages instead of creating duplicates
- [ ] **Error messages:** Often showing raw API errors — verify user-facing messages explain what went wrong and how to fix
- [ ] **Token security:** Often hardcoded or committed — verify token stored only in environment variable, no files contain it
- [ ] **Nested content:** Often missing nesting depth checks — verify deeply nested markdown (4+ levels) doesn't break

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Rate limit exhaustion | LOW | Wait for Retry-After period (typically 15 min), implement exponential backoff, retry batch |
| Duplicate pages created | MEDIUM | Use Notion API to delete duplicates by page ID, implement idempotency tracking to prevent recurrence |
| Images expired | LOW | Re-fetch image blocks to get fresh URLs, or delete and re-upload images with new blocks |
| Token leaked in git | HIGH | Immediately rotate token via Notion integration settings, audit git history for exposure window, force-push history rewrite if needed (coordinate with team) |
| Wrong parent hierarchy | HIGH | Delete incorrectly parented pages via API, recreate with correct parent (data loss risk if not backed up locally) |
| Content truncated due to limits | MEDIUM | Implement chunking logic, re-sync affected pages with chunked content, verify no data loss |
| Block ID tracking missing | HIGH | Delete all synced pages, implement tracking, re-sync from scratch (or maintain mapping manually) |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Rate limit exhaustion | Phase 1: SDK Setup | Load test with 50 sequential requests, verify Retry-After respected |
| Markdown block conversion limits | Phase 2: MD-to-Notion Conversion | Test with 10KB markdown file, verify no truncation |
| Image upload expiration | Phase 3: Image Upload | Upload image, wait 2 hours, verify URL refresh logic works |
| Block update vs append confusion | Phase 4: Incremental Sync | Sync page twice, verify second sync updates (not duplicates) |
| Parent hierarchy immutability | Phase 2: Page Hierarchy | Test with nested markdown dirs, verify parent validation errors show before creation |
| Request payload size limits | Phase 2: MD-to-Notion Conversion | Test with 60KB markdown file (1000+ blocks), verify chunking |
| Comment API read-only threads | Phase 5: Comment Retrieval | Verify "read-only" documented, no "create thread" UI built |
| Block nesting depth limits | Phase 2: MD-to-Notion Conversion | Test markdown with 4-level nested lists, verify flattening or multi-request nesting |
| Heading level mismatches | Phase 2: MD-to-Notion Conversion | Test markdown with H1-H6, verify H4+ documented as limitations |
| Token exposure in git | Phase 1: SDK Setup | Verify `.env` in `.gitignore`, git pre-commit hook detects token patterns |

## Sources

**Notion API Official Documentation:**
- [Request limits](https://developers.notion.com/reference/request-limits) - Rate limiting, payload limits, Retry-After header
- [Working with page content](https://developers.notion.com/docs/working-with-page-content) - Block nesting, unsupported types, update semantics
- [Working with files and media](https://developers.notion.com/docs/working-with-files-and-media) - Upload workflows, size limits, expiration behavior
- [Best practices for handling API keys](https://developers.notion.com/docs/best-practices-for-handling-api-keys) - Token security, rotation, secret management

**Rate Limiting:**
- [Understanding Notion API Rate Limits in 2025](https://www.oreateai.com/blog/understanding-notion-api-rate-limits-in-2025-what-you-need-to-know/50d89b885182f65117ff8af2609b34c2) - 3 rps average, 2700 calls per 15 min
- [How to Handle Notion API Request Limits](https://thomasjfrank.com/how-to-handle-notion-api-request-limits/) - Retry strategies, request queuing

**Markdown Conversion:**
- [Martian - Markdown to Notion](https://github.com/tryfabric/martian) - 2000-char limit handling, chunking strategies
- [Using Markdown in Notion Without Losing Formatting](https://www.goinsight.ai/blog/markdown-to-notion/) - Heading levels, formatting limitations
- [Markdown to Notion Blocks](https://brittonhayes.dev/notes/markdown-to-notion-blocks/) - Nesting depth, rich text arrays

**SDK and Error Handling:**
- [Official Notion JavaScript Client](https://github.com/makenotion/notion-sdk-js) - Retry configuration, error types
- [@notionhq/client - npm](https://www.npmjs.com/package/@notionhq/client) - API usage, TypeScript examples

**File Uploads:**
- [Uploading Files via Notion's API](https://notionmastery.com/uploading-files-via-notions-api/) - Expiration times, multi-part uploads
- [Uploading small files](https://developers.notion.com/guides/data-apis/uploading-small-files) - Size limits, workflow steps

**Comments API:**
- [Working with comments](https://developers.notion.com/guides/data-apis/working-with-comments) - Read-only threading, discussion IDs
- [Comments API changelog](https://developers.notion.com/changelog/comments-api) - API capabilities and limitations

**Page Hierarchy:**
- [Parent object reference](https://developers.notion.com/reference/parent-object) - Parent types, creation constraints
- [Feature Request: Page Parent Management](https://github.com/makenotion/notion-mcp-server/issues/64) - No API to move pages after creation

**Block Operations:**
- [Update page properties](https://developers.notion.com/reference/patch-page) - Property vs content updates, erase_content flag
- [Append block children](https://developers.notion.com/reference/patch-block-children) - 100 block limit, append-only semantics
- [How to handle deep nesting restrictions](https://community.latenode.com/t/how-to-handle-deep-nesting-restrictions-in-notion-api-block-creation/29316) - 2-level nesting limit

**Security:**
- [Remediating Notion Integration Token leaks](https://www.gitguardian.com/remediation/notion-integration-token) - Token rotation, leak detection
- [Notion Integration Token detection](https://docs.gitguardian.com/secrets-detection/secrets-detection-engine/detectors/specifics/notion_integration_token) - Token patterns, security scanning

**Sync and Webhooks:**
- [Webhooks documentation](https://developers.notion.com/reference/webhooks) - Real-time change tracking, event types
- [Pushing Notion to the Limits](https://notionmastery.com/pushing-notion-to-the-limits/) - Performance constraints, scale thresholds

---
*Pitfalls research for: Notion API Integration for CLI Tools*
*Researched: 2026-02-11*
