# Phase 6: Foundation & SDK Setup - Research

**Researched:** 2026-02-11
**Domain:** Notion API SDK, credential management, CLI configuration, rate limiting
**Confidence:** HIGH

## Summary

Phase 6 establishes the foundation for all Notion operations by implementing secure token handling, SDK integration, and rate-limited request management. The research confirms that @notionhq/client (official Notion JavaScript SDK) provides built-in retry logic and automatic rate limit handling, significantly reducing custom implementation needs. The SDK respects Notion's 3 req/sec average limit through exponential backoff with configurable retry parameters.

For configuration, the existing `.planning/config.json` pattern should be extended with a `notion` section for API key storage. Given the codebase already uses zero external dependencies (gsd-tools.js is 4,503 LOC with no deps), adding @notionhq/client and @tryfabric/martian as the first dependencies is justified by their specialized functionality. The notion-sync.js CLI tool will be a separate executable alongside gsd-tools.js, handling all Notion operations including page creation with parent/child hierarchies matching `.planning/` structure.

**Primary recommendation:** Use @notionhq/client SDK with default retry configuration (2 retries, exponential backoff), store API key in config.json with .gitignore enforcement, and implement notion-sync.json for tracking page ID mappings per project.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @notionhq/client | Latest (check npm) | Official Notion API SDK | Official SDK, built-in retry logic, automatic rate limiting, active maintenance by Notion |
| @tryfabric/martian | 1.2.4 | Markdown to Notion blocks converter | Standard parser for MD→Notion, supports GFM, handles Notion API limits |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ajv | 8.x | JSON schema validation | Optional: validate config.json and notion-sync.json schemas |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @notionhq/client | Raw HTTP + fetch/axios | Lose built-in retry logic, rate limiting, type definitions. Not recommended. |
| config.json storage | .env file | Less structured for complex config, existing codebase uses config.json pattern |
| @tryfabric/martian | Custom MD parser | Markdown parsing is complex (GFM, nested lists, code blocks). Don't hand-roll. |

**Installation:**
```bash
npm install @notionhq/client @tryfabric/martian
# Optional:
npm install ajv
```

## Architecture Patterns

### Recommended Project Structure
```
.planning/
├── config.json              # Extended with notion section
├── notion-sync.json         # Per-project page ID tracking
└── phases/
    └── XX-name/
        └── *.md             # Synced to Notion pages

.claude/get-shit-done/
├── bin/
│   ├── gsd-tools.js        # Existing CLI (no deps)
│   └── notion-sync.js      # NEW: Notion operations CLI
└── lib/
    └── notion/             # NEW: Notion helpers
        ├── client.js       # SDK initialization
        ├── rate-limit.js   # Queue management (if needed)
        └── markdown.js     # Martian integration
```

### Pattern 1: SDK Client Initialization
**What:** Initialize Notion client with token from config.json
**When to use:** Once at CLI startup, reuse across requests
**Example:**
```javascript
// Source: https://github.com/makenotion/notion-sdk-js
const { Client } = require("@notionhq/client");
const fs = require('fs');
const path = require('path');

function initNotionClient(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  if (!config.notion || !config.notion.api_key) {
    throw new Error('Notion API key not found in config.json');
  }

  return new Client({
    auth: config.notion.api_key,
    // Default retry: 2 attempts, exponential backoff
    retry: {
      maxRetries: 2,
      initialRetryDelayMs: 500,
      maxRetryDelayMs: 60000,
    },
    timeoutMs: 60000,
  });
}
```

### Pattern 2: Config.json Schema Extension
**What:** Add notion section to existing config structure
**When to use:** During setup flow or manual configuration
**Example:**
```json
{
  "mode": "yolo",
  "depth": "standard",
  "parallelization": true,
  "commit_docs": true,
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  },
  "notion": {
    "api_key": "secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "workspace_id": "optional-for-future-use"
  }
}
```

### Pattern 3: Page ID Tracking Schema
**What:** notion-sync.json tracks page IDs per project path
**When to use:** After creating pages, before updates
**Example:**
```json
{
  "workspace_page_id": "59833787-2cf9-4fdf-8782-e53db20768a5",
  "projects": {
    "my-project": {
      "root_page_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "phase_pages": {
        "01-setup": "page-id-1",
        "02-architecture": "page-id-2"
      },
      "doc_pages": {
        ".planning/phases/01-setup/01-RESEARCH.md": "page-id-x",
        ".planning/phases/01-setup/01-01-PLAN.md": "page-id-y"
      }
    }
  }
}
```

### Pattern 4: Parent/Child Page Hierarchy
**What:** Create nested pages matching .planning/ folder structure
**When to use:** Creating Notion workspace mirror of local planning
**Example:**
```javascript
// Source: https://developers.notion.com/reference/parent-object
async function createChildPage(notion, parentPageId, title, content) {
  const response = await notion.pages.create({
    parent: {
      type: "page_id",
      page_id: parentPageId
    },
    properties: {
      title: {
        title: [{ text: { content: title } }]
      }
    },
    children: content // Notion block objects
  });
  return response.id;
}
```

### Pattern 5: Markdown to Notion Blocks
**What:** Convert .md files to Notion block structure
**When to use:** Syncing planning docs to Notion
**Example:**
```javascript
// Source: https://github.com/tryfabric/martian
const { markdownToBlocks } = require('@tryfabric/martian');

function convertMarkdownFile(filePath) {
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const blocks = markdownToBlocks(markdown);
  return blocks;
}
```

### Anti-Patterns to Avoid
- **Hardcoding API keys in code:** Always use config.json with .gitignore enforcement
- **Custom retry logic:** SDK has built-in retry with exponential backoff, don't reimplement
- **Ignoring rate limits:** SDK handles 3 req/sec automatically, but respect 100 blocks/request limit
- **Storing tokens in .env:** Existing codebase uses config.json pattern, maintain consistency
- **Hand-rolling markdown parser:** Use @tryfabric/martian, markdown parsing is complex

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom queue with delays | SDK built-in retry + optional p-limit | SDK respects Retry-After header, handles 429 errors automatically |
| Markdown parsing | Regex-based MD→Notion converter | @tryfabric/martian | Handles GFM, nested lists, code blocks, tables, Notion API limits |
| Retry logic | setTimeout-based retry | SDK retry configuration | Exponential backoff with jitter built-in, respects Retry-After |
| JSON validation | Manual property checks | ajv (optional) | JSON Schema validation prevents config corruption |
| Token storage | .env file | config.json with .gitignore | Consistency with existing codebase pattern |

**Key insight:** The @notionhq/client SDK eliminates most complexity around rate limiting and error handling. The primary work is configuration management and state tracking (notion-sync.json), not API mechanics.

## Common Pitfalls

### Pitfall 1: API Key in Git Commits
**What goes wrong:** API key accidentally committed to repository
**Why it happens:** Forgot to add config.json to .gitignore before first commit
**How to avoid:**
1. Add `.planning/config.json` to .gitignore BEFORE setup flow
2. Create `.planning/config.example.json` with dummy values
3. Validate .gitignore in setup flow
**Warning signs:** git status shows config.json as untracked, pre-commit hooks detect token patterns

### Pitfall 2: Exceeding 100 Blocks Per Request
**What goes wrong:** API error when appending >100 child blocks to page
**Why it happens:** Large markdown files convert to >100 Notion blocks
**How to avoid:**
1. @tryfabric/martian handles truncation by default
2. Split large docs into multiple pages or batched requests
3. Check block count before append operation
**Warning signs:** Validation error from Notion API: "blocks array too long"

### Pitfall 3: Not Tracking Page IDs
**What goes wrong:** Create duplicate pages on re-sync, can't update existing pages
**Why it happens:** No persistent mapping between local files and Notion page IDs
**How to avoid:**
1. Implement notion-sync.json before first sync
2. Write page IDs after creation
3. Check for existing page ID before creating new page
**Warning signs:** Multiple identical pages in Notion workspace

### Pitfall 4: Assuming Burst Capacity
**What goes wrong:** Rate limit errors during batch operations despite 3 req/sec
**Why it happens:** Notion allows "some bursts" but doesn't specify exact limits
**How to avoid:**
1. Use SDK default retry (handles 429 automatically)
2. For batch operations, add p-limit with concurrency: 3
3. Monitor for rate limit errors, adjust if needed
**Warning signs:** Frequent 429 errors logged by SDK retry logic

### Pitfall 5: Invalid Parent Page ID
**What goes wrong:** Error creating child page because parent doesn't exist or isn't shared with integration
**Why it happens:** Integration not added to parent page, or page ID typo
**How to avoid:**
1. Validate parent page exists before creating children
2. Setup flow should verify integration has access to workspace
3. Store and validate page IDs from notion-sync.json
**Warning signs:** API error: "Could not find page with ID" or "Unauthorized"

### Pitfall 6: Missing Notion-Version Header
**What goes wrong:** API calls fail or use outdated schema
**Why it happens:** SDK requires Notion-Version header
**How to avoid:** SDK handles this automatically, no manual action needed
**Warning signs:** API errors about missing version header (shouldn't happen with SDK)

## Code Examples

Verified patterns from official sources:

### Error Handling with Type Guards
```javascript
// Source: https://github.com/makenotion/notion-sdk-js
const { Client, APIErrorCode, isNotionClientError } = require("@notionhq/client");

async function safeFetchPage(notion, pageId) {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    return { success: true, page };
  } catch (error) {
    if (isNotionClientError(error)) {
      if (error.code === APIErrorCode.ObjectNotFound) {
        return { success: false, error: 'Page not found' };
      } else if (error.code === APIErrorCode.Unauthorized) {
        return { success: false, error: 'Integration not shared with page' };
      }
    }
    throw error; // Re-throw unexpected errors
  }
}
```

### Rate Limit Configuration
```javascript
// Source: https://github.com/makenotion/notion-sdk-js
const notion = new Client({
  auth: apiKey,
  retry: {
    maxRetries: 5,              // Default: 2
    initialRetryDelayMs: 500,   // Default: 500
    maxRetryDelayMs: 60000,     // Default: 60000
  }
});

// SDK automatically retries on:
// - HTTP 429 (rate limited) - all methods
// - HTTP 500 (server error) - GET and DELETE only
// - HTTP 503 (unavailable) - GET and DELETE only
```

### Markdown to Notion with Martian
```javascript
// Source: https://github.com/tryfabric/martian
const { markdownToBlocks, markdownToRichText } = require('@tryfabric/martian');

// Convert full markdown document to blocks
const blocks = markdownToBlocks(`
# Heading 1
Some **bold** and _italic_ text.

## Heading 2
- [x] Completed todo
- [ ] Pending todo

> 📘 **Note:** This becomes a callout block
`);

// Convert inline markdown to RichText (for properties)
const richText = markdownToRichText(`**Bold** with _italics_`);
```

### Config.json Safe Read/Write
```javascript
// Pattern from gsd-tools.js (lines 155-161)
function loadConfig(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const defaults = {
    model_profile: 'balanced',
    commit_docs: true,
    search_gitignored: false,
    branching_strategy: 'none',
    parallelization: true,
  };

  try {
    if (fs.existsSync(configPath)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
    }
    return defaults;
  } catch (err) {
    console.error('Failed to read config.json:', err.message);
    return defaults;
  }
}

function saveConfig(cwd, config) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
```

### Gitignore Validation
```javascript
function ensureConfigIgnored(cwd) {
  const gitignorePath = path.join(cwd, '.planning', '.gitignore');
  const requiredEntries = ['config.json', 'notion-sync.json'];

  let gitignore = '';
  if (fs.existsSync(gitignorePath)) {
    gitignore = fs.readFileSync(gitignorePath, 'utf-8');
  }

  const lines = gitignore.split('\n');
  const missing = requiredEntries.filter(entry =>
    !lines.some(line => line.trim() === entry)
  );

  if (missing.length > 0) {
    const updated = gitignore + '\n' + missing.join('\n') + '\n';
    fs.writeFileSync(gitignorePath, updated, 'utf-8');
    return { updated: true, added: missing };
  }

  return { updated: false };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| dotenv for all config | config.json + .env hybrid | 2020-2021 | Structured config, environment-specific overrides |
| Node.js v20.6.0+ --env-file | Native .env support | Aug 2023 | Can skip dotenv dependency for simple cases |
| Joi validation | ajv (JSON Schema) | 2020+ | 50% faster, better TypeScript support, JSON Schema standard |
| Custom rate limiters | p-limit, bottleneck | 2018+ | Battle-tested libraries, better than hand-rolled |
| Manual retry logic | SDK built-in retry | SDK inception | Notion SDK handles retry out-of-box |

**Deprecated/outdated:**
- **dotenv in production:** Use platform environment variables (AWS, Heroku, k8s secrets)
- **Joi for JSON validation:** ajv is 50% faster, use Joi for complex object validation only
- **Custom markdown parsers:** @tryfabric/martian is standard for Notion, actively maintained

## Open Questions

1. **Notion API key scope and permissions**
   - What we know: Integration tokens vs OAuth tokens
   - What's unclear: Exact permissions needed for page creation/updates
   - Recommendation: Setup flow should link to Notion integration creation docs, test with minimal permissions

2. **Rate limit burst capacity**
   - What we know: Average 3 req/sec, "some bursts allowed"
   - What's unclear: Exact burst window (10s? 60s?) and max burst size
   - Recommendation: Start with SDK defaults, monitor 429 errors, add p-limit(3) if needed

3. **Page ID persistence strategy**
   - What we know: Need to track page IDs per project
   - What's unclear: Should notion-sync.json be project-scoped or global?
   - Recommendation: Global notion-sync.json in .planning/ with project namespaces (see Pattern 3)

4. **Multi-workspace support**
   - What we know: Single API key per integration
   - What's unclear: Do we need to support multiple workspaces per project?
   - Recommendation: Phase 6 assumes single workspace, defer multi-workspace to later phase if needed

## Sources

### Primary (HIGH confidence)
- [@notionhq/client GitHub](https://github.com/makenotion/notion-sdk-js) - SDK setup, retry logic, error handling
- [Notion API Request Limits](https://developers.notion.com/reference/request-limits) - 3 req/sec, Retry-After header
- [Notion API Authentication](https://developers.notion.com/reference/authentication) - Token types, security
- [Notion Parent Object Reference](https://developers.notion.com/reference/parent-object) - Page hierarchy, parent types
- [@tryfabric/martian GitHub](https://github.com/tryfabric/martian) - Markdown conversion, API usage
- [Ajv Official Docs](https://ajv.js.org/guide/why-ajv.html) - Performance, JSON Schema support

### Secondary (MEDIUM confidence)
- [Node.js Security Best Practices 2026](https://www.sparkleweb.in/blog/node.js_security_best_practices_for_2026) - Token storage, .gitignore patterns
- [Comparing Schema Validation Libraries](https://www.bitovi.com/blog/comparing-schema-validation-libraries-ajv-joi-yup-and-zod) - ajv vs alternatives
- [Node.js Rate Limiting Libraries Comparison](https://npm-compare.com/bottleneck,express-rate-limit,limiter,p-limit,rate-limiter-flexible,ratelimiter) - p-limit, bottleneck
- [Should You Still Use dotenv in 2025?](https://infisical.com/blog/stop-using-dotenv-in-nodejs-v20.6.0+) - Native --env-file, production patterns
- [How to Handle Notion API Request Limits](https://thomasjfrank.com/how-to-handle-notion-api-request-limits/) - Community best practices

### Tertiary (LOW confidence)
- None - All key findings verified with official docs or multiple sources

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - Official SDK recommended by Notion, @tryfabric/martian is standard parser
- Architecture: **HIGH** - Patterns verified from official SDK docs and existing codebase (gsd-tools.js)
- Pitfalls: **MEDIUM-HIGH** - Derived from official docs (100 block limit, rate limits) and general Node.js security practices
- Rate limiting: **HIGH** - Official Notion docs specify 3 req/sec, SDK handles automatically
- Token storage: **HIGH** - Existing codebase uses config.json pattern, .gitignore best practices well-established

**Research date:** 2026-02-11
**Valid until:** 2026-04-11 (60 days - stable domain, Notion API is mature)

**Notes:**
- @tryfabric/martian last updated May 2022 but still compatible with current Notion API
- Node.js v20.6.0+ native --env-file may reduce dotenv need, but not applicable here (using config.json)
- No Context7 access required - all information verified from official sources and web research
