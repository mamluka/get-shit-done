# Architecture Research: Notion Integration

**Domain:** Notion CLI Integration for PM Planning Tool
**Researched:** 2026-02-11
**Confidence:** HIGH

## Integration Overview

The Notion integration adds a parallel artifact distribution layer to the existing GSD architecture. Planning artifacts remain git-backed (source of truth), while Notion becomes a stakeholder collaboration interface with bidirectional sync for review and feedback.

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTION LAYER                    │
│  /gsd:sync-notion     /gsd:notion-comments                   │
└──────────────┬────────────────────┬──────────────────────────┘
               ↓                    ↓
┌──────────────────────────────────────────────────────────────┐
│                    COMMAND LAYER (NEW)                       │
│  commands/gsd/sync-notion.md    commands/gsd/notion-         │
│                                 comments.md                  │
└──────────────┬────────────────────┬──────────────────────────┘
               ↓                    ↓
┌──────────────────────────────────────────────────────────────┐
│                   WORKFLOW LAYER (NEW)                       │
│  workflows/sync-notion.md    workflows/notion-comments.md    │
└──────────────┬────────────────────┬──────────────────────────┘
               ↓                    ↓
┌──────────────────────────────────────────────────────────────┐
│                   NOTION CLI TOOL (NEW)                      │
│           get-shit-done/bin/notion-sync.js                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  MD Parser   │  │ Page Manager │  │   Comment    │       │
│  │  (Martian)   │  │  (Hierarchy) │  │   Retriever  │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
└─────────┼─────────────────┼─────────────────┼────────────────┘
          ↓                 ↓                 ↓
┌──────────────────────────────────────────────────────────────┐
│                   STATE TRACKING (NEW)                       │
│     .planning/{project}/v{N}/notion-sync.json                │
│     { page_mapping: {...}, last_sync: {...} }                │
└──────────────────────────────────────────────────────────────┘
          ↓                 ↓                 ↓
┌──────────────────────────────────────────────────────────────┐
│                    @notionhq/client SDK                      │
│  Client → Pages API → Blocks API → Comments API              │
└──────────────┬────────────────────┬──────────────────────────┘
               ↓                    ↓
┌──────────────────────────────────────────────────────────────┐
│                     NOTION WORKSPACE                         │
│  Database: Projects → Pages (hierarchy matching .planning/)  │
└──────────────────────────────────────────────────────────────┘

         ←──────────────────────────────────────────────
                    EXISTING GSD ARCHITECTURE
         ───────────────────────────────────────────────→

┌──────────────────────────────────────────────────────────────┐
│                EXISTING UTILITY LAYER (REUSE)                │
│              get-shit-done/bin/gsd-tools.js                  │
│  PathResolver | Config | State | Git Operations              │
└──────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────┐
│                  PLANNING ARTIFACTS (SOURCE OF TRUTH)        │
│   .planning/{project}/v{N}/                                  │
│   ├── PROJECT.md, STATE.md, ROADMAP.md, REQUIREMENTS.md     │
│   ├── phases/{N}-{name}/                                     │
│   │   ├── {phase}-PLAN.md, {phase}-SUMMARY.md               │
│   └── research/, milestones/                                 │
└──────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### New Components

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **notion-sync.js** | CLI tool for all Notion operations | Node.js script using @notionhq/client SDK, invoked from workflows |
| **Markdown Parser** | Convert .md → Notion blocks | @tryfabric/martian v1.2.4+ for AST-based conversion |
| **Page Manager** | Create/update page hierarchy | Notion Pages API with parent/child relationships |
| **Image Uploader** | Handle local images + external links | External URL strategy (HTTPS links in blocks) |
| **Comment Retriever** | Pull comments from Notion pages | Notion Comments API with discussion grouping |
| **State Tracker** | Track page IDs per project | notion-sync.json in version folder |
| **sync-notion.md workflow** | Orchestrate upload process | Read artifacts → parse → create/update pages → track state |
| **notion-comments.md workflow** | Orchestrate comment retrieval | Fetch comments → format as .md → save to triage/ |

### Modified Components

| Component | Modification | Reason |
|-----------|--------------|--------|
| **gsd-tools.js** | Add `notion get-config` command | Return API key and workspace ID for notion-sync.js |
| **config.json** | Add `notion` section | Store API key, workspace ID, database ID |
| **installer (bin/install.js)** | Add Notion setup step | Prompt for API key during npx install |
| **complete-milestone workflow** | Add Notion upload prompt | After git tag: "Upload to Notion?" Yes/No |

### Reused Components (No Changes)

| Component | How Notion Uses It |
|-----------|-------------------|
| **PathResolver** | Resolve .planning/ paths in nested mode (per-project structure) |
| **Config system** | Store Notion credentials alongside existing settings |
| **State management** | Update STATE.md with last sync timestamp |
| **Git operations** | Commit notion-sync.json updates via existing commit helpers |

## Architectural Patterns

### Pattern 1: Parallel Tool Architecture

**What:** notion-sync.js lives alongside gsd-tools.js as a second standalone CLI utility, rather than embedding Notion logic into gsd-tools.js.

**When to use:** When integrating external service SDKs that introduce dependencies (@notionhq/client). Keeps core tool (gsd-tools.js) zero-dependency.

**Trade-offs:**
- **PRO:** Clean separation of concerns, easier to test, npm dependency isolation
- **PRO:** Can be versioned/updated independently
- **CON:** Two invocation patterns (workflows call both tools)

**Example:**
```javascript
// workflows/sync-notion.md invokes both tools

// Get config from gsd-tools
const config = execSync('node gsd-tools.js notion get-config --raw');

// Pass to notion-sync for upload
const result = execSync(`node notion-sync.js upload \
  --api-key ${config.api_key} \
  --database-id ${config.database_id} \
  --path .planning/${project}/v${version}`);
```

### Pattern 2: External URL Strategy for Images

**What:** Rather than uploading image files to Notion's servers, convert local image paths to external HTTPS URLs that Notion fetches on-demand.

**When to use:** For markdown files with local image references (e.g., `![](./images/diagram.png)`). Avoids file upload complexity and size limits.

**Trade-offs:**
- **PRO:** No file size limits, no upload API complexity, images never expire
- **PRO:** External URLs always returned as-is in Notion API (stable)
- **CON:** Requires hosting images somewhere accessible (GitHub raw URLs work)
- **CON:** Images break if external URL becomes unavailable

**Example:**
```javascript
// notion-sync.js image handler
function convertImagePath(mdImagePath, projectContext) {
  // Local path: ./images/architecture.png
  // → External URL: https://github.com/{user}/{repo}/raw/{branch}/.planning/{project}/v{N}/images/architecture.png

  const gitRemote = execSync('git config --get remote.origin.url').toString().trim();
  const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

  return `https://github.com/${user}/${repo}/raw/${branch}/${projectContext.path}/${mdImagePath}`;
}
```

### Pattern 3: Page ID Mapping with notion-sync.json

**What:** Track Notion page IDs in a per-project JSON file to support incremental updates (create new pages vs. update existing pages).

**When to use:** For sync operations where the same markdown file may be uploaded multiple times. Prevents duplicate pages in Notion.

**Trade-offs:**
- **PRO:** Enables incremental sync (only update changed files)
- **PRO:** Preserves Notion page URLs across re-syncs
- **CON:** notion-sync.json must be committed to git for team consistency
- **CON:** File can drift if pages are manually deleted in Notion

**Example:**
```json
// .planning/{project}/v{N}/notion-sync.json
{
  "database_id": "abc123...",
  "page_mapping": {
    "PROJECT.md": {
      "page_id": "def456...",
      "last_synced": "2026-02-11T14:30:00Z",
      "hash": "sha256:..."
    },
    "ROADMAP.md": {
      "page_id": "ghi789...",
      "last_synced": "2026-02-11T14:32:00Z",
      "hash": "sha256:..."
    },
    "phases/01-foundation/01-PLAN.md": {
      "page_id": "jkl012...",
      "last_synced": "2026-02-11T14:35:00Z",
      "hash": "sha256:...",
      "parent_id": "mno345..."
    }
  },
  "last_sync": "2026-02-11T14:35:00Z"
}
```

## Data Flow

### Upload Flow (sync-notion command)

```
User runs /gsd:sync-notion
    ↓
[Workflow: sync-notion.md]
    ↓
1. Load config via gsd-tools.js notion get-config
    ↓
2. Check API key exists → If not, error with setup instructions
    ↓
3. Resolve project path via PathResolver
    ↓
4. Read notion-sync.json (if exists) for incremental sync
    ↓
5. Glob .planning/{project}/v{N}/**/*.md files
    ↓
6. For each .md file:
    ├─ Calculate file hash (SHA-256)
    ├─ Compare to notion-sync.json hash
    ├─ Skip if unchanged
    └─ Queue for upload
    ↓
7. Invoke notion-sync.js upload with file list
    ↓
[notion-sync.js]
    ↓
8. Parse markdown with @tryfabric/martian
    ├─ markdownToBlocks() → Notion block array
    ├─ Handle images: convert local paths → external URLs
    └─ Handle tables, code blocks, checkboxes, headers
    ↓
9. Determine page hierarchy
    ├─ PROJECT.md → root page (database entry)
    ├─ ROADMAP.md → child of PROJECT
    ├─ phases/{N}/PLAN.md → child of ROADMAP
    └─ Map parent relationships from folder structure
    ↓
10. For each file:
    ├─ Check notion-sync.json for existing page_id
    ├─ If exists: UPDATE page via Notion Pages API
    └─ If new: CREATE page with parent relationship
    ↓
11. Update notion-sync.json with page IDs + hashes
    ↓
12. Commit notion-sync.json via gsd-tools.js commit
    ↓
13. Return success summary to workflow
    ↓
[Workflow displays]
    ↓
✓ Synced 12 files to Notion
  - Created: 3 new pages
  - Updated: 9 existing pages
  - Skipped: 2 unchanged

View in Notion: https://notion.so/{workspace}/{database_id}
```

### Comment Retrieval Flow (notion-comments command)

```
User runs /gsd:notion-comments
    ↓
[Workflow: notion-comments.md]
    ↓
1. Load config via gsd-tools.js notion get-config
    ↓
2. Read notion-sync.json for page IDs
    ↓
3. Invoke notion-sync.js get-comments
    ↓
[notion-sync.js]
    ↓
4. For each page_id in notion-sync.json:
    ├─ Call Notion Comments API (retrieve comments endpoint)
    ├─ Filter for open (unresolved) comments
    └─ Group by discussion_id
    ↓
5. Parse comment data
    ├─ Extract: discussion_id, comment text, author, timestamp
    ├─ Reverse-map page_id → original .md file
    └─ Group by phase/artifact
    ↓
6. Format as markdown
    ├─ Header: ## Comments from {filename}
    ├─ Thread: ### Discussion {N} (started by {author} on {date})
    ├─ Comments: - **{author}** ({timestamp}): {text}
    └─ Metadata: Page: {notion_url}
    ↓
7. Save to .planning/{project}/v{N}/triage/comments-{date}.md
    ↓
8. Return structured summary
    ↓
[Workflow displays]
    ↓
✓ Retrieved 8 comments from 3 pages

Saved to: .planning/{project}/v{N}/triage/comments-2026-02-11.md

Summary by phase:
  - Phase 01: 2 comments
  - Phase 02: 5 comments
  - ROADMAP: 1 comment

Next: Review and address feedback in triage file.
```

### Hierarchy Management Flow

```
.planning/{project}/v{N}/
├── PROJECT.md                    → Notion: Root page (database entry)
├── ROADMAP.md                    → Notion: Child of PROJECT
├── REQUIREMENTS.md               → Notion: Child of PROJECT
├── STATE.md                      → Notion: Child of PROJECT (optional)
└── phases/
    ├── 01-foundation/
    │   ├── 01-CONTEXT.md         → Notion: Child of ROADMAP, tagged "Phase 01"
    │   ├── 01-01-PLAN.md         → Notion: Child of 01-CONTEXT
    │   └── 01-01-SUMMARY.md      → Notion: Child of 01-01-PLAN
    └── 02-integration/
        ├── 02-CONTEXT.md         → Notion: Child of ROADMAP, tagged "Phase 02"
        └── 02-01-PLAN.md         → Notion: Child of 02-CONTEXT

Notion Hierarchy Mapping Strategy:
1. Create database for project (if doesn't exist)
2. Create root pages (PROJECT, ROADMAP, REQUIREMENTS) as database entries
3. Create phase CONTEXT pages as children of ROADMAP
4. Create PLAN pages as children of CONTEXT
5. Create SUMMARY pages as children of corresponding PLAN

Parent detection algorithm:
- phases/{N}-{name}/{phase}-CONTEXT.md → parent: ROADMAP page_id
- phases/{N}-{name}/{phase}-{plan}-PLAN.md → parent: CONTEXT page_id
- phases/{N}-{name}/{phase}-{plan}-SUMMARY.md → parent: PLAN page_id
- All others at root → parent: PROJECT page_id or database_id
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Notion API** | REST via @notionhq/client SDK | Rate limit: 3 req/sec per integration |
| **@tryfabric/martian** | Markdown → Notion blocks parser | Handles API limits via content redistribution |
| **GitHub (image hosting)** | External image URLs via raw.githubusercontent.com | Requires public repo or auth token in URL |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Workflow ↔ notion-sync.js** | Bash exec with --raw JSON output | Same pattern as gsd-tools.js invocation |
| **notion-sync.js ↔ gsd-tools.js** | Bash exec for config/state operations | Config read, state update, git commit |
| **Workflow ↔ PathResolver** | Via gsd-tools.js (no direct access) | Workflows use gsd-tools to resolve paths |
| **Notion SDK ↔ State Tracker** | notion-sync.json read/write | Persisted in version folder, git-committed |

## Notion CLI Tool Structure (notion-sync.js)

### Recommended File Organization

```javascript
#!/usr/bin/env node

/**
 * notion-sync.js — Notion API operations for GSD
 *
 * Commands:
 *   upload <path>           Upload .md files to Notion
 *     --api-key <key>
 *     --database-id <id>
 *     [--incremental]       Only sync changed files
 *
 *   get-comments <path>     Retrieve comments from Notion pages
 *     --api-key <key>
 *     [--since <date>]      Only comments after date
 *
 *   create-database         Initialize project database in Notion
 *     --api-key <key>
 *     --workspace-id <id>
 *     --name <name>
 *
 * Returns structured JSON when invoked with --raw flag.
 */

const { Client } = require('@notionhq/client');
const { markdownToBlocks } = require('@tryfabric/martian');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Configuration ────────────────────────────────────────────────────────

class NotionConfig {
  constructor(apiKey, databaseId) {
    this.client = new Client({ auth: apiKey });
    this.databaseId = databaseId;
  }
}

// ─── Markdown Parsing ─────────────────────────────────────────────────────

class MarkdownParser {
  static toBlocks(mdContent, context) {
    // Use Martian to convert markdown to Notion blocks
    const blocks = markdownToBlocks(mdContent);

    // Post-process: convert local image paths to external URLs
    return this.processImages(blocks, context);
  }

  static processImages(blocks, context) {
    // Recursively find image blocks and convert paths
    // context = { gitRemote, branch, projectPath }
    return blocks.map(block => {
      if (block.type === 'image' && block.image.type === 'external') {
        block.image.external.url = this.convertImagePath(
          block.image.external.url,
          context
        );
      }
      return block;
    });
  }

  static convertImagePath(localPath, context) {
    // Convert ./images/x.png → https://github.com/.../raw/.../x.png
    if (localPath.startsWith('http')) return localPath; // Already external

    const { gitRemote, branch, projectPath } = context;
    const repoUrl = gitRemote.replace('.git', '');
    return `${repoUrl}/raw/${branch}/${projectPath}/${localPath}`;
  }
}

// ─── Page Hierarchy Manager ───────────────────────────────────────────────

class PageHierarchyManager {
  constructor(notionClient, stateTracker) {
    this.client = notionClient;
    this.state = stateTracker;
  }

  async createOrUpdatePage(filePath, blocks, parentId) {
    const existingPageId = this.state.getPageId(filePath);

    if (existingPageId) {
      return await this.updatePage(existingPageId, blocks);
    } else {
      return await this.createPage(filePath, blocks, parentId);
    }
  }

  async createPage(filePath, blocks, parentId) {
    const title = this.extractTitle(filePath);

    const response = await this.client.pages.create({
      parent: parentId
        ? { page_id: parentId }
        : { database_id: this.state.databaseId },
      properties: {
        title: {
          title: [{ text: { content: title } }]
        }
      },
      children: blocks
    });

    return response.id;
  }

  async updatePage(pageId, blocks) {
    // First, delete existing blocks
    await this.clearPageBlocks(pageId);

    // Then append new blocks
    await this.client.blocks.children.append({
      block_id: pageId,
      children: blocks
    });

    return pageId;
  }

  async clearPageBlocks(pageId) {
    const { results } = await this.client.blocks.children.list({
      block_id: pageId
    });

    for (const block of results) {
      await this.client.blocks.delete({ block_id: block.id });
    }
  }

  extractTitle(filePath) {
    const basename = path.basename(filePath, '.md');
    return basename.replace(/-/g, ' ').replace(/^\d+\s*/, '');
  }

  determineParent(filePath, stateTracker) {
    // Map file paths to parent page IDs based on folder structure
    const parts = filePath.split('/');

    if (parts.includes('phases')) {
      const phaseDir = parts.find(p => /^\d+-/.test(p));
      const fileName = parts[parts.length - 1];

      if (fileName.includes('CONTEXT')) {
        // Phase context → child of ROADMAP
        return stateTracker.getPageId('ROADMAP.md');
      } else if (fileName.includes('PLAN')) {
        // Plan → child of CONTEXT
        const contextFile = `phases/${phaseDir}/${phaseDir.split('-')[0]}-CONTEXT.md`;
        return stateTracker.getPageId(contextFile);
      } else if (fileName.includes('SUMMARY')) {
        // Summary → child of corresponding PLAN
        const planFile = fileName.replace('SUMMARY', 'PLAN');
        return stateTracker.getPageId(`phases/${phaseDir}/${planFile}`);
      }
    }

    // Default: child of PROJECT or root database
    return stateTracker.getPageId('PROJECT.md') || null;
  }
}

// ─── State Tracker ────────────────────────────────────────────────────────

class StateTracker {
  constructor(projectPath) {
    this.stateFilePath = path.join(projectPath, 'notion-sync.json');
    this.state = this.load();
  }

  load() {
    if (fs.existsSync(this.stateFilePath)) {
      return JSON.parse(fs.readFileSync(this.stateFilePath, 'utf-8'));
    }

    return {
      database_id: null,
      page_mapping: {},
      last_sync: null
    };
  }

  save() {
    fs.writeFileSync(
      this.stateFilePath,
      JSON.stringify(this.state, null, 2),
      'utf-8'
    );
  }

  getPageId(relativePath) {
    return this.state.page_mapping[relativePath]?.page_id || null;
  }

  setPageId(relativePath, pageId, hash) {
    this.state.page_mapping[relativePath] = {
      page_id: pageId,
      last_synced: new Date().toISOString(),
      hash: hash
    };
  }

  hasChanged(relativePath, currentHash) {
    const tracked = this.state.page_mapping[relativePath];
    return !tracked || tracked.hash !== currentHash;
  }

  calculateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// ─── Comment Retriever ────────────────────────────────────────────────────

class CommentRetriever {
  constructor(notionClient, stateTracker) {
    this.client = notionClient;
    this.state = stateTracker;
  }

  async getAllComments() {
    const comments = [];

    for (const [filePath, data] of Object.entries(this.state.state.page_mapping)) {
      const pageComments = await this.getPageComments(data.page_id);
      comments.push({
        file: filePath,
        page_id: data.page_id,
        comments: pageComments
      });
    }

    return comments;
  }

  async getPageComments(pageId) {
    try {
      const response = await this.client.comments.list({
        block_id: pageId
      });

      // Group by discussion_id
      const grouped = {};
      for (const comment of response.results) {
        const discussionId = comment.discussion_id;
        if (!grouped[discussionId]) {
          grouped[discussionId] = [];
        }
        grouped[discussionId].push({
          id: comment.id,
          text: comment.rich_text.map(rt => rt.plain_text).join(''),
          author: comment.created_by.name || 'Unknown',
          timestamp: comment.created_time
        });
      }

      return Object.values(grouped);
    } catch (error) {
      // Page may not support comments
      return [];
    }
  }

  formatAsMarkdown(commentsData, outputPath) {
    let md = `# Notion Comments — ${new Date().toISOString().split('T')[0]}\n\n`;

    for (const { file, page_id, comments } of commentsData) {
      if (comments.length === 0) continue;

      md += `## ${file}\n\n`;
      md += `Page: https://notion.so/${page_id.replace(/-/g, '')}\n\n`;

      for (let i = 0; i < comments.length; i++) {
        const thread = comments[i];
        md += `### Discussion ${i + 1}\n\n`;

        for (const comment of thread) {
          md += `- **${comment.author}** (${comment.timestamp}):\n`;
          md += `  ${comment.text}\n\n`;
        }
      }

      md += '\n---\n\n';
    }

    fs.writeFileSync(outputPath, md, 'utf-8');
  }
}

// ─── CLI Commands ─────────────────────────────────────────────────────────

// Main command dispatcher (upload, get-comments, create-database)
// Parse args, invoke appropriate class methods, return JSON if --raw

// ... implementation follows similar pattern to gsd-tools.js
```

### Structure Rationale

- **Class-based organization:** Clean separation of concerns (parsing, page management, state tracking, comments)
- **Same invocation pattern as gsd-tools.js:** Bash exec with --raw JSON output for workflow integration
- **StateTracker as central coordination:** All page ID lookups go through state tracker for consistency
- **Incremental sync support:** Hash-based change detection prevents redundant API calls
- **Error isolation:** Each class can fail independently without breaking entire sync

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 projects, <100 pages | Current architecture sufficient — single database per workspace |
| 5-20 projects, 100-500 pages | Add database per project for cleaner organization |
| 20+ projects, 500+ pages | Batch API calls (3 req/sec limit), add retry logic, consider page archival strategy |

### Scaling Priorities

1. **First bottleneck:** Notion API rate limits (3 req/sec) — fix with request batching and exponential backoff retry
2. **Second bottleneck:** Large markdown files → Martian auto-chunks, but may hit 2000 char block limits — need custom splitter for very long documents

## Anti-Patterns

### Anti-Pattern 1: Embedding Notion Logic in gsd-tools.js

**What people do:** Add Notion operations directly to gsd-tools.js to avoid second CLI tool.

**Why it's wrong:** Breaks zero-dependency architecture of gsd-tools.js. @notionhq/client is 5MB+ with many transitive dependencies. Makes testing harder and increases attack surface.

**Do this instead:** Keep notion-sync.js as separate tool. Workflows can invoke both tools cleanly. Future: notion-sync.js could be extracted to separate npm package.

### Anti-Pattern 2: Uploading Image Files to Notion

**What people do:** Use Notion's file upload API to store images directly in Notion's infrastructure.

**Why it's wrong:** File upload API has size limits, requires multipart/form-data, and Notion URLs expire after 1 hour. External URLs never expire and are simpler.

**Do this instead:** Convert local image paths to GitHub raw URLs (or other HTTPS hosting). Images remain accessible indefinitely and require less code.

### Anti-Pattern 3: Syncing on Every File Change

**What people do:** Add git hooks to auto-sync .planning/ files to Notion after every commit.

**Why it's wrong:** Violates user intent (PM may not want work-in-progress in Notion). Notion API rate limits will cause failures. Creates noise for stakeholders.

**Do this instead:** Explicit sync command (`/gsd:sync-notion`) invoked by PM when ready. Post-milestone prompt offers sync but doesn't force it.

### Anti-Pattern 4: Storing Notion as Source of Truth

**What people do:** Allow editing in Notion and pulling changes back to .planning/ files.

**Why it's wrong:** Creates bidirectional sync complexity, merge conflicts, and divergence. Git history is source of truth for planning artifacts.

**Do this instead:** Notion is read-only for stakeholders (comment-only). Changes flow .planning/ → Notion only. Comments flow Notion → .planning/triage/ for PM triage.

## Build Order Recommendation

Based on dependencies and risk, suggested implementation sequence:

### Phase 1: Foundation (Low Risk)
1. **Add Notion config to installer** — bin/install.js prompts for API key, workspace ID
2. **Extend config.json schema** — Add `notion: { api_key, workspace_id, database_id }` section
3. **Add gsd-tools.js notion commands** — `notion get-config`, `notion set-config`
4. **Create notion-sync.json schema** — Document structure for page mapping

### Phase 2: Upload Pipeline (Medium Risk)
5. **Scaffold notion-sync.js** — Basic CLI structure, arg parsing, --raw output
6. **Implement MarkdownParser** — Integrate @tryfabric/martian, test with sample .md files
7. **Implement StateTracker** — JSON read/write, hash calculation, change detection
8. **Implement PageHierarchyManager** — Create/update pages, parent relationship logic
9. **Image path conversion** — GitHub URL strategy for local images
10. **Upload command** — End-to-end test: .md → Notion page

### Phase 3: Workflow Integration (Low Risk)
11. **Create sync-notion.md workflow** — Orchestrate upload with user prompts
12. **Create sync-notion.md command** — Entry point for `/gsd:sync-notion`
13. **Modify complete-milestone workflow** — Add "Upload to Notion?" prompt after tagging
14. **Manual testing** — Run full sync on existing GSD project

### Phase 4: Comment Retrieval (Medium Risk)
15. **Implement CommentRetriever** — Notion Comments API integration, discussion grouping
16. **Comment formatting** — Markdown output with threading
17. **Create notion-comments.md workflow** — Orchestrate comment retrieval + triage file creation
18. **Create notion-comments.md command** — Entry point for `/gsd:notion-comments`

### Phase 5: Polish (Low Risk)
19. **Error handling** — API failures, missing credentials, invalid page IDs
20. **Incremental sync optimization** — Hash-based skipping, batch API calls
21. **Documentation** — Update README, add Notion setup guide
22. **Integration testing** — Full workflow from install → sync → comments

**Critical path dependencies:**
- Phase 2 depends on Phase 1 (config must exist before upload works)
- Phase 4 depends on Phase 2 (comments require page IDs from previous syncs)
- Phase 3 can proceed in parallel with Phase 2 (mock notion-sync.js responses)

**Risk mitigation:**
- Test Martian parser early (Phase 2.6) — if inadequate, fall back to custom parser
- Verify Notion API rate limits don't break large syncs (Phase 2.10)
- Ensure GitHub raw URLs work for private repos (may need auth token in URL)

## Sources

- [Notion API - Working with Files and Media](https://developers.notion.com/docs/working-with-files-and-media)
- [Notion API - Working with Comments](https://developers.notion.com/docs/working-with-comments)
- [Notion API - Create a Page](https://developers.notion.com/reference/post-page)
- [@tryfabric/martian on GitHub](https://github.com/tryfabric/martian)
- [@tryfabric/martian on npm](https://www.npmjs.com/package/@tryfabric/martian)
- [Notion API - Uploading Small Files](https://developers.notion.com/docs/uploading-small-files)
- [Notion API - Importing External Files](https://developers.notion.com/docs/importing-external-files)
- [Notion API - Retrieve Comments](https://developers.notion.com/reference/retrieve-a-comment)

---
*Architecture research for: Notion CLI Integration*
*Researched: 2026-02-11*
