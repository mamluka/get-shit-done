---
phase: 06-foundation-sdk-setup
plan: 01
subsystem: notion-integration
tags: [dependencies, security, configuration, sdk-setup]
dependency_graph:
  requires: []
  provides:
    - notion-sdk-dependencies
    - git-security-rules
    - install-flow-notion-prompt
    - sync-state-schema
  affects:
    - package.json
    - .gitignore
    - bin/install.js
    - lib/notion/sync-state.js
tech_stack:
  added:
    - "@notionhq/client@^5.9.0"
    - "@tryfabric/martian@^1.2.4"
  patterns:
    - notion-sync-state-management
    - readline-interactive-prompts
    - json-schema-validation
key_files:
  created:
    - .planning/.gitignore
    - lib/notion/sync-state.js
  modified:
    - package.json
    - package-lock.json
    - .gitignore
    - bin/install.js
decisions:
  - "Use @notionhq/client official SDK instead of raw HTTP calls"
  - "Double-layer .gitignore protection (both .planning/.gitignore and root .gitignore)"
  - "Synchronous fs operations in sync-state.js to match existing codebase patterns"
  - "Optional, non-blocking Notion prompt in install flow"
metrics:
  duration: "2m 50s"
  completed_date: "2026-02-11"
  task_count: 3
  commit_count: 3
---

# Phase 6 Plan 1: Foundation SDK Setup Summary

**Install Notion SDK dependencies, enforce git security for sensitive config, extend npx install flow with API key prompt, and define notion-sync.json tracking schema**

## What Was Built

This plan established the dependency, security, and configuration foundation that all subsequent Notion phases build on. Without this, no Notion API calls can be made and tokens risk leaking into git.

**Key Deliverables:**
1. **Notion SDK Dependencies** - Added @notionhq/client (official Notion SDK) and @tryfabric/martian (markdown-to-Notion converter) as the first external production dependencies for GSD
2. **Git Security** - Created .planning/.gitignore and extended root .gitignore to prevent config.json and notion-sync.json from being committed; untracked previously-committed config.json
3. **Install Flow Integration** - Extended bin/install.js with optional Notion API key prompt that validates key format (secret_/ntn_ prefix), saves to .planning/config.json, and gracefully handles skip/decline
4. **Sync State Management** - Created lib/notion/sync-state.js module with 7 exported functions (init/load/save, get/set project state, get/set page ID) managing .planning/notion-sync.json schema

## Task Execution

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Install Notion SDK dependencies and enforce .gitignore security | 0ae8e36 | Complete |
| 2 | Add Notion API key prompt to npx install flow | d8d1f25 | Complete |
| 3 | Create notion-sync.json schema and state management module | acb6d8d | Complete |

### Task 1: Install Notion SDK dependencies and enforce .gitignore security

**Files:** package.json, package-lock.json, .gitignore, .planning/.gitignore

**What was done:**
- Ran `npm install @notionhq/client @tryfabric/martian` to add production dependencies (first external deps for GSD)
- Created `.planning/.gitignore` with entries for config.json and notion-sync.json
- Extended root `.gitignore` with double-protection entries for .planning/config.json and .planning/notion-sync.json
- Untracked previously-committed .planning/config.json using `git rm --cached` (file remains on disk)
- Verified git ignores both files using `git check-ignore`

**Verification:** Both dependencies appear in package.json; both files return paths when checked via `git check-ignore`

### Task 2: Add Notion API key prompt to npx install flow

**Files:** bin/install.js

**What was done:**
- Created `promptNotionKey()` function with readline-based interactive prompt
- Added "Would you like to configure Notion integration? [y/N]" optional step
- Implemented key validation: must start with `secret_` or `ntn_` (Notion token prefixes)
- Added retry logic (2 attempts) for invalid format with user-friendly error messages
- Integrated prompt into `finishInstall()` before final completion message using callback pattern
- Gracefully skips if .planning/ doesn't exist (not in a GSD project) or non-interactive terminal
- Saves valid keys to .planning/config.json in `notion` section, merging with existing config

**Verification:** `echo "N" | node bin/install.js --claude --local` completes without error; grep confirms notion code exists in install.js

### Task 3: Create notion-sync.json schema and state management module

**Files:** lib/notion/sync-state.js, package.json

**What was done:**
- Created lib/notion/ directory structure at repo root
- Implemented sync-state.js with 7 exported functions:
  - `initSyncState(cwd)` - Creates fresh notion-sync.json with default schema (version: 1, workspace_page_id: null, projects: {})
  - `loadSyncState(cwd)` - Reads and parses .planning/notion-sync.json, calls initSyncState if missing
  - `saveSyncState(cwd, state)` - Writes state with schema validation (requires version, workspace_page_id, projects keys)
  - `getProjectState(state, projectSlug)` - Returns project entry or null
  - `setProjectState(state, projectSlug, projectState)` - Sets project entry, creates intermediate objects
  - `getPageId(state, projectSlug, filePath)` - Looks up file-to-page-ID mapping
  - `setPageId(state, projectSlug, filePath, pageId)` - Sets mapping, creates intermediate objects
- Used synchronous fs operations (readFileSync, writeFileSync) to match existing codebase patterns (gsd-tools.js)
- Added JSDoc comments with @param and @return types for all functions
- Added `lib` to package.json files array for npm distribution

**Project state schema:**
```json
{
  "root_page_id": null,
  "phase_pages": {},
  "doc_pages": {}
}
```

**Verification:** Module loads without error; initSyncState produces valid JSON; package.json includes "lib" in files array

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

- [x] @notionhq/client and @tryfabric/martian in package.json dependencies
- [x] .planning/config.json and .planning/notion-sync.json are git-ignored at two levels
- [x] bin/install.js has optional Notion API key prompt with validation
- [x] lib/notion/sync-state.js manages notion-sync.json CRUD with defined schema
- [x] package.json files array includes lib for npm distribution

## Technical Details

**Notion SDK Choice:**
- @notionhq/client v5.9.0: Official SDK from Notion, handles auth, pagination, rate limiting
- @tryfabric/martian v1.2.4: Markdown-to-Notion block converter (dependency chain includes @notionhq/client v1.0.4)

**Git Security Implementation:**
- Double-layer protection: both .planning/.gitignore and root .gitignore entries
- Handles previously-tracked files: untracked .planning/config.json while preserving file on disk
- Verification: `git check-ignore` confirms both files ignored (exit code 0)

**Install Flow Integration:**
- Non-blocking: skips gracefully in non-interactive terminals or when .planning/ doesn't exist
- Validation: Notion tokens use `secret_` (internal integrations) or `ntn_` prefixes
- User experience: 2 retry attempts with clear error messages, optional skip, confirmation message
- Config merge: reads existing .planning/config.json, merges notion section, writes back with formatting

**Sync State Module:**
- Synchronous design: matches existing GSD codebase patterns (gsd-tools.js fully synchronous)
- Schema validation: saveSyncState enforces top-level keys before writing
- Defensive coding: creates intermediate objects in setPageId, handles missing files in loadSyncState
- Documentation: JSDoc comments on all exports for IDE autocomplete

## Self-Check: PASSED

**Files created:**
- .planning/.gitignore: FOUND
- lib/notion/sync-state.js: FOUND

**Commits exist:**
- 0ae8e36: FOUND (chore(06-01): install Notion SDK and enforce git security)
- d8d1f25: FOUND (feat(06-01): add Notion API key prompt to install flow)
- acb6d8d: FOUND (feat(06-01): create notion-sync.json state management module)

**Verification commands:**
- npm ls @notionhq/client @tryfabric/martian: Both installed
- git check-ignore: Both files ignored
- grep notion bin/install.js: Found 3 instances
- require('./lib/notion/sync-state.js'): Loads without error
- package.json files array: Includes "lib"

All verification criteria passed.
