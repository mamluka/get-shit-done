# Phase 8: Page Hierarchy & Incremental Sync - Research

**Researched:** 2026-02-11
**Domain:** Notion API page operations, incremental sync patterns, file change detection
**Confidence:** HIGH

## Summary

Phase 8 extends Phase 7's conversion engine with bidirectional sync capabilities. The Notion API provides strong primitives for page hierarchy (parent/child via `page_id`, position control for ordering) and CRUD operations (create, update, move). Key challenge is managing incremental sync state - tracking file-to-page mappings, detecting file changes via content hashing, and deciding create vs. update logic.

Recent 2026 Notion API updates significantly improve this phase: parent pages are now mutable via the new Move page API (POST `/v1/pages/{page_id}/move`), and the position parameter enables precise child page ordering. Phase 7's existing `sync-state.js` module and `notion-sync.json` schema provide the foundation for file-to-page-ID mapping.

**Primary recommendation:** Build on Phase 7's converter and sync-state modules. Use SHA-256 streaming hashes for change detection (native crypto module). Implement sync orchestrator that walks .planning/ directory, loads sync state, hashes files to detect changes, creates or updates pages via Notion SDK, and persists mappings after each file.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @notionhq/client | 5.7.0+ | Notion API operations | Official SDK, handles auth/retry/rate-limiting, TypeScript types |
| Node.js crypto (built-in) | Node 18+ | SHA-256 file hashing | Native, zero-dependency, streaming support for memory efficiency |
| fs (built-in) | Node 18+ | File system operations | Native module for reading .planning/ directory |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tryfabric/martian | 2.2.4 | Markdown-to-blocks | Already integrated in Phase 7 converter module |
| path (built-in) | Node 18+ | File path manipulation | Normalizing relative paths for sync state keys |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SHA-256 | MD5 | MD5 is faster but collision-vulnerable; SHA-256 is still fast and collision-resistant |
| File streaming | Buffer entire file | Streaming prevents memory issues with large files; no downside for this use case |
| JSON persistence | SQLite/Redis | JSON is simpler, already in Phase 7; SQLite adds dependency for minimal gain at current scale |

**Installation:**
```bash
npm install @notionhq/client@^5.7.0
# crypto, fs, path are built-in
```

## Architecture Patterns

### Recommended Project Structure
```
lib/notion/
├── client.js            # Phase 7 - Notion SDK client factory
├── sync-state.js        # Phase 7 - notion-sync.json CRUD operations
├── converter.js         # Phase 7 - markdown to blocks pipeline
├── hierarchy.js         # NEW - folder structure to parent/child mapping
├── page-manager.js      # NEW - create/update/move page operations
├── change-detector.js   # NEW - SHA-256 file hashing
└── sync-orchestrator.js # NEW - main sync logic, coordinates all modules
```

### Pattern 1: Incremental Sync with Hash-Based Change Detection
**What:** Compare SHA-256 hash of current file content against stored hash in notion-sync.json. Skip sync if hashes match.
**When to use:** Every sync operation to minimize API calls and respect rate limits
**Example:**
```javascript
// Source: Node.js crypto module documentation + research synthesis
const crypto = require('crypto');
const fs = require('fs');

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function needsSync(filePath, syncState, projectSlug) {
  const currentHash = await hashFile(filePath);
  const stored = syncState.projects[projectSlug]?.doc_pages?.[filePath];

  if (!stored) return { needsSync: true, reason: 'unmapped' };
  if (!stored.hash) return { needsSync: true, reason: 'no_hash' };
  if (stored.hash !== currentHash) return { needsSync: true, reason: 'changed' };

  return { needsSync: false, currentHash };
}
```

### Pattern 2: Folder Hierarchy to Parent/Child Page Mapping
**What:** Parse .planning/ directory structure to determine parent-child relationships. PROJECT.md becomes root, phase folders become children, PLAN.md files become grandchildren.
**When to use:** During sync initialization to build page creation order
**Example:**
```javascript
// Source: Research synthesis + Phase 7 file sorting pattern
function buildHierarchy(planningDir) {
  const hierarchy = {
    root: path.join(planningDir, 'PROJECT.md'),
    children: []
  };

  // Priority files at root level
  const rootFiles = ['ROADMAP.md', 'REQUIREMENTS.md', 'STATE.md'];
  for (const file of rootFiles) {
    const filePath = path.join(planningDir, file);
    if (fs.existsSync(filePath)) {
      hierarchy.children.push({ file: filePath, children: [] });
    }
  }

  // Phase folders
  const phasesDir = path.join(planningDir, 'phases');
  if (fs.existsSync(phasesDir)) {
    const phases = fs.readdirSync(phasesDir)
      .filter(name => fs.statSync(path.join(phasesDir, name)).isDirectory())
      .sort();

    for (const phase of phases) {
      const phaseDir = path.join(phasesDir, phase);
      const phaseFiles = fs.readdirSync(phaseDir)
        .filter(f => f.endsWith('.md'))
        .sort();

      hierarchy.children.push({
        folder: phaseDir,
        children: phaseFiles.map(f => ({ file: path.join(phaseDir, f) }))
      });
    }
  }

  return hierarchy;
}
```

### Pattern 3: Create vs. Update Page Decision Logic
**What:** Query notion-sync.json for existing page_id. If found and valid, update. If not found, create. If invalid (404), remove mapping and create new.
**When to use:** For every file during sync
**Example:**
```javascript
// Source: Notion API documentation + research synthesis
async function syncPage(notion, filePath, blocks, syncState, projectSlug, parentPageId) {
  const pageId = getPageId(syncState, projectSlug, filePath);

  if (pageId) {
    // Validate page still exists
    try {
      await notion.pages.retrieve({ page_id: pageId });
      // Page exists - update it
      return await updatePage(notion, pageId, blocks);
    } catch (error) {
      if (error.code === 'object_not_found') {
        // Page was deleted in Notion - create new
        console.warn(`Page ${pageId} not found, creating new page`);
        return await createPage(notion, filePath, blocks, parentPageId);
      }
      throw error;
    }
  } else {
    // No mapping - create new page
    return await createPage(notion, filePath, blocks, parentPageId);
  }
}
```

### Pattern 4: Atomic State Updates After Each File
**What:** Update notion-sync.json immediately after successfully syncing each file. Enables resume-on-error.
**When to use:** After every successful page create/update operation
**Example:**
```javascript
// Source: Phase 7 converter.js pattern + research synthesis
async function syncFile(notion, filePath, syncState, projectSlug, parentPageId) {
  try {
    // Convert markdown to blocks (Phase 7)
    const { blocks, chunks } = convertFile(filePath);

    // Sync to Notion
    const pageId = await syncPage(notion, filePath, blocks, syncState, projectSlug, parentPageId);

    // Update sync state atomically
    const currentHash = await hashFile(filePath);
    setPageMapping(syncState, projectSlug, filePath, {
      page_id: pageId,
      hash: currentHash,
      syncedAt: new Date().toISOString()
    });
    saveSyncState(process.cwd(), syncState);

    return { success: true, pageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Anti-Patterns to Avoid
- **Batch-then-persist:** Syncing all files before saving state means errors lose all progress. Update state after each file instead.
- **Skip parent validation:** Creating child pages before parent exists causes immutable parent errors. Always validate/create parent first.
- **Ignore 404 on update:** If a mapped page was deleted in Notion, attempting update will fail. Check for 404 and create new page.
- **Hash after sync:** Computing hash before sync prevents race conditions where file changes during sync operation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Notion API client | Raw HTTP requests | @notionhq/client | Handles auth, rate limiting, retries, pagination, typed errors |
| File hashing | Custom hash implementation | Node.js crypto.createHash | Native, optimized, streaming support, well-tested |
| Markdown parsing | Custom markdown parser | @tryfabric/martian (Phase 7) | Already integrated, handles Notion block limits |
| JSON atomicity | Custom file locking | fs.writeFileSync with tmp+rename | Node.js atomic writes are sufficient for single-process CLI |

**Key insight:** Sync orchestration is complex enough - leverage battle-tested libraries for file I/O, hashing, and API communication. Focus custom code on sync decision logic and state management.

## Common Pitfalls

### Pitfall 1: Parent Page Not Created Before Children
**What goes wrong:** Notion API returns validation error "parent.page_id is invalid" when creating child page before parent exists
**Why it happens:** Async file processing without dependency tracking; attempting parallel page creation
**How to avoid:** Build hierarchy tree first, process in breadth-first order (parents before children), validate parent page_id exists in sync state before creating children
**Warning signs:** API errors mentioning "parent.page_id", sporadic failures depending on file processing order

### Pitfall 2: Immutable Parent Assumption (RESOLVED in 2026)
**What went wrong historically:** Developers assumed page parent couldn't be changed after creation, leading to delete-and-recreate patterns
**Why it happened:** Notion API lacked move endpoint until 2026
**Current state:** Move page API (POST `/v1/pages/{page_id}/move`) now supports changing parent. For Phase 8, validate parent before create to avoid needing move operation.
**How to leverage:** If parent structure changes (rare), can now use move API instead of recreating pages

### Pitfall 3: Stale Page ID Mappings
**What goes wrong:** User deletes page in Notion UI, sync attempts update, gets 404, sync fails
**Why it happens:** notion-sync.json persists page_id but Notion state diverges
**How to avoid:** Wrap page operations in try-catch, detect `object_not_found` error code, remove stale mapping, create new page
**Warning signs:** Sync failures with "object_not_found" errors, pages that worked previously now fail

### Pitfall 4: Content Replacement vs. Append on Update
**What goes wrong:** Updating page by appending blocks causes duplicated content on each sync
**Why it happens:** Confusion between blocks.children.append (adds blocks) and replacing page content (requires deleting old blocks first)
**How to avoid:** For updates, use Notion's archive block API to delete existing content blocks, then append new blocks. Alternative: Track block IDs in sync state and perform targeted updates.
**Warning signs:** Pages grow longer with each sync, duplicate content appears

### Pitfall 5: Hash Stored But Never Updated
**What goes wrong:** File hash stored during first sync but never updated on subsequent syncs, causing every sync to skip the file
**Why it happens:** Conditional logic that only computes hash for create, not update
**How to avoid:** Always recompute hash before comparison and store new hash after successful sync
**Warning signs:** Files don't sync after initial creation, edits not reflected in Notion

## Code Examples

Verified patterns from official sources:

### Create Page with Parent
```javascript
// Source: Notion API Create Page documentation + @notionhq/client examples
const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function createPageWithParent(parentPageId, title, blocks) {
  const response = await notion.pages.create({
    parent: { page_id: parentPageId },
    properties: {
      title: {
        title: [{ text: { content: title } }]
      }
    },
    children: blocks.slice(0, 100) // Max 100 blocks per create
  });

  // If more than 100 blocks, append remaining in batches
  if (blocks.length > 100) {
    for (let i = 100; i < blocks.length; i += 100) {
      const chunk = blocks.slice(i, i + 100);
      await notion.blocks.children.append({
        block_id: response.id,
        children: chunk
      });
    }
  }

  return response.id;
}
```

### Update Page Properties
```javascript
// Source: Notion API Update Page documentation
async function updatePageTitle(pageId, newTitle) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      title: {
        title: [{ text: { content: newTitle } }]
      }
    }
  });
}
```

### Replace Page Content (Delete + Append Pattern)
```javascript
// Source: Research synthesis - Notion API block operations
async function replacePageContent(notion, pageId, newBlocks) {
  // Step 1: Get existing child blocks
  const existingBlocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100
  });

  // Step 2: Archive (delete) existing blocks
  for (const block of existingBlocks.results) {
    await notion.blocks.update({
      block_id: block.id,
      archived: true
    });
  }

  // Step 3: Append new blocks in chunks
  for (let i = 0; i < newBlocks.length; i += 100) {
    const chunk = newBlocks.slice(i, i + 100);
    await notion.blocks.children.append({
      block_id: pageId,
      children: chunk
    });
  }
}
```

### Progress Indicator Pattern
```javascript
// Source: Phase 7 bin/notion-sync.js pattern
function printSyncProgress(fileName, status, index, total) {
  const statusSymbol = {
    'creating': '●',
    'updating': '◐',
    'skipped': '○',
    'error': '✗'
  }[status] || '?';

  const statusColor = {
    'creating': '\x1b[32m', // green
    'updating': '\x1b[33m', // yellow
    'skipped': '\x1b[2m',   // dim
    'error': '\x1b[31m'     // red
  }[status] || '';

  const reset = '\x1b[0m';
  console.log(`${statusColor}${statusSymbol}${reset} ${fileName} (${index}/${total})`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Parent page immutable | Move page API available | 2026-01 (v5.7.0 SDK) | Can now reorganize page hierarchy without recreating pages |
| `after` block positioning | `position` parameter | 2025-09 API upgrade | More flexible child page ordering (start, end, after) |
| Manual retry logic | SDK built-in retry | SDK v5.0+ | Rate limiting and transient errors handled automatically |
| Buffer entire file for hash | Streaming hash | Node 18+ best practice | Better memory efficiency for large markdown files |

**Deprecated/outdated:**
- **`after` parameter in blocks.children.append:** Replaced by `position` parameter with `type` and `block_id` fields
- **Assumption parent is immutable:** Move page API now exists, though Phase 8 should still validate parent before create to avoid needing move

## Open Questions

1. **How to handle block_id tracking for targeted updates?**
   - What we know: Replacing all content works but is inefficient; Notion blocks have IDs
   - What's unclear: Whether tracking block IDs per file in sync state provides meaningful benefit vs. delete-all-append-new simplicity
   - Recommendation: Start with delete-all-append-new (simpler, stateless). Optimize to block-level diffing only if performance/rate-limiting becomes issue.

2. **Should folder structure changes trigger page moves?**
   - What we know: Move page API exists; .planning/ structure rarely changes
   - What's unclear: Whether detecting folder renames and calling move API adds value vs. treating as delete+create
   - Recommendation: Phase 8 ignores folder structure changes. User manually reorganizes in Notion if needed. Defer to Phase 10+ if user requests it.

3. **How to handle concurrent sync operations?**
   - What we know: CLI is single-process; notion-sync.json written after each file
   - What's unclear: If user runs sync in two terminals simultaneously on same project, state corruption possible
   - Recommendation: Document as unsupported. Single-process atomic writes are sufficient for MVP. Add file locking only if users report issues.

4. **What happens to comments when replacing page content?**
   - What we know: Archiving blocks likely removes associated comments; Notion API provides comment retrieval (Phase 10)
   - What's unclear: Whether block replacement preserves or deletes comments
   - Recommendation: Test empirically during Phase 8 implementation. Document behavior. Phase 10 comment retrieval will need to account for this.

## Sources

### Primary (HIGH confidence)
- [@notionhq/client npm package](https://www.npmjs.com/package/@notionhq/client) - Official SDK, version info, installation
- [GitHub makenotion/notion-sdk-js](https://github.com/makenotion/notion-sdk-js) - SDK examples, pagination utilities
- [Notion API Move page endpoint](https://developers.notion.com/reference/move-page) - Move page API documentation
- [Notion API Create Page documentation](https://developers.notion.com/reference/post-page) - Parent parameter, page creation
- [Notion API Append block children](https://developers.notion.com/reference/patch-block-children) - Block append operations
- [Node.js Crypto module documentation](https://nodejs.org/api/crypto.html) - createHash, streaming patterns
- Phase 7 implementation: `lib/notion/sync-state.js`, `lib/notion/converter.js`, `lib/notion/client.js` - Existing architecture

### Secondary (MEDIUM confidence)
- [Notion API 2025-09-03 upgrade guide](https://developers.notion.com/docs/upgrade-guide-2025-09-03) - Verified via WebSearch: Move page API, position parameter
- [JavaScript hashing speed comparison: MD5 vs SHA-256](https://lemire.me/blog/2025/01/11/javascript-hashing-speed-comparison-md5-versus-sha-256/) - SHA-256 performance characteristics
- [Efficient file deduplication with sha-256 and Node.js | Transloadit](https://transloadit.com/devtips/efficient-file-deduplication-with-sha-256-and-node-js/) - Best practices for streaming hash
- [Node.js File System 2026 Guide – TheLinuxCode](https://thelinuxcode.com/nodejs-file-system-in-practice-a-production-grade-guide-for-2026/) - Atomic write patterns, NDJSON

### Tertiary (LOW confidence)
- Community discussions on parent/child relationships - WebSearch aggregation, not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK, native Node.js modules, verified versions
- Architecture: HIGH - Based on Phase 7 implementation + official Notion API docs
- Pitfalls: MEDIUM-HIGH - Mix of official docs (parent validation, 404 handling) and inferred patterns (hash staleness, content replacement)

**Research date:** 2026-02-11
**Valid until:** ~30 days (Notion API stable, Node.js crypto stable, @notionhq/client mature library)
