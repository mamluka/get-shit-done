# Stack Research

**Domain:** Notion API Integration for CLI Planning Tool
**Researched:** 2026-02-11
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @notionhq/client | ^5.9.0 | Official Notion API SDK | Zero dependencies, official support, built-in file upload API, maintains parity with Notion's API versions (currently 2025-09-03). Active maintenance with recent updates (v5.7.0 added move page API, v5.9.0 latest as of 10 days ago). |
| @tryfabric/martian | ^1.2.4 | Markdown to Notion blocks conversion | Purpose-built for converting Markdown AST to Notion API blocks and RichText. Supports all inline elements (bold, italic, strikethrough, code, links, equations), headers, lists (ordered, unordered, checkboxes) to any depth, and GFM alerts. Auto-handles Notion's 100-block limit per request by redistributing content. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | N/A | Built-in Node.js capabilities sufficient | Node.js 16.7+ provides fs.readFile for file handling, native RegExp for markdown image parsing. Node.js 18+ provides native FormData for file uploads (already exceeds minimum v16.7.0). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Node.js built-in testing | Unit tests for markdown parsing logic | Existing `npm test` script uses Node.js built-in test runner (node --test) - continue this pattern for consistency |

## Installation

```bash
# Core dependencies (only two additions to existing zero-dep codebase)
npm install @notionhq/client @tryfabric/martian

# No dev dependencies needed - existing esbuild remains sufficient
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @tryfabric/martian | Build custom parser with regex | Only if you need to support <5 markdown features (headers, paragraphs, bold only). Custom parser saves ~5 transitive deps (unified, remark-parse, remark-gfm, remark-math) but loses GFM support, list nesting, equations, and auto-chunking for Notion's block limits. NOT worth the complexity for full markdown support. |
| @notionhq/client file upload API | External image hosting service | If you already have a CDN/image service. File Upload API is simpler: 1) create upload, 2) send file, 3) attach to block. External URLs require permanent hosting and don't integrate with Notion's 1-hour attachment workflow. |
| Native Node.js RegExp | markdown-it or marked parser | Only if you need to transform markdown to HTML or other formats. For just extracting image references from markdown, regex pattern `/!\[(.*?)\]\((.*?)\)/g` is sufficient and adds zero dependencies. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @notionhq/client v4.x or earlier | Version 5.0+ required for API version 2025-09-03 with data sources support. V5.7+ adds move page API and template-powered page creation. | @notionhq/client ^5.9.0 (latest) |
| form-data npm package | Node.js 18+ has native FormData support built-in. Current env is Node 16.20.2 which meets minimum (16.7.0) but native FormData only in 18+. | Use @notionhq/client's built-in file upload methods (fileUploads.create) which handle FormData internally - no need to construct manually |
| notion-to-md or reverse parsers | These convert Notion blocks TO markdown (opposite direction). You need markdown TO Notion. | @tryfabric/martian (correct direction) |
| marked, markdown-it, showdown | General-purpose markdown to HTML parsers. Don't output Notion block objects. | @tryfabric/martian (Notion-specific output) |
| Heavy unified ecosystem directly | While @tryfabric/martian uses unified internally, importing unified/remark-parse/remark-gfm directly adds same transitive deps but requires writing custom AST-to-Notion converter (200+ lines). | @tryfabric/martian (does conversion for you) |

## Stack Patterns by Variant

**For uploading planning docs with images to Notion:**
1. Parse markdown with @tryfabric/martian to get Notion blocks
2. Scan markdown for images with regex: `/!\[(.*?)\]\((.*?)\)/g`
3. For each local image reference:
   - Read file with fs.readFile
   - Upload with notion.fileUploads.create({ mode: "single_part", filename, content_type })
   - Replace markdown image path with Notion file ID in blocks
4. Create page with notion.pages.create({ parent, properties, children: blocks })
5. Images auto-attach during page creation (within 1-hour expiry window)

**For syncing/updating existing pages:**
- Use notion.blocks.children.append() to add content to existing pages
- Respect 100-block limit per request (martian handles this)
- Total page limit: 1,000 blocks

**For pulling comments:**
- Use notion.comments.list({ block_id: pageId }) (pages are blocks)
- Requires integration to have "read comment" capabilities
- Returns flat list sorted by discussion_id for threading
- Paginated (max 100 per request)

**If Node.js version < 18:**
- Current project is Node 16.20.2 (meets minimum 16.7.0)
- No issue: @notionhq/client handles file uploads internally
- Upgrade to Node 18+ only if you need native FormData for other purposes

**If markdown conversion fails:**
- @tryfabric/martian truncates content that exceeds Notion limits
- For edge cases (deeply nested structures >2 levels), manually flatten or split into separate pages
- Notion blocks can only nest 2 levels deep

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @notionhq/client@^5.9.0 | Node.js >= 18 (recommended), >= 16.7.0 (minimum) | Current env: Node 16.20.2 meets minimum. TypeScript 5.9+ required only if using TypeScript (project uses plain JS). |
| @tryfabric/martian@^1.2.4 | @notionhq/client ^1.0.4+ | Martian's package.json specifies @notionhq/client ^1.0.4, but outputs are compatible with v5.x API (block structure unchanged). Last updated 3+ years ago but Notion block API stable. |
| @tryfabric/martian@^1.2.4 | Node.js >= 16 | Uses unified ecosystem (remark-parse ^9.0.0, unified ^9.2.1) which supports Node 16+. |

## Integration with Existing Codebase

**Minimal impact on zero-dep architecture:**
- Adding only 2 direct dependencies (@notionhq/client, @tryfabric/martian)
- @notionhq/client has 0 dependencies itself
- @tryfabric/martian brings ~5 transitive deps (unified ecosystem) - acceptable tradeoff for avoiding custom parser complexity
- Total final dep count: ~7 (from 0) - still lightweight

**Integration points with gsd-tools.js:**
- PathResolver: Use for locating .planning/ markdown files and relative image paths
- config.json system: Add Notion API token storage (notion.apiToken, notion.pageId, etc.)
- Agent spawning: Potential new agent for Notion sync operations
- CLI commands: New /gsd:notion-upload, /gsd:notion-sync, /gsd:notion-comments commands

**File handling pattern:**
```javascript
const fs = require('fs').promises;
const { Client } = require('@notionhq/client');
const { markdownToBlocks } = require('@tryfabric/martian');

// Pattern: Read markdown -> Convert -> Upload images -> Create page
async function uploadToNotion(markdownPath, notionApiToken, parentPageId) {
  const markdown = await fs.readFile(markdownPath, 'utf-8');
  const blocks = markdownToBlocks(markdown);

  // Extract and upload images
  const imageRefs = [...markdown.matchAll(/!\[(.*?)\]\((.*?)\)/g)];
  for (const [fullMatch, alt, path] of imageRefs) {
    if (!path.startsWith('http')) { // Local file
      const fileBuffer = await fs.readFile(path);
      const notion = new Client({ auth: notionApiToken });
      const upload = await notion.fileUploads.create({
        mode: "single_part",
        filename: path.split('/').pop(),
        content_type: "image/png" // Detect from extension
      });
      // Replace block references with uploaded file ID
    }
  }

  await notion.pages.create({
    parent: { page_id: parentPageId },
    properties: { title: { title: [{ text: { content: "Title" } }] } },
    children: blocks
  });
}
```

## Sources

- [@notionhq/client - npm](https://www.npmjs.com/package/@notionhq/client) — Latest version 5.9.0, Node.js compatibility (HIGH confidence)
- [GitHub - makenotion/notion-sdk-js](https://github.com/makenotion/notion-sdk-js) — Official SDK repository (HIGH confidence)
- [Notion Developers - Upgrading to Version 2025-09-03](https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03) — API version compatibility (HIGH confidence)
- [@tryfabric/martian GitHub](https://github.com/tryfabric/martian) — Markdown to Notion conversion library (HIGH confidence)
- [@tryfabric/martian package.json](https://github.com/tryfabric/martian/blob/master/package.json) — Dependencies and compatibility (HIGH confidence)
- [Notion Developers - Working with Files and Media](https://developers.notion.com/docs/working-with-files-and-media) — File upload API documentation (HIGH confidence)
- [Notion Developers - Uploading Small Files](https://developers.notion.com/docs/uploading-small-files) — File upload workflow (HIGH confidence)
- [Notion Developers - Working with Comments](https://developers.notion.com/docs/working-with-comments) — Comments API documentation (HIGH confidence)
- [Notion Developers - Retrieve Comments](https://developers.notion.com/reference/retrieve-a-comment) — Comment retrieval endpoint (HIGH confidence)
- [Node.js FormData support discussion](https://github.com/pocketbase/pocketbase/discussions/1201) — Native FormData in Node 18+ (MEDIUM confidence)
- [Markdown Image Regex](https://gist.github.com/DavidWells/ca823fcbdc25599ee3efc62906068599) — Image reference extraction patterns (MEDIUM confidence)

---
*Stack research for: Notion API Integration (Milestone: Notion Integration Features)*
*Researched: 2026-02-11*
