# Architecture Integration: v1.2 Streamlined Workflow

**Domain:** Workflow improvement features for existing GSD framework
**Researched:** 2026-02-12
**Confidence:** HIGH (existing codebase analyzed)

## Executive Summary

v1.2 adds 4 features that integrate into existing workflows:
1. **Quick settings** — shortcut during new-project setup
2. **Auto-discuss** — insert discuss-phase before plan-phase
3. **Notion sync prompt** — post-planning sync offer
4. **Notion parent URL** — parent page configuration at install

All features leverage existing architecture. No new modules. Modifications only.

## Existing Architecture (Context)

```
Commands (slash commands)
    ↓
Workflows (markdown orchestration)
    ↓
Agents (specialized subprocesses)
    ↓
Utilities (gsd-tools.js, notion-sync.js)
```

**Key workflows affected:**
- `new-project.md` — project initialization (Steps 1-10)
- `plan-phase.md` — planning orchestration (Steps 1-14)
- `install.js` — interactive setup

**Key utilities:**
- `gsd-tools.js` — CLI for config manipulation
- `notion-sync.js` — Notion API integration

## Feature Integration Architecture

### Feature 1: Quick Settings Shortcut

**Location:** `new-project.md` Step 6 (Workflow Preferences)

**Current flow:**
```
Step 6: Workflow Preferences
  ├─ Round 1 (Core workflow: 4 questions)
  │   ├─ Mode (YOLO/Interactive)
  │   ├─ Depth (Quick/Standard/Comprehensive)
  │   ├─ Plan Processing (Parallel/Sequential)
  │   └─ Git Tracking (Yes/No)
  ├─ Round 2 (Workflow agents: 4 questions)
  │   ├─ Research (Yes/No)
  │   ├─ Plan Check (Yes/No)
  │   ├─ Verifier (Yes/No)
  │   └─ Model Profile (Quality/Balanced/Budget)
  └─ Create config.json → commit
```

**Modified flow:**
```
Step 6: Workflow Preferences
  ├─ NEW: Pre-Round Gate
  │   └─ AskUserQuestion: "Use recommended settings or customize?"
  │       ├─ "Apply recommended" → skip to config creation
  │       └─ "Customize" → proceed to Round 1
  ├─ Round 1 (Core workflow: 4 questions)
  ├─ Round 2 (Workflow agents: 4 questions)
  └─ Create config.json → commit
```

**Integration points:**
- **File:** `get-shit-done/workflows/new-project.md`
- **Section:** Step 6 (lines ~336-467)
- **Modification:** Insert AskUserQuestion gate before Round 1
- **Recommended values:**
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
    }
  }
  ```

**Implementation approach:**
1. Add AskUserQuestion before Round 1
2. If "Apply recommended", populate config with defaults
3. If "Customize", run existing Round 1+2 logic (no change)

**Data flow:**
```
User response
    ↓
if "Apply recommended" → hardcoded JSON → skip to config.json write
if "Customize" → existing AskUserQuestion flow → config.json write
```

**No new components.** Pure workflow modification.

---

### Feature 2: Auto-Discuss Before Planning

**Location:** `plan-phase.md` Step 1-5 (before spawning planner)

**Current flow:**
```
Step 1: Initialize
Step 2: Parse Arguments
Step 3: Validate Phase
Step 4: Load CONTEXT.md (if exists)
Step 5: Handle Research (if needed)
Step 6: Check Existing Plans
Step 7: Use Context Files
Step 8: Spawn gsd-planner
```

**Modified flow:**
```
Step 1: Initialize
Step 2: Parse Arguments
Step 3: Validate Phase
Step 4: NEW: Check for CONTEXT.md
    ├─ If exists → load and proceed
    └─ If missing → offer auto-discuss
        ├─ AskUserQuestion: "Discuss phase first or plan directly?"
        │   ├─ "Discuss first (Recommended)" → run discuss-phase inline
        │   └─ "Plan directly" → proceed to Step 5
        └─ After discussion → reload CONTEXT.md
Step 5: Handle Research (if needed)
Step 6: Check Existing Plans
Step 7: Use Context Files (including new CONTEXT.md)
Step 8: Spawn gsd-planner
```

**Integration points:**
- **File:** `get-shit-done/workflows/plan-phase.md`
- **Section:** Between Step 3 and Step 4 (lines ~53-68)
- **Modification:** Insert CONTEXT.md check + discuss-phase invocation
- **Key decision:** Run discuss-phase inline (not redirect)

**Data flow:**
```
INIT JSON (from Step 1)
    ↓
has_context === false
    ↓
AskUserQuestion → if "Discuss first"
    ↓
Invoke discuss-phase.md workflow inline
    ↓
CONTEXT.md created
    ↓
Reload context_content from disk
    ↓
Pass to researcher, planner, checker (existing flow)
```

**Workflow invocation pattern:**
```markdown
**Run discuss-phase inline:**

Follow all steps from `discuss-phase.md`:
1. Initialize (with same $PHASE)
2. Check existing (will be "doesn't exist")
3. Analyze phase
4. Present gray areas
5. Discuss areas
6. Write CONTEXT.md
7. Commit CONTEXT.md

After completion, reload CONTEXT.md and continue to Step 5 (Research).
```

**Implications:**
- CONTEXT.md always created before planning (no more "missing context" issues)
- Researcher gets decisions (more focused research)
- Planner gets decisions (locked vs discretion clear)
- Auto-advance still works (discuss → plan → complete in one flow)

**No new files.** Pure orchestration change.

---

### Feature 3: Notion Sync Prompt After Planning

**Location:** `plan-phase.md` Step 14d (after phase complete, before next phase)

**Current flow:**
```
Step 14: Auto-Complete Phase
  ├─ 14a: Validate Phase
  ├─ 14b: Mark Phase Complete
  ├─ 14c: Commit Completion
  └─ 14d: Route to Next
      ├─ If milestone_complete → display "All Phases Complete" → STOP
      └─ If more phases → display "Auto-advancing" → loop to Step 1
```

**Modified flow:**
```
Step 14: Auto-Complete Phase
  ├─ 14a: Validate Phase
  ├─ 14b: Mark Phase Complete
  ├─ 14c: Commit Completion
  ├─ NEW: 14d: Check Notion Sync (if milestone_complete)
  │   └─ If Notion configured AND all phases complete
  │       ├─ AskUserQuestion: "Upload planning docs to Notion?"
  │       ├─ If "yes" → run `node bin/notion-sync.js sync --cwd $(pwd)`
  │       └─ If "skip" → continue
  └─ 14e: Route to Next
      ├─ If milestone_complete → display options → STOP
      └─ If more phases → display "Auto-advancing" → loop to Step 1
```

**Integration points:**
- **File:** `get-shit-done/workflows/plan-phase.md`
- **Section:** Step 14d (lines ~390-423)
- **Modification:** Insert Notion check before final routing
- **Key decision:** Only prompt when ALL phases complete (not per-phase)

**Notion detection logic:**
```bash
node -e "
const fs = require('fs');
const configPath = require('path').join(process.cwd(), '.planning', 'config.json');
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const hasKey = config.notion && config.notion.api_key && config.notion.api_key.trim() !== '';
  console.log(JSON.stringify({ configured: hasKey }));
} catch (e) {
  console.log(JSON.stringify({ configured: false }));
}
"
```

**Sync invocation:**
```bash
node bin/notion-sync.js sync --cwd "$(pwd)"
```

**Data flow:**
```
milestone_complete === true
    ↓
Read .planning/config.json
    ↓
config.notion.api_key exists?
    ↓ yes
AskUserQuestion
    ↓ "yes"
Run notion-sync.js
    ↓
Report results (created/updated/skipped)
    ↓
Continue to "All Phases Complete" message
```

**Error handling:**
- If sync fails → report error BUT continue (non-blocking)
- User can run `/gsd:sync-notion` manually later

**Reuse existing pattern:**
This matches `complete-milestone.md` Step "prompt_notion_sync" (lines 586-642).
Same logic, different trigger point (all phases vs milestone tag).

**No new files.** Workflow modification + existing CLI reuse.

---

### Feature 4: Notion Parent Page URL at Install

**Location:** `bin/install.js` promptNotionKey() function

**Current flow:**
```
install.js
  ├─ Install files
  ├─ Configure statusline
  └─ promptNotionKey() (lines 1492-1577)
      ├─ Ask: "Configure Notion integration? [y/N]"
      ├─ If yes → prompt for API key
      ├─ Validate key (secret_* or ntn_* prefix)
      ├─ Write to .planning/config.json
      │   {
      │     "notion": { "api_key": "..." }
      │   }
      └─ finishInstall()
```

**Modified flow:**
```
install.js
  ├─ Install files
  ├─ Configure statusline
  └─ promptNotionKey() (MODIFIED)
      ├─ Ask: "Configure Notion integration? [y/N]"
      ├─ If yes → prompt for API key
      ├─ Validate key (secret_* or ntn_* prefix)
      ├─ NEW: Prompt for parent page URL (optional)
      │   ├─ "Enter parent page URL (optional, press Enter to skip):"
      │   ├─ If provided → extract page ID from URL
      │   └─ Validate page ID format (32 chars hex or UUID)
      ├─ Write to .planning/config.json
      │   {
      │     "notion": {
      │       "api_key": "...",
      │       "parent_page_id": "..." (if provided)
      │     }
      │   }
      └─ finishInstall()
```

**Integration points:**
- **File:** `bin/install.js`
- **Function:** `promptNotionKey()` (lines 1492-1577)
- **Modification:** Add parent page URL prompt after API key validation

**Parent page ID extraction:**
```javascript
/**
 * Extract Notion page ID from URL
 * Supports formats:
 * - https://www.notion.so/Page-Title-<32-char-hex>
 * - https://www.notion.so/<32-char-hex>
 * - https://www.notion.so/workspace/Page-Title-<uuid>
 * - Raw page ID (32 chars hex or UUID)
 */
function extractPageId(input) {
  const trimmed = input.trim();

  // Match 32-char hex ID (with or without dashes)
  const hexMatch = trimmed.match(/([0-9a-f]{32})/i);
  if (hexMatch) return hexMatch[1];

  // Match UUID format
  const uuidMatch = trimmed.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (uuidMatch) return uuidMatch[1].replace(/-/g, '');

  return null;
}
```

**Validation:**
```javascript
// After extraction
if (pageId && pageId.length !== 32) {
  console.log(`  ${yellow}⚠${reset} Invalid page ID format. Skipping parent page configuration.`);
  pageId = null;
}
```

**Data flow:**
```
User enters URL
    ↓
extractPageId(url)
    ↓
Validate length === 32
    ↓
Write to config.notion.parent_page_id
    ↓
notion-sync.js reads config (existing behavior)
    ↓
Uses parent_page_id if present (existing lib/notion/hierarchy-builder.js)
```

**Reuse existing:**
- `lib/notion/hierarchy-builder.js` already supports parent_page_id
- `bin/notion-sync.js` already reads config.notion
- No new logic needed in Notion modules

**Optional field:**
- If user skips → config.notion.parent_page_id undefined
- Existing code handles undefined gracefully (creates pages at root)

**No new files.** Install.js modification only.

---

## Component Modifications Summary

| Component | File | Lines | Change Type | Complexity |
|-----------|------|-------|-------------|------------|
| new-project workflow | get-shit-done/workflows/new-project.md | ~336-340 | Insert AskUserQuestion gate | Low |
| plan-phase workflow | get-shit-done/workflows/plan-phase.md | ~53-68 | Insert CONTEXT.md check + discuss-phase inline | Medium |
| plan-phase workflow | get-shit-done/workflows/plan-phase.md | ~390-423 | Insert Notion sync check | Low |
| install script | bin/install.js | ~1520-1577 | Add parent page URL prompt + extraction | Low |

**No new files.** All changes are modifications to existing workflows and scripts.

## Data Flow: Feature Interactions

### Interaction 1: Quick Settings → Auto-Discuss

**Scenario:** User selects "Apply recommended" during setup

```
new-project.md Step 6
    ↓
Apply recommended → config.research = true
    ↓
new-project.md Step 7 → research runs
    ↓
User later runs /gsd:plan-phase 1
    ↓
plan-phase.md → no CONTEXT.md → offer discuss
    ↓
User can still discuss even with "recommended" settings
```

**Implication:** Quick settings don't skip discussion. They set workflow agents, not discussion behavior.

**Independence:** Features don't interfere.

---

### Interaction 2: Auto-Discuss → Notion Sync Prompt

**Scenario:** User discusses phase, plans phase, all phases complete

```
plan-phase.md Step 4
    ↓
No CONTEXT.md → offer discuss → CONTEXT.md created
    ↓
plan-phase.md Step 8 → planner uses CONTEXT.md
    ↓
plan-phase.md Step 14 → phase complete
    ↓
If milestone_complete → Notion sync prompt
    ↓
Sync includes all artifacts (CONTEXT.md, PLAN.md, etc.)
```

**Implication:** CONTEXT.md files are included in Notion sync (already supported).

**Integration:** discuss-phase creates files that notion-sync uploads. No new logic.

---

### Interaction 3: Notion Parent URL → Notion Sync Prompt

**Scenario:** User configured parent page at install, now syncing after all phases

```
install.js promptNotionKey()
    ↓
config.notion.parent_page_id = "abc123..."
    ↓
plan-phase.md Step 14d → Notion sync prompt
    ↓
notion-sync.js reads config.notion.parent_page_id
    ↓
hierarchy-builder.js creates pages under parent
```

**Implication:** Parent page is used automatically. No additional prompts needed.

**Reuse:** Existing hierarchy-builder logic.

---

## Build Order & Dependencies

### Phase Order Recommendation

**Phase 1: Quick Settings (standalone)**
- Modify new-project.md Step 6
- No dependencies on other features
- Can ship independently

**Phase 2: Notion Parent URL (standalone)**
- Modify install.js promptNotionKey()
- No dependencies on other features
- Can ship independently

**Phase 3: Auto-Discuss (depends on existing discuss-phase.md)**
- Modify plan-phase.md Step 4
- Requires discuss-phase.md to be stable (already is)
- No dependencies on Phase 1 or 2

**Phase 4: Notion Sync Prompt (depends on existing notion-sync.js)**
- Modify plan-phase.md Step 14d
- Requires notion-sync.js to be stable (already is)
- No dependencies on Phase 1, 2, or 3

**Parallelization:**
- Phases 1-4 can all be developed in parallel
- No shared code between features
- Each modifies different files/sections

**Integration testing order:**
1. Test each feature standalone
2. Test Interaction 1 (Quick Settings → Auto-Discuss)
3. Test Interaction 2 (Auto-Discuss → Notion Sync)
4. Test Interaction 3 (Notion Parent URL → Notion Sync)
5. Full flow test (all 4 features together)

---

## Configuration Schema Changes

### Current config.json schema

```json
{
  "mode": "yolo|interactive",
  "depth": "quick|standard|comprehensive",
  "parallelization": true|false,
  "commit_docs": true|false,
  "model_profile": "quality|balanced|budget",
  "workflow": {
    "research": true|false,
    "plan_check": true|false,
    "verifier": true|false
  },
  "notion": {
    "api_key": "secret_..."
  }
}
```

### Modified config.json schema (v1.2)

```json
{
  "mode": "yolo|interactive",
  "depth": "quick|standard|comprehensive",
  "parallelization": true|false,
  "commit_docs": true|false,
  "model_profile": "quality|balanced|budget",
  "workflow": {
    "research": true|false,
    "plan_check": true|false,
    "verifier": true|false
  },
  "notion": {
    "api_key": "secret_...",
    "parent_page_id": "abc123..." // NEW: optional
  }
}
```

**Only addition:** `config.notion.parent_page_id` (optional field)

**No removals, no renames.** Fully backward compatible.

---

## Sources

**Codebase analyzed:**
- `get-shit-done/workflows/new-project.md` (lines 1-1080)
- `get-shit-done/workflows/plan-phase.md` (lines 1-440)
- `get-shit-done/workflows/discuss-phase.md` (lines 1-409)
- `get-shit-done/workflows/complete-milestone.md` (lines 1-735)
- `bin/install.js` (lines 1-1832)
- `bin/gsd-tools.js` (config-set at line 5935)

**Existing patterns reused:**
- AskUserQuestion gate pattern (from multiple workflows)
- Notion sync invocation (from complete-milestone.md Step 586-642)
- Parent page ID usage (from lib/notion/hierarchy-builder.js)
- Config.json manipulation (from gsd-tools.js config-set)

**Confidence:** HIGH — all integration points verified against existing code

---

*Architecture research for: v1.2 Streamlined Workflow*
*Researched: 2026-02-12*
