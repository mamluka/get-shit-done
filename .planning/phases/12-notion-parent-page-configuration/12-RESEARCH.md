# Phase 12: Notion Parent Page Configuration - Research

**Researched:** 2026-02-12
**Domain:** Notion URL parsing, Node.js readline prompts, configuration persistence
**Confidence:** HIGH

## Summary

This phase adds Notion parent page URL prompting to install.js setup flow. User provides a Notion page URL during installation (after API key prompt), the page ID is extracted from various URL formats, validated, and saved to config.json as `notion.parent_page_id`.

The implementation is straightforward: extend the existing Notion configuration prompt pattern in install.js (lines 1494-1577), extract the 32-character page ID from notion.so URLs using regex, validate it matches UUID/hex format, and save via config.json write. The pattern mirrors the existing API key prompt — optional field, validation with retries, helpful error messages.

**Primary recommendation:** Use Node.js built-in readline (already in use for Notion API key prompt), regex-based URL parsing to handle multiple notion.so URL formats, UUID format validation (32-char hex with optional dashes), and save to config.json `notion.parent_page_id` field alongside existing `notion.api_key`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js readline | Built-in (Node 14+) | Interactive CLI prompts | Zero dependencies, already used in install.js Notion prompt (line 1522), TTY detection built-in |
| fs (Node.js) | Built-in | Read/write config.json | Standard for file operations, already used in install.js config persistence |
| URL regex patterns | Built-in RegExp | Extract page ID from notion.so URLs | No dependencies, proven pattern for URL parsing |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing Notion prompt pattern | Current (install.js) | Validation, retry logic, user feedback | Reuse proven pattern from API key prompt (lines 1520-1577) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex extraction | URL parsing library (url-parse, query-string) | External dependency for simple ID extraction — regex sufficient for notion.so patterns |
| Custom validation | @notionhq/client validatePageId | SDK doesn't expose page ID validation — must validate format ourselves |
| Separate prompt file | Extend install.js inline | Inline keeps all install prompts co-located, matches existing API key pattern |

**Installation:**

None required — using Node.js built-ins and extending existing install.js patterns.

## Architecture Patterns

### Recommended Code Structure

```
bin/install.js
  → promptNotionKey() (existing, lines 1494-1577)
    → After API key saved (line 1566)
    → NEW: promptNotionParentPage()
      → Parse URL with regex
      → Validate page ID format
      → Save to config.json notion.parent_page_id
```

No new files needed — extend existing `promptNotionKey()` function in install.js.

### Pattern 1: Notion URL Page ID Extraction

**What:** Extract 32-character page ID from various notion.so URL formats

**When to use:** After user provides Notion page URL input

**Supported URL formats:**

```javascript
// Format 1: notion.so/{workspace}/{slug}-{id}
// Example: https://www.notion.so/myworkspace/Project-Planning-1429989fe8ac4effbc8f57f56486db54
// Extract: 1429989fe8ac4effbc8f57f56486db54

// Format 2: notion.so/{slug}-{id}
// Example: https://notion.so/Project-Planning-1429989fe8ac4effbc8f57f56486db54
// Extract: 1429989fe8ac4effbc8f57f56486db54

// Format 3: notion.so/{id}
// Example: https://notion.so/1429989fe8ac4effbc8f57f56486db54
// Extract: 1429989fe8ac4effbc8f57f56486db54

// Format 4: Shared link with query params
// Example: https://www.notion.so/Project-1429989fe8ac4effbc8f57f56486db54?pvs=4
// Extract: 1429989fe8ac4effbc8f57f56486db54 (ignore query params)
```

**Extraction pattern:**

```javascript
function extractPageIdFromUrl(url) {
  // Strip query parameters first
  const urlWithoutQuery = url.split('?')[0];

  // Match 32-character hex string at end of URL path
  // Page ID is always the last segment after the last dash
  const match = urlWithoutQuery.match(/([a-f0-9]{32})$/i);

  if (match) {
    return match[1];
  }

  return null;
}
```

**Why this works:** Notion page IDs are always 32 lowercase hex characters. They appear at the end of the URL path (after last dash in slug format, or standalone). Query parameters are decorative and can be ignored.

### Pattern 2: Page ID Format Validation

**What:** Validate extracted page ID matches Notion's UUID format requirements

**When to use:** After extracting page ID from URL, before saving to config

**Validation rules:**

```javascript
function validatePageId(pageId) {
  if (!pageId || pageId.trim() === '') {
    return { valid: false, error: 'Page ID is empty' };
  }

  const trimmed = pageId.trim();

  // Page ID must be 32 hex characters (lowercase or uppercase)
  // Can optionally have dashes in UUID format: 8-4-4-4-12
  const hexOnly = /^[a-f0-9]{32}$/i;
  const withDashes = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

  if (!hexOnly.test(trimmed) && !withDashes.test(trimmed)) {
    return {
      valid: false,
      error: 'Page ID must be 32 hex characters (with optional UUID dashes)'
    };
  }

  // Normalize to non-dashed format for storage
  const normalized = trimmed.replace(/-/g, '');

  return { valid: true, pageId: normalized };
}
```

**Why normalize:** Notion API accepts both formats (with/without dashes), but storing without dashes is simpler and consistent with how Notion displays IDs in URLs.

### Pattern 3: Config Persistence (from existing Notion prompt)

**What:** Save parent page ID to config.json in `notion` section alongside `api_key`

**When to use:** After validation passes

**Example from install.js (lines 1559-1566):**

```javascript
// Read existing config if present
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    // Ignore parse errors, will overwrite
  }
}

// Merge with notion section
config.notion = {
  api_key: trimmedKey,
  parent_page_id: normalizedPageId  // NEW: Add parent page ID
};

// Write back to config
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
```

**Why merge pattern:** Preserves other config.json fields, handles missing file gracefully, atomic write (writeFileSync is synchronous).

### Pattern 4: Optional Field with Skip Support

**What:** Allow user to skip parent page configuration by pressing Enter

**When to use:** User may want to configure later or doesn't use Notion parent pages

**Example:**

```javascript
rl.question(`  Enter parent page URL (or press Enter to skip): `, (url) => {
  const trimmed = url.trim();

  if (!trimmed) {
    // User skipped
    rl.close();
    console.log(`  Skipped. You can add parent page URL later to .planning/config.json\n`);
    callback();
    return;
  }

  // Process URL...
});
```

**Why optional:** Not all users need parent page hierarchy, some may add it later via manual config edit.

### Pattern 5: Retry Logic for Invalid URLs (from API key prompt)

**What:** Allow 2-3 retry attempts for invalid URLs before skipping

**When to use:** User typo or copy-paste error — give them chances to fix

**Example from install.js (lines 1521-1536):**

```javascript
const askForKey = (retriesLeft) => {
  rl.question(`  Enter your Notion API key: `, (key) => {
    const trimmedKey = key.trim();

    // Validate key format
    if (!trimmedKey.startsWith('secret_') && !trimmedKey.startsWith('ntn_')) {
      if (retriesLeft > 0) {
        console.log(`  ${yellow}⚠${reset} Invalid format. Try again.`);
        askForKey(retriesLeft - 1);
      } else {
        console.log(`  ${yellow}⚠${reset} Too many invalid attempts. Skipping.\n`);
        rl.close();
        callback();
      }
      return;
    }

    // Valid key, proceed...
  });
};

askForKey(2); // Allow 2 retries
```

**Adapt for page URL:**

```javascript
const askForPageUrl = (retriesLeft) => {
  rl.question(`  Enter parent page URL (or press Enter to skip): `, (url) => {
    const trimmed = url.trim();

    // Skip if empty
    if (!trimmed) {
      rl.close();
      callback();
      return;
    }

    // Extract and validate
    const pageId = extractPageIdFromUrl(trimmed);
    const validation = validatePageId(pageId);

    if (!validation.valid) {
      if (retriesLeft > 0) {
        console.log(`  ${yellow}⚠${reset} ${validation.error}. Try again.`);
        console.log(`  ${dim}Example: https://notion.so/Project-Name-abc123...${reset}`);
        askForPageUrl(retriesLeft - 1);
      } else {
        console.log(`  ${yellow}⚠${reset} Too many invalid attempts. Skipping.\n`);
        rl.close();
        callback();
      }
      return;
    }

    // Valid page ID, save to config...
  });
};

askForPageUrl(2); // Allow 2 retries
```

### Anti-Patterns to Avoid

- **Validating via Notion API during install:** Don't call `notion.pages.retrieve()` to check if page exists — requires API key to be already configured, adds network dependency, slows install. Format validation is sufficient.
- **Accepting workspace URLs:** Don't allow `https://notion.so/myworkspace` (no page ID) — these aren't pages, they're workspace roots. Validate URL has 32-char hex segment.
- **Storing UUID with dashes:** Notion API accepts both, but URLs never include dashes. Store normalized (no dashes) for consistency.
- **Required field:** Don't make parent page required — user may not know the URL during install, or may configure later.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL parsing library | Custom URL parser with protocol/host/path splitting | Built-in RegExp extraction | Simple 32-char hex match at path end — no need for full URL parser |
| Page ID format validation | Custom character checking loops | RegExp pattern matching | UUID format is well-defined, regex is standard solution |
| Notion API validation | Call pages.retrieve() to check page exists | Format validation only | API call during install adds latency, network dependency, requires key already set |
| Input retry logic | Custom counter and prompt re-display | Recursive function with retry counter (proven in install.js) | Already implemented and tested in API key prompt |

**Key insight:** Notion page IDs follow a strict format (32 hex chars), and notion.so URLs have predictable structure. Simple regex extraction + format validation is more reliable than parsing with external libraries (which may handle edge cases we don't need).

## Common Pitfalls

### Pitfall 1: Accepting Invalid URL Formats

**What goes wrong:** User provides workspace URL (`https://notion.so/myworkspace`) or database URL, but these don't contain page IDs. Code extracts nothing or wrong ID segment.

**Why it happens:** Not checking for 32-character hex string at end of path — assuming any notion.so URL is valid.

**How to avoid:**

```javascript
// GOOD: Extract and validate
const pageId = extractPageIdFromUrl(url);
if (!pageId) {
  return { valid: false, error: 'URL does not contain a page ID. Use a page URL, not workspace or database.' };
}

// Validate format
const validation = validatePageId(pageId);
if (!validation.valid) {
  return validation; // Return error with specific reason
}
```

**Warning signs:**
- User reports "parent page not working" after install
- Config contains invalid page ID (less than 32 chars, non-hex characters)

### Pitfall 2: Not Handling Query Parameters in URLs

**What goes wrong:** User copies shared link like `https://notion.so/Page-abc123?pvs=4&share=xyz`. Code tries to match regex against full string including query params, extraction fails.

**Why it happens:** Not stripping query parameters before regex matching.

**How to avoid:**

```javascript
// Strip query params BEFORE extraction
const urlWithoutQuery = url.split('?')[0];
const match = urlWithoutQuery.match(/([a-f0-9]{32})$/i);
```

**Warning signs:**
- Extraction fails on valid shared links
- User says "URL works in browser but installer rejects it"

### Pitfall 3: Case-Sensitive Hex Matching

**What goes wrong:** Notion uses lowercase hex in URLs, but user might paste uppercase (rare, but possible from formatted text). Case-sensitive regex fails match.

**Why it happens:** Using `/[a-f0-9]{32}/` without `i` flag.

**How to avoid:**

```javascript
// Use case-insensitive flag
const match = urlWithoutQuery.match(/([a-f0-9]{32})$/i);
//                                                     ^ case-insensitive
```

**Warning signs:**
- Extraction works locally but fails on user machine (copy-paste from different source)

### Pitfall 4: Not Closing readline Before Async Operations

**What goes wrong:** Call `rl.close()` after starting config write, but config write is async. Readline closes before write completes, process exits early.

**Why it happens:** Forgetting that fs.writeFileSync is sync but error handling might be async.

**How to avoid:**

```javascript
// GOOD: Close after all sync operations complete
rl.question('URL: ', (url) => {
  const pageId = extractAndValidate(url);

  // Validate (sync)
  if (!pageId) {
    rl.close();
    callback();
    return;
  }

  // Write config (sync)
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`  ${green}✓${reset} Parent page saved`);
  } catch (e) {
    console.log(`  ${yellow}⚠${reset} Failed to save: ${e.message}`);
  }

  // Close AFTER all operations
  rl.close();
  callback();
});
```

**Warning signs:**
- Config write sometimes doesn't complete
- Process exits before showing success message

### Pitfall 5: Overwriting Entire Notion Config Section

**What goes wrong:** Code writes `config.notion = { parent_page_id: '...' }` without preserving existing `api_key`. User loses API key configuration.

**Why it happens:** Not reading existing config before merging.

**How to avoid:**

```javascript
// Read existing config
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// Merge into notion section (preserves api_key)
if (!config.notion) {
  config.notion = {};
}

// Add parent page ID without overwriting api_key
config.notion.parent_page_id = normalizedPageId;

// Write back
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
```

**Warning signs:**
- User reports "API key missing after setting parent page"
- Notion sync fails with auth error after install

### Pitfall 6: No Example URL Format in Error Messages

**What goes wrong:** User sees "Invalid URL format" but doesn't know what format is expected. Retries with same format, fails again.

**Why it happens:** Error message doesn't show example of valid URL.

**How to avoid:**

```javascript
console.log(`  ${yellow}⚠${reset} Invalid URL format.`);
console.log(`  ${dim}Example: https://notion.so/Project-Name-abc123def456...${reset}`);
console.log(`  ${dim}The URL should contain a 32-character page ID at the end.${reset}`);
```

**Warning signs:**
- User gives up after first error (no retry)
- Support requests asking "what URL format to use"

## Code Examples

Verified patterns from official sources and existing GSD codebase:

### URL Page ID Extraction

```javascript
// Pattern for notion.so URL parsing
function extractPageIdFromUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Remove query parameters and trailing slashes
  const cleaned = url.split('?')[0].replace(/\/$/, '');

  // Match 32 lowercase hex characters at end of path
  // These formats all work:
  // - https://notion.so/{slug}-{id}
  // - https://www.notion.so/{workspace}/{slug}-{id}
  // - https://notion.so/{id}
  const match = cleaned.match(/([a-f0-9]{32})$/i);

  return match ? match[1] : null;
}

// Test cases (should extract ID from all):
// https://notion.so/Project-1429989fe8ac4effbc8f57f56486db54
// https://www.notion.so/myworkspace/Project-1429989fe8ac4effbc8f57f56486db54
// https://notion.so/1429989fe8ac4effbc8f57f56486db54
// https://notion.so/Project-1429989fe8ac4effbc8f57f56486db54?pvs=4
```

**Source:** Web search findings + Notion URL structure analysis. Verified against multiple notion.so URL formats.

### Page ID Format Validation

```javascript
// Validate extracted page ID matches Notion UUID format
function validatePageId(pageId) {
  if (!pageId || typeof pageId !== 'string') {
    return { valid: false, error: 'No page ID provided' };
  }

  const trimmed = pageId.trim();

  // Must be 32 hex characters (no dashes) or UUIDv4 format (with dashes)
  const hexPattern = /^[a-f0-9]{32}$/i;
  const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

  if (!hexPattern.test(trimmed) && !uuidPattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Page ID must be 32 hex characters (format: 1429989fe8ac4eff...)'
    };
  }

  // Normalize to non-dashed format (how Notion stores internally)
  const normalized = trimmed.toLowerCase().replace(/-/g, '');

  return { valid: true, pageId: normalized };
}
```

**Source:** Web search findings on Notion UUID format + validation patterns from lib/notion/client.js.

### Readline Prompt with Retry Logic (adapted from install.js)

```javascript
// Source: bin/install.js lines 1521-1575 (API key prompt pattern)
const readline = require('readline');

function promptNotionParentPage(callback) {
  if (!process.stdin.isTTY) {
    // Non-interactive, skip
    callback();
    return;
  }

  const planningDir = path.join(process.cwd(), '.planning');
  const configPath = path.join(planningDir, 'config.json');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`\n  ${cyan}Notion Parent Page (optional)${reset}\n`);
  console.log(`  If you want pages created under a parent page, provide the URL.\n`);

  const askForUrl = (retriesLeft) => {
    rl.question(`  Parent page URL (or press Enter to skip): `, (url) => {
      const trimmed = url.trim();

      // Skip if empty
      if (!trimmed) {
        rl.close();
        console.log(`  Skipped. You can add parent page later to .planning/config.json\n`);
        callback();
        return;
      }

      // Extract and validate
      const pageId = extractPageIdFromUrl(trimmed);
      const validation = validatePageId(pageId);

      if (!validation.valid) {
        if (retriesLeft > 0) {
          console.log(`  ${yellow}⚠${reset} ${validation.error}`);
          console.log(`  ${dim}Example: https://notion.so/Project-Name-abc123def456...${reset}`);
          askForUrl(retriesLeft - 1);
        } else {
          console.log(`  ${yellow}⚠${reset} Too many invalid attempts. Skipping.\n`);
          rl.close();
          callback();
        }
        return;
      }

      // Valid page ID, save to config
      rl.close();

      try {
        // Read existing config
        let config = {};
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        // Merge into notion section
        if (!config.notion) {
          config.notion = {};
        }
        config.notion.parent_page_id = validation.pageId;

        // Write back
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
        console.log(`  ${green}✓${reset} Parent page ID saved to .planning/config.json\n`);
      } catch (e) {
        console.log(`  ${yellow}⚠${reset} Failed to save config: ${e.message}\n`);
      }

      callback();
    });
  };

  askForUrl(2); // Allow 2 retries
}
```

**Source:** Adapted from bin/install.js `promptNotionKey()` function (lines 1494-1577).

### Integration Point in install.js

```javascript
// Add after API key prompt (line 1577 in promptNotionKey callback)
// Current code:
promptNotionKey(() => {
  console.log(`
  ${green}Done!${reset} Launch ${program} and run ${cyan}${command}${reset}.
  `);
});

// NEW code:
promptNotionKey(() => {
  // Chain parent page prompt after API key
  promptNotionParentPage(() => {
    console.log(`
    ${green}Done!${reset} Launch ${program} and run ${cyan}${command}${reset}.
    `);
  });
});
```

**Source:** Extension of existing callback chaining pattern in install.js.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual config.json editing | Interactive prompts during install | install.js pattern ~2024 | Reduced setup friction — users don't need to find page IDs manually |
| Full URL parsing libraries | Regex-based extraction | Modern minimalism trend | Fewer dependencies, faster parsing for simple patterns |
| Required parent page | Optional with skip support | CLI UX best practices | Users not blocked if they don't have parent page ready |

**Deprecated/outdated:**

- **Requiring parent page during sync:** Old Notion sync tools required parent page at sync time. Current pattern (v1.1) saves parent page in config once, reused for all syncs. Phase 12 moves this even earlier (install time).
- **Page ID copy-paste from Notion UI:** Users had to find page ID manually (via Copy Link, then extract from URL). Phase 12 accepts full URL, extracts automatically — reduces cognitive load.

## Open Questions

1. **Should we validate parent page exists via Notion API during install?**
   - What we know: Format validation is fast and doesn't require network call
   - What's unclear: Whether users might provide wrong page ID that passes format validation
   - Recommendation: Skip API validation during install (keeps install fast, no network dependency). Phase 14 (Notion Sync Integration) will validate parent page exists before sync — better error handling context there.

2. **Should we show parent page title after successful save?**
   - What we know: Would require Notion API call to fetch page title
   - What's unclear: Whether user needs confirmation beyond "✓ Parent page ID saved"
   - Recommendation: Skip title fetch during install (same reasoning as Q1). User can verify parent page works during first sync.

## Sources

### Primary (HIGH confidence)

- Notion Developer Documentation: [Working with page content](https://developers.notion.com/docs/working-with-page-content) — Page ID format and URL structure
- Notion Developer Documentation: [Retrieve a page](https://developers.notion.com/reference/retrieve-a-page) — Page ID validation requirements
- Node.js readline documentation: https://nodejs.org/api/readline.html — Interactive prompts, TTY detection
- GSD codebase: bin/install.js (lines 1494-1577) — Existing Notion API key prompt pattern
- GSD codebase: lib/notion/client.js (lines 19-46) — Config loading and validation patterns

### Secondary (MEDIUM confidence)

- Web search: [How to Find a Page ID From a Page in Notion | Rechatbox](https://docs.rechatbox.com/rechatbox/videobox/integrations/how-to-find-a-page-id-from-a-page-in-notion) — Page ID extraction from URLs
- Web search: [How to Get Your Root Notion Page ID](https://docs.engine.so/root-notion-page-id) — Page ID format (32-char with 8-4-4-4-12 UUID pattern)
- Web search: [Master Node.js readline/promises: Production-Ready Guide | Kite Metric](https://kitemetric.com/blogs/mastering-node-js-readline-promises-a-production-ready-guide) — Readline best practices

### Tertiary (LOW confidence)

None — all findings verified against GSD codebase or official Notion/Node.js documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Node.js readline already in use, regex patterns proven, config write patterns established
- Architecture: HIGH — Direct extension of existing install.js Notion prompt flow
- Pitfalls: HIGH — URL parsing edge cases well-documented, validation patterns verified

**Research date:** 2026-02-12
**Valid until:** 60 days (stable APIs, established patterns, Notion URL format unlikely to change)
