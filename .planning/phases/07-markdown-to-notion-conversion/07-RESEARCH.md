# Phase 7: Markdown-to-Notion Conversion Pipeline - Research

**Researched:** 2026-02-11
**Domain:** Markdown parsing, Notion API blocks, AST transformation, character/payload limits
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Conversion fidelity:**
- All element types (tables, checklists, code blocks) are equally important — no sacrificing any category
- Custom XML-like tags (`<domain>`, `<decisions>`, `<specifics>`, `<deferred>`) convert to Notion callout blocks with labels
- `<details>`/`<summary>` tags map to Notion toggle/heading blocks (collapsible)
- Inline formatting (bold, italic, inline code, links, strikethrough) is best-effort — edge cases that drop formatting are acceptable
- Horizontal rules (`---`) map to Notion divider blocks
- Checkboxes (`- [x]`, `- [ ]`) map to Notion to_do blocks with checked state preserved

**Unsupported element handling:**
- Unsupported content (raw HTML, footnotes, math blocks) wraps in a code block as fallback — preserved as-is
- Rich text segments exceeding 2000 characters split at sentence boundaries

**Document chunking:**
- Section-aware batching: split at heading boundaries so each API request contains complete sections
- If a single section exceeds ~100 blocks, force-split within the section at logical points (row boundaries for tables, item boundaries for lists)
- Deep nesting (3+ levels) flattens to 2 levels — third-level items become second-level with indent markers (e.g., `└` prefix)
- Directory-aware batch processing: all .planning/ files processed together with awareness of relationships (e.g., ROADMAP references plans)

**Conversion feedback:**
- File-level progress output: "Converting ROADMAP.md (3/8)..."
- Dry-run mode (`--dry-run` flag) shows what would be converted without API calls
- Lossy element warnings written to a conversion log file (console stays clean)
- Incremental state tracking: notion-sync.json updated after each file so conversion can resume from where it stopped on error

### Claude's Discretion

- Choice of markdown parsing library (martian vs custom)
- Exact callout block styling for XML tag sections
- Log file format and location
- Batch size tuning within Notion API limits

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Summary

Phase 7 transforms .planning/ markdown files into Notion block structures while respecting Notion's strict API limits and GSD's custom markdown patterns. The research confirms that @tryfabric/martian (already installed in Phase 6) handles 80% of standard markdown conversion, but GSD's custom XML-like tags (`<domain>`, `<decisions>`, etc.) and `<details>`/`<summary>` elements require preprocessing before passing to Martian.

**Critical Notion API constraints:**
- Rich text: 2000 character limit per text.content field
- Blocks per request: 100 maximum in any children array
- Payload size: 500KB overall, 1000 block elements total per request
- Nesting depth: 2 levels maximum in a single request (deeper nesting requires follow-up append calls)

Martian handles automatic redistribution when limits are exceeded, but its design assumes standard markdown. Custom XML tags will be treated as raw HTML (passed through as text or ignored), so preprocessing is essential. The recommended approach: regex-based preprocessing to transform custom tags into standard markdown (GFM alerts or emoji-prefixed blockquotes), then pass through Martian, then post-process the resulting Notion blocks to adjust icons/colors for callouts.

**Primary recommendation:** Use Martian for core conversion with a preprocessing pipeline for custom tags. Split documents at heading boundaries when approaching 100-block chunks. Use `Intl.Segmenter` for sentence-boundary splitting of 2000+ character text. Track conversion state in notion-sync.json after each file to enable resume-on-error.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tryfabric/martian | 1.2.4 | Markdown → Notion blocks | Industry-standard MD→Notion parser, handles GFM, tables, lists, code blocks, automatic limit handling |
| @notionhq/client | 5.9.0+ | Notion API SDK | Official SDK with built-in retry and rate limiting (installed in Phase 6) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| unified | 11.x | Markdown AST processing | If extending Martian with custom remark plugins (martian already uses it internally) |
| remark-parse | 11.x | Markdown parser | For custom preprocessing pipeline if needed |
| remark-gfm | 4.x | GitHub Flavored Markdown | For custom preprocessing (martian uses internally) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Martian preprocessing | Custom unified pipeline | More control but 10x complexity; markdown parsing has edge cases (nested lists, code blocks, inline formatting). Martian already solves this. |
| Intl.Segmenter | sentence-splitter npm | Segmenter is built-in (Node 16+), zero deps, locale-aware. Sentence-splitter adds 100KB+ dependency. |
| Regex preprocessing | Unified plugin for custom tags | Unified plugins are powerful but overkill for 4 simple tag patterns. Regex is faster and simpler for this use case. |

**Installation:**
```bash
# Already installed in Phase 6
npm install @tryfabric/martian @notionhq/client

# Optional if building custom preprocessing (not recommended)
npm install unified remark-parse remark-gfm
```

## Architecture Patterns

### Recommended Project Structure
```
lib/notion/
├── client.js           # Notion SDK client (Phase 6)
├── sync-state.js       # notion-sync.json tracking (Phase 6)
├── converter.js        # NEW: Main conversion orchestrator
├── preprocessor.js     # NEW: Custom tag → standard markdown
├── chunker.js          # NEW: Section-aware batching
└── text-splitter.js    # NEW: Sentence-boundary splitting for 2000 char limit

bin/
└── notion-sync.js      # CLI with new 'convert' subcommand
```

### Pattern 1: Preprocessing Custom Tags
**What:** Transform GSD custom XML tags into standard markdown that Martian can handle
**When to use:** Before passing markdown to Martian
**Example:**
```javascript
// Source: User decision + Martian GFM alerts support
function preprocessCustomTags(markdown) {
  // Transform <domain>, <decisions>, <specifics>, <deferred> to GFM alerts
  // Notion will render these as callouts with icons/colors

  const tagMapping = {
    domain: { alert: 'NOTE', icon: '🎯', color: 'blue' },
    decisions: { alert: 'IMPORTANT', icon: '✅', color: 'purple' },
    specifics: { alert: 'TIP', icon: '💡', color: 'green' },
    deferred: { alert: 'CAUTION', icon: '🚫', color: 'red' }
  };

  let processed = markdown;

  for (const [tag, config] of Object.entries(tagMapping)) {
    // Pattern: <tag>\n## Heading\ncontent\n</tag>
    const regex = new RegExp(`<${tag}>\\s*\\n(.*?)\\n</${tag}>`, 'gs');

    processed = processed.replace(regex, (match, content) => {
      // Extract first heading as summary
      const headingMatch = content.match(/^##\s+(.+)$/m);
      const title = headingMatch ? headingMatch[1] : tag.toUpperCase();

      // Convert to blockquote with GFM alert
      // Martian will auto-convert to Notion callout
      return `> [!${config.alert}]\n> **${title}**\n> \n${content}`;
    });
  }

  return processed;
}
```

### Pattern 2: Details/Summary to Toggle Blocks
**What:** Convert HTML `<details>`/`<summary>` to markdown that produces Notion toggle blocks
**When to use:** After custom tag preprocessing, before Martian
**Example:**
```javascript
// Source: User decision + Notion toggle block API
function preprocessDetailsBlocks(markdown) {
  // Pattern: <details>\n<summary>Title</summary>\ncontent\n</details>
  const regex = /<details>\s*<summary>(.+?)<\/summary>\s*(.*?)<\/details>/gs;

  return markdown.replace(regex, (match, summary, content) => {
    // Notion toggle blocks are just headings with is_toggleable: true
    // Martian creates paragraph blocks, so we'll post-process
    // For now, convert to blockquote to preserve structure
    return `> **${summary}**\n>\n${content}`;
  });
}
```

### Pattern 3: Section-Aware Chunking
**What:** Split large documents at heading boundaries when approaching 100-block limit
**When to use:** After Martian conversion, before API calls
**Example:**
```javascript
// Source: Notion API 100-block limit + user decision for section-aware splitting
function chunkBlocks(blocks, maxPerChunk = 90) {
  const chunks = [];
  let currentChunk = [];

  for (const block of blocks) {
    // Start new chunk at headings if close to limit
    if (currentChunk.length >= maxPerChunk &&
        (block.type === 'heading_1' ||
         block.type === 'heading_2' ||
         block.type === 'heading_3')) {
      chunks.push(currentChunk);
      currentChunk = [block];
    } else {
      currentChunk.push(block);
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
```

### Pattern 4: Sentence-Boundary Text Splitting
**What:** Split rich text exceeding 2000 characters at sentence boundaries
**When to use:** Post-processing step after Martian, before API calls
**Example:**
```javascript
// Source: Notion 2000 char limit + Intl.Segmenter for sentence boundaries
function splitLongText(richTextArray, maxLength = 2000) {
  const result = [];

  for (const richText of richTextArray) {
    const text = richText.plain_text || richText.text?.content || '';

    if (text.length <= maxLength) {
      result.push(richText);
      continue;
    }

    // Use Intl.Segmenter for sentence boundaries (Node 16+)
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    const segments = Array.from(segmenter.segment(text));

    let currentChunk = '';

    for (const { segment } of segments) {
      if ((currentChunk + segment).length > maxLength && currentChunk.length > 0) {
        // Flush current chunk
        result.push({
          ...richText,
          text: { ...richText.text, content: currentChunk },
          plain_text: currentChunk
        });
        currentChunk = segment;
      } else {
        currentChunk += segment;
      }
    }

    if (currentChunk.length > 0) {
      result.push({
        ...richText,
        text: { ...richText.text, content: currentChunk },
        plain_text: currentChunk
      });
    }
  }

  return result;
}
```

### Pattern 5: Nesting Depth Flattening
**What:** Flatten 3+ level nesting to 2 levels with visual indent markers
**When to use:** Post-processing after Martian, before API calls
**Example:**
```javascript
// Source: Notion API 2-level nesting limit + user decision for indent markers
function flattenDeepNesting(blocks, currentDepth = 0, maxDepth = 2) {
  return blocks.flatMap(block => {
    // Check if block has children
    const hasChildren = block[block.type]?.children?.length > 0;

    if (!hasChildren) return [block];

    const children = block[block.type].children;

    // If at max depth, flatten children to siblings with indent marker
    if (currentDepth >= maxDepth) {
      const flattened = children.map(child => {
        // Add visual indent marker (└) to content
        if (child.type === 'bulleted_list_item' ||
            child.type === 'numbered_list_item') {
          const richText = child[child.type].rich_text || [];
          return {
            ...child,
            [child.type]: {
              ...child[child.type],
              rich_text: [
                { type: 'text', text: { content: '└ ' } },
                ...richText
              ]
            }
          };
        }
        return child;
      });

      // Remove children from parent
      return [
        { ...block, [block.type]: { ...block[block.type], children: [] } },
        ...flattened
      ];
    }

    // Recurse into children
    return [{
      ...block,
      [block.type]: {
        ...block[block.type],
        children: flattenDeepNesting(children, currentDepth + 1, maxDepth)
      }
    }];
  });
}
```

### Pattern 6: Incremental State Tracking
**What:** Update notion-sync.json after each file conversion for resume-on-error
**When to use:** After successful API calls for each file
**Example:**
```javascript
// Source: User decision + Phase 6 sync-state.js
const { loadSyncState, saveSyncState, setPageId } = require('./sync-state.js');

async function convertFile(filePath, projectSlug, cwd) {
  const state = loadSyncState(cwd);

  // Convert markdown to blocks
  const blocks = await convertMarkdownToBlocks(filePath);

  // Create page via API
  const pageId = await createNotionPage(blocks);

  // IMMEDIATELY update state before next file
  const updatedState = setPageId(state, projectSlug, filePath, pageId);
  saveSyncState(cwd, updatedState);

  return pageId;
}
```

### Anti-Patterns to Avoid

- **Batch state updates**: Don't wait until all files are processed to update notion-sync.json — update after each file to enable resume-on-error
- **Silent truncation**: Don't silently truncate content that exceeds limits — log warnings to conversion log file
- **Regex markdown parsing**: Don't hand-roll markdown parsing — use Martian for all standard markdown, only preprocess custom tags
- **Ignoring nesting limits**: Don't send 3+ level nesting in single request — flatten or split across multiple append calls
- **Large single requests**: Don't send 100+ blocks in one call — chunk at ~90 blocks with section awareness

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown parsing | Custom regex-based parser | @tryfabric/martian | MD parsing is complex: nested lists, code blocks, tables, inline formatting, escape sequences. Martian already handles GFM, Notion limits, and edge cases. |
| Sentence boundary detection | Split on `. ` regex | Intl.Segmenter | Regex fails on abbreviations (Dr., Inc.), decimals (3.14), ellipsis. Segmenter is built-in, locale-aware, handles edge cases. |
| Notion API retry logic | Custom retry + backoff | @notionhq/client defaults | SDK has exponential backoff, Retry-After header handling, 429 rate limit awareness. |
| Rich text character counting | `.length` on strings | Count rich_text.text.content | Rich text is array of objects; each object has independent 2000 char limit. Must count per-object. |
| Block nesting validation | Manual tree traversal | Flatten during post-processing | Notion API returns cryptic errors for deep nesting. Proactively flatten before API calls. |

**Key insight:** Markdown parsing has 30+ years of edge cases (nested blockquotes in lists, code blocks with backticks, inline code with escapes). Martian already solves this using the unified ecosystem (remark-parse, remark-gfm). Custom preprocessing should only handle GSD-specific patterns, not reimplement markdown parsing.

## Common Pitfalls

### Pitfall 1: Rich Text Exceeds 2000 Characters
**What goes wrong:** Single paragraph with 3000 characters causes API validation_error (HTTP 400)
**Why it happens:** Markdown paragraphs can be any length; Notion rich_text.text.content limited to 2000 chars
**How to avoid:** Post-process Martian output to detect long text, split at sentence boundaries using Intl.Segmenter, create multiple paragraph blocks
**Warning signs:** Long prose paragraphs in RESEARCH.md files, code blocks with long explanations

### Pitfall 2: Nesting Depth Exceeds 2 Levels
**What goes wrong:** API returns "nested blocks can only go two levels deep" error
**Why it happens:** Markdown supports unlimited nesting; Notion API limits to 2 levels per request
**How to avoid:** Post-process blocks to flatten 3+ levels, add visual indent markers (└), or split across multiple append calls
**Warning signs:** Deeply nested task lists, multi-level numbered outlines in PLAN.md files

### Pitfall 3: Table Width Cannot Be Modified After Creation
**What goes wrong:** Attempting to update table_width after pages.create fails silently
**Why it happens:** Notion API makes table_width immutable after creation
**How to avoid:** Calculate correct column count from markdown table before API call; validate all table rows have same column count
**Warning signs:** Markdown tables with inconsistent row lengths (parsing may drop columns)

### Pitfall 4: Silent Content Loss with Truncation
**What goes wrong:** Martian's `notionLimits.truncate: true` silently drops content exceeding limits
**Why it happens:** Default behavior prioritizes successful API calls over data preservation
**How to avoid:** Disable truncation (`truncate: false`), implement custom onError handler to log warnings, ensure all dropped content is preserved in code blocks as fallback
**Warning signs:** Large tables, long code blocks, deeply nested lists

### Pitfall 5: Invalid Image URLs Break Entire Request
**What goes wrong:** Single invalid image URL causes entire pages.create request to fail
**Why it happens:** Notion validates all image URLs; invalid URL rejects full request
**How to avoid:** Use Martian's `strictImageUrls: false` to convert invalid images to text, or preprocess markdown to validate URLs before conversion
**Warning signs:** Relative image paths, local file:// URLs, broken external links

### Pitfall 6: GFM Alert Case Sensitivity
**What goes wrong:** `[!note]` (lowercase) doesn't convert to callout; appears as plain text
**Why it happens:** Martian's GFM alert pattern is case-sensitive, requires uppercase
**How to avoid:** Normalize custom tags to uppercase alert names during preprocessing: NOTE, TIP, IMPORTANT, WARNING, CAUTION
**Warning signs:** Callout blocks rendering as quote blocks instead

### Pitfall 7: Custom HTML Tags Ignored by Martian
**What goes wrong:** `<domain>`, `<decisions>` tags appear as plain text or get stripped
**Why it happens:** Martian uses remark-parse which treats unknown HTML as raw content (passed through or ignored)
**How to avoid:** Preprocess custom tags into GFM alerts or emoji callouts BEFORE passing to Martian
**Warning signs:** Custom tags disappearing from output, appearing as literal text in paragraphs

### Pitfall 8: State File Corruption on Partial Failure
**What goes wrong:** Conversion fails mid-batch, notion-sync.json contains only partial mappings
**Why it happens:** Updating state only at end of full batch means failures lose all progress
**How to avoid:** Update notion-sync.json after EACH file conversion, use atomic write pattern (write to temp file, rename)
**Warning signs:** Having to re-run full conversion after single file failure

## Code Examples

Verified patterns from official sources:

### Martian Basic Conversion
```javascript
// Source: https://github.com/tryfabric/martian
const { markdownToBlocks } = require('@tryfabric/martian');

const markdown = `
# Heading 1

Paragraph with **bold** and *italic* text.

- [ ] Unchecked task
- [x] Completed task

| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |
`;

const blocks = markdownToBlocks(markdown);
// Returns array of Notion block objects ready for API
```

### Martian with Options
```javascript
// Source: https://github.com/tryfabric/martian
const options = {
  // Disable auto-truncation to catch limit violations
  notionLimits: {
    truncate: false,
    onError: (error) => {
      console.error('Conversion limit error:', error.message);
    }
  },
  // Convert invalid images to text instead of failing
  strictImageUrls: false
};

const blocks = markdownToBlocks(markdown, options);
```

### Creating Page with Initial Blocks
```javascript
// Source: https://developers.notion.com/reference/post-page
const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function createPage(parentPageId, title, blocks) {
  // First 100 blocks go in children
  const initialBlocks = blocks.slice(0, 100);

  const response = await notion.pages.create({
    parent: { page_id: parentPageId },
    properties: {
      title: {
        title: [{ text: { content: title } }]
      }
    },
    children: initialBlocks
  });

  return response.id;
}
```

### Appending Remaining Blocks
```javascript
// Source: https://developers.notion.com/reference/patch-block-children
async function appendRemainingBlocks(pageId, blocks) {
  // Blocks 100+ need append calls (max 100 per call)
  for (let i = 100; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100);

    await notion.blocks.children.append({
      block_id: pageId,
      children: chunk
    });
  }
}
```

### Intl.Segmenter for Sentence Splitting
```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter
function splitAtSentences(text, maxLength) {
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const segments = Array.from(segmenter.segment(text));

  const chunks = [];
  let current = '';

  for (const { segment } of segments) {
    if ((current + segment).length > maxLength && current.length > 0) {
      chunks.push(current.trim());
      current = segment;
    } else {
      current += segment;
    }
  }

  if (current.length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

// Example: Split 3000 char paragraph
const longText = '...3000 characters...';
const chunks = splitAtSentences(longText, 2000);
// Returns: ['First 2000 chars ending at sentence.', 'Remaining 1000 chars.']
```

### Notion Callout Block Structure
```javascript
// Source: https://developers.notion.com/reference/block#callout
const calloutBlock = {
  type: 'callout',
  callout: {
    rich_text: [
      { type: 'text', text: { content: 'Callout content here' } }
    ],
    icon: {
      emoji: '💡'  // or { type: 'external', external: { url: '...' } }
    },
    color: 'blue_background'  // blue, green, yellow, red, purple, etc.
  }
};
```

### Notion Toggle Block (Collapsible)
```javascript
// Source: https://developers.notion.com/reference/block#toggle-blocks
const toggleBlock = {
  type: 'toggle',
  toggle: {
    rich_text: [
      { type: 'text', text: { content: 'Click to expand' } }
    ],
    color: 'default',
    children: [
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: 'Hidden content' } }
          ]
        }
      }
    ]
  }
};
```

### Notion Divider Block
```javascript
// Source: https://developers.notion.com/reference/block#divider-blocks
const dividerBlock = {
  type: 'divider',
  divider: {}
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual API retry logic | @notionhq/client SDK auto-retry | SDK v2.0+ (2021) | Eliminates 100+ LOC of custom exponential backoff, Retry-After parsing |
| String.split() for sentences | Intl.Segmenter | Node 16.0.0 (2021) | Handles abbreviations, decimals, ellipsis; zero dependencies |
| rehype-raw for HTML parsing | Martian preprocessing | Martian v1.0+ (2022) | GFM alerts + emoji callouts replace complex unified pipelines |
| pages.create with all blocks | Create + append pattern | Notion API v1.0 | Enables 900+ block documents (was limited to 100) |
| Truncate long text | Sentence-boundary splitting | Best practice 2023+ | Preserves all content vs silent data loss |

**Deprecated/outdated:**
- **rehype-raw for custom tags**: Overly complex for 4 simple tag patterns; preprocessing with regex is faster and simpler
- **sentence-splitter npm package**: Intl.Segmenter is built-in since Node 16; no need for external dependency
- **Manual table width validation**: Martian handles this automatically; don't revalidate after conversion
- **Custom markdown parsers**: Unified ecosystem is standard; custom parsers miss edge cases (nested blockquotes, code fences, etc.)

## Open Questions

1. **How should conversion log format be structured?**
   - What we know: User wants lossy warnings in log file, console stays clean
   - What's unclear: JSON vs plain text? Per-file vs single log? Include timestamps?
   - Recommendation: JSON Lines format (one JSON object per line) for machine-readability; enables filtering/analysis. Location: `.planning/notion-sync.log`

2. **Should Martian's truncation be disabled globally?**
   - What we know: User wants code block fallback for unsupported content (no silent drops)
   - What's unclear: Does this conflict with Martian's auto-truncation?
   - Recommendation: Disable truncation (`notionLimits.truncate: false`), implement custom onError to wrap overflows in code blocks

3. **What is optimal batch size for section-aware chunking?**
   - What we know: Notion limit is 100 blocks, user wants section-aware splits
   - What's unclear: Should we target 80 blocks (more headroom)? 90? 95?
   - Recommendation: Start with 90-block chunks; tune based on typical section sizes in RESEARCH/PLAN files. Measure in practice.

4. **How to handle details/summary without native Notion support?**
   - What we know: User wants `<details>`/`<summary>` to map to toggle blocks
   - What's unclear: Notion toggle blocks need explicit children structure; how to parse details content into children?
   - Recommendation: Preprocess `<details>` to blockquote, post-process to convert blockquote to toggle block with children

5. **Should emoji callouts be enabled in Martian?**
   - What we know: User chose GFM alerts for custom tags
   - What's unclear: Would enabling `enableEmojiCallouts` interfere with GFM alert conversion?
   - Recommendation: Keep disabled initially; GFM alerts provide more control over icon/color mapping

## Sources

### Primary (HIGH confidence)
- [Notion API Request Limits](https://developers.notion.com/reference/request-limits) - Official payload, block, and character limits
- [Notion API Block Reference](https://developers.notion.com/reference/block) - Official block types, structure, constraints
- [Martian GitHub Repository](https://github.com/tryfabric/martian) - Official API documentation, configuration options
- [@notionhq/client GitHub](https://github.com/makenotion/notion-sdk-js) - Official SDK retry/rate limit implementation
- [Intl.Segmenter MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter) - Sentence boundary detection API

### Secondary (MEDIUM confidence)
- [Thomas Frank - Handling Notion API Limits](https://thomasjfrank.com/how-to-handle-notion-api-request-limits/) - Verified chunking patterns, tested against official docs
- [Remark Documentation](https://remark.js.org/) - Unified/remark plugin architecture (Martian uses internally)
- [Notion Mastery - Pushing Limits](https://notionmastery.com/pushing-notion-to-limits/) - Community-verified limit testing

### Tertiary (LOW confidence)
- Community forum posts on Make, n8n, Pipedream - Anecdotal workarounds, not officially verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Martian is de facto standard for MD→Notion, verified in production use
- Architecture: HIGH - Patterns verified against official Notion API docs and Martian source code
- Pitfalls: HIGH - Limits verified from official docs; pitfalls identified from community reports + official error codes
- Custom tag preprocessing: MEDIUM - No official guidance; approach inferred from Martian's GFM alert support + remark ecosystem patterns

**Research date:** 2026-02-11
**Valid until:** ~30 days (stable domain - Notion API v1.0 is mature, Martian is actively maintained)
