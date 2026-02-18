# Stack Research: v1.2 Streamlined Workflow

**Domain:** CLI workflow improvements for Node.js meta-prompting framework
**Researched:** 2026-02-12
**Confidence:** HIGH

## Scope: Additions Only

v1.2 builds on validated stack from v1.0/v1.1. This document covers ONLY new stack needs for v1.2 features. Existing capabilities (Node.js, readline, @notionhq/client, gsd-tools.js, config.json) are NOT re-researched.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js built-in `readline` | N/A (built-in) | Yes/no prompts, "Apply recommended?" UX | Already used in install.js for Notion API key prompts. Zero dependencies, callback-based API proven in production. Pattern: `rl.question()` with regex validation (`/^y(es)?$/i`). |
| Node.js built-in `URL` | N/A (built-in) | Parse Notion page URLs to extract page IDs | Modern WHATWG URL API (Node.js v10+). No dependencies. Provides `pathname` and `searchParams` for safe parsing without regex fragility. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | — | — | All v1.2 features use built-in Node.js modules |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Node.js built-in test runner | Unit tests for URL parsing | Already used for Notion module TDD (v1.1). No jest/mocha needed. |

## Installation

```bash
# No new dependencies required
# All features use Node.js built-ins (readline, URL)
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Built-in `readline` | Inquirer.js (25M weekly downloads) | Only if we need multi-select, autocomplete, password masking, or spinners. v1.2 requires simple yes/no — overkill. |
| Built-in `readline` | Commander.js prompts | Commander.js is for argument parsing, not interactive prompts. Would need Inquirer.js as peer dependency. |
| Built-in `URL` + regex | `url-parse` npm package | Only if supporting Node.js <v10. We require Node.js >=16.7.0 (package.json). |
| Regex for Notion ID | Dedicated URL parser lib | Only if parsing non-standard URL formats. Notion uses standard HTTPS URLs. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Inquirer.js | 25M weekly downloads but 200KB+ package for features we don't need. v1.2 requires simple yes/no prompts, not multi-select/autocomplete/spinners. | Built-in `readline` with `rl.question()` pattern from install.js |
| Complex workflow orchestration libraries (Zenaton, Processus, WorkflowJS) | Heavy dependencies (Redis, BPMN parsers). GSD workflows are markdown files + sequential readline prompts. No distributed state needed. | Existing markdown workflow files + sequential readline prompts |
| Legacy `url.parse()` | Deprecated in Node.js v11+. Less secure than WHATWG URL API. | Built-in `URL` constructor |
| Custom URL regex for Notion IDs | Fragile — breaks if Notion adds query params or changes URL structure. | `URL` constructor + `pathname.split()` + validation |

## Stack Patterns by Feature

### Feature 1: "Apply recommended settings?" UX

**Pattern:** Callback-based readline prompts with default values

```javascript
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question(`Apply recommended settings? ${dim}[Y/n]${reset}: `, (answer) => {
  const apply = !answer.trim() || answer.trim().toLowerCase() === 'y';
  rl.close();

  if (apply) {
    // Apply defaults
  } else {
    // Ask individual questions
  }
});
```

**Why this pattern:**
- Already proven in install.js lines 1510-1576 (Notion API key prompt)
- Default-on pattern (`!answer.trim()` = yes) matches PM expectations
- Minimal code, no dependencies

### Feature 2: Auto-discussion workflow orchestration

**Pattern:** Sequential readline prompts chained via callbacks or async/await wrapper

```javascript
// Callback chaining (matches install.js pattern)
function discussPhase(phaseNum, callback) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question(`Ready to discuss Phase ${phaseNum}? [Y/n]: `, (answer) => {
    rl.close();
    if (!answer.trim() || answer.toLowerCase() === 'y') {
      // Spawn discussion agent
      callback();
    } else {
      callback(); // Skip to next
    }
  });
}
```

**Why this pattern:**
- GSD workflows already use sequential orchestration (markdown files → agent spawns)
- No state machine or Redis needed — linear phase progression
- Fits existing architecture: commands → workflows → agents

### Feature 3: Notion URL parsing to extract page IDs

**Pattern:** WHATWG URL + pathname extraction + validation

Notion page URL format:
- Standard: `https://www.notion.so/Page-Title-1429989fe8ac4effbc8f57f56486db54`
- With workspace: `https://www.notion.so/workspace-name/Page-Title-1429989fe8ac4effbc8f57f56486db54`
- ID format: 32 hex chars (no hyphens in URL, hyphens added for API)

```javascript
const { URL } = require('url');

function extractNotionPageId(urlString) {
  try {
    const url = new URL(urlString);

    // Extract last segment of pathname
    const segments = url.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    // Extract 32-char hex ID (after last hyphen in segment)
    const match = lastSegment.match(/([a-f0-9]{32})$/i);
    if (!match) return null;

    const rawId = match[1];

    // Format as UUID: 8-4-4-4-12
    return rawId.replace(
      /^([a-f0-9]{8})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{12})$/i,
      '$1-$2-$3-$4-$5'
    );
  } catch (e) {
    return null; // Invalid URL
  }
}
```

**Why this pattern:**
- Built-in `URL` constructor handles protocol, domain, query params, fragments safely
- Regex only for ID extraction (narrow scope = less fragile)
- Format conversion matches Notion API requirements (hyphens in 8-4-4-4-12 pattern)
- Returns null on invalid input (caller decides error handling)

**Sources:**
- [Notion Working with page content](https://developers.notion.com/docs/working-with-page-content) — Page ID format spec
- [How to Get Your Root Notion Page ID](https://docs.engine.so/root-notion-page-id) — ID extraction from URLs
- [Node.js URL Documentation](https://nodejs.org/api/url.html) — WHATWG URL API

### Feature 4: Post-planning Notion sync trigger

**Pattern:** Reuse existing readline prompt pattern + trigger existing CLI command

```javascript
rl.question(`Upload planning docs to Notion? ${dim}[Y/n]${reset}: `, (answer) => {
  const shouldSync = !answer.trim() || answer.trim().toLowerCase() === 'y';
  rl.close();

  if (shouldSync) {
    // Trigger existing /gsd:sync-notion workflow
    // (Don't shell out — call workflow orchestrator directly)
  }
});
```

**Why this pattern:**
- Matches install.js Notion prompt pattern (lines 1510-1576)
- Reuses existing sync-orchestrator.js module (no new Notion code needed)
- Default-yes UX matches PM workflow (most will sync)

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Node.js >=16.7.0 | readline (built-in), URL (built-in) | Already required in package.json. WHATWG URL API stable since Node.js v10. |
| readline callbacks | Existing install.js patterns | No breaking changes needed. Same callback-based API. |
| URL constructor | @notionhq/client ^5.9.0 | Notion SDK expects UUIDs in 8-4-4-4-12 format. Our regex conversion matches. |

## Integration Patterns

### With Existing Config System

**Pattern:** Read/write .planning/config.json for Notion parent page URL

```javascript
const config = JSON.parse(fs.readFileSync('.planning/config.json', 'utf8'));

// Add parent page URL to Notion section
config.notion = config.notion || {};
config.notion.parent_page_url = 'https://www.notion.so/workspace/Parent-Page-abc123...';
config.notion.parent_page_id = extractNotionPageId(config.notion.parent_page_url);

fs.writeFileSync('.planning/config.json', JSON.stringify(config, null, 2) + '\n');
```

**Already validated:** install.js lines 1547-1566 (Notion API key storage)

### With Existing Workflow Orchestration

**Pattern:** Markdown workflow files call readline prompts, then spawn agents

Existing pattern (from get-shit-done/workflows/plan-phase.md):
1. Markdown file defines orchestration steps
2. Claude reads workflow file
3. Claude executes prompts sequentially
4. Claude spawns subagents as needed

No new orchestration framework needed — v1.2 adds readline prompts to existing workflow files.

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| readline prompts | HIGH | Already in production (install.js). Pattern proven. Zero new dependencies. |
| URL parsing | HIGH | WHATWG URL API stable since Node.js v10. Notion ID format documented in official docs. |
| Workflow orchestration | HIGH | No new framework needed. Fits existing markdown → agent pattern. |
| Integration with existing stack | HIGH | All patterns validated in install.js and lib/notion/* modules. |

## Sources

**Notion API & URL Formats:**
- [Notion Working with page content](https://developers.notion.com/docs/working-with-page-content) — Page ID format specification (MEDIUM confidence — official docs)
- [How to Get Your Root Notion Page ID](https://docs.engine.so/root-notion-page-id) — ID extraction from URL examples (MEDIUM confidence — third-party docs verified with official)
- [Notion Update Page failing discussion](https://community.n8n.io/t/notion-update-page-failing-could-not-extract-page-id-from-url/248772) — Real-world ID extraction issues (LOW confidence — community anecdotes, validation only)

**Node.js Built-ins:**
- [Node.js v25.6.1 Readline Documentation](https://nodejs.org/api/readline.html) — Official readline API (HIGH confidence — official docs)
- [Node.js v25.6.1 URL Documentation](https://nodejs.org/api/url.html) — WHATWG URL API (HIGH confidence — official docs)
- [Creating a Confirmation Prompt in Node.js](https://www.codu.co/articles/creating-a-confirmation-prompt-in-a-node-js-script-efe8ynfx) — Yes/no prompt patterns (MEDIUM confidence — tutorial, verified with official docs)

**CLI Interaction Patterns:**
- [Node.js CLI Apps Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices) — CLI UX patterns (MEDIUM confidence — community-driven best practices repo)
- [How to Create a CLI Tool with Node.js (2026)](https://oneuptime.com/blog/post/2026-01-22-nodejs-create-cli-tool/view) — Modern CLI patterns (MEDIUM confidence — recent tutorial)
- [Build an interactive CLI with Node.js, Commander, Inquirer](https://medium.com/skilllane/build-an-interactive-cli-application-with-node-js-commander-inquirer-and-mongoose-76dc76c726b6) — Framework comparison (LOW confidence — used to validate "don't use Inquirer.js" decision)

**Workflow Orchestration (Research Only — Not Used):**
- [Orchestration Pattern in Microservices (2026)](https://oneuptime.com/blog/post/2026-01-30-microservices-orchestration-pattern/view) — Validated that GSD's markdown-based orchestration is simpler than orchestration frameworks
- [GitHub: node-workflow](https://github.com/TritonDataCenter/node-workflow) — Validated overkill for linear phase progression

---
*Stack research for: v1.2 Streamlined Workflow*
*Researched: 2026-02-12*
*Confidence: HIGH — All recommendations use existing validated stack (Node.js built-ins, existing patterns from install.js)*
