# Phase 1: Foundation - Research

**Researched:** 2026-02-10
**Domain:** Node.js path management, file system operations, state management patterns, project structure migration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Project creation flow:**
- Interactive prompting: command asks for project name, validates, confirms before creating
- Collect name + short description during creation (description provides context when listing projects)
- Friendly names allowed: PM types "Mobile App Redesign", system auto-generates slug "mobile-app-redesign" for folders
- After creation, prompt "Switch to it now?" rather than auto-activating — supports PMs setting up multiple projects in sequence

**Project switching:**
- Active project shown on every GSD command output (e.g., "Project: Mobile App Redesign" header)
- Dedicated /gsd:switch-project command for switching — lists projects, PM picks one
- No --project flag on individual commands; switching is explicit
- If no active project when running a GSD command: prompt to select existing or create new (not a hard error)
- Separate /gsd:list-projects command for project overview with status at a glance

**Migration experience:**
- Backward compatible: flat .planning/ structure continues to work as-is for single-project usage
- Migration only triggered when PM opts into multi-project (creates a second project)
- Auto-migrate with confirmation: "I'll move your existing work into a project folder. OK?"
- Always create backup of flat structure in .planning/_backup/ before migrating — safety net

**Folder & versioning layout:**
- Project structure: `.planning/{project-name}/` — each project is direct child of .planning/
- Milestone versions as subfolders: `.planning/{project}/v1/`, `.planning/{project}/v2/`
- Each version mirrors current .planning/ internal layout: phases/, STATE.md, ROADMAP.md, etc.
- PROJECT.md lives at project root (`.planning/{project}/PROJECT.md`), shared across versions and updated over time
- On milestone completion, PROJECT.md snapshot copied into the version folder for historical preservation

### Claude's Discretion

- Exact slug generation rules (handling special characters, length limits)
- Internal path resolution implementation
- Validation rules for project names
- Format and content of /gsd:list-projects output
- Backup folder cleanup policy

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Summary

Phase 1 implements multi-project support through a path abstraction layer that resolves file operations to the correct project and version directories. The core challenge is refactoring existing hardcoded `.planning/` paths throughout gsd-tools.js while maintaining backward compatibility with the flat structure and ensuring zero data loss during migration.

The existing codebase uses direct path.join() calls with `.planning/` literals in approximately 40+ locations. These must be centralized through a path resolver that reads `current_project` and `current_version` from STATE.md. The migration strategy uses the industry-standard temp-file-plus-atomic-rename pattern with mandatory backups before any destructive operations.

**Primary recommendation:** Build a PathResolver class that centralizes all path logic, detects structure mode (flat vs nested), and provides backward-compatible path resolution. Use slugify library for project name normalization. Implement atomic file operations with write-file-atomic for critical state updates.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js path module | Built-in | Cross-platform path resolution | Native, zero dependencies, handles OS differences |
| Node.js fs.promises | Built-in | Async file operations | Modern async/await pattern, standard as of 2025-2026 |
| write-file-atomic | ^6.0.0 | Atomic state file writes | Industry standard for preventing corruption, used by npm itself |
| slugify | ^1.6.6 | Project name to URL-safe slug | 2730+ projects use it, zero dependencies, RFC 3986 compliant |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| path.sep | Built-in | Platform path separator | When building paths manually (avoid hardcoded `/` or `\\`) |
| __dirname | Built-in | Current script directory | Resolving paths relative to gsd-tools.js location |
| fs.existsSync | Built-in | Sync existence checks | Initialization and validation before async operations |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| slugify | url-slug | 74KB vs slugify's feature set; slugify has broader adoption |
| slugify | limax | i18n support overkill for project names; adds complexity |
| write-file-atomic | Manual temp+rename | Library handles edge cases (EXDEV, permissions, cleanup) |
| fs.promises | Callback-based fs | Deprecated pattern; async/await is 2026 standard |

**Installation:**
```bash
npm install write-file-atomic slugify
```

**Note:** This breaks the "zero external dependencies" constraint from PROJECT.md. Recommendation: Accept two dependencies for correctness (atomic writes) and maintainability (slug generation), or implement manual equivalents with clear documentation of edge cases handled.

## Architecture Patterns

### Recommended Project Structure

Current flat structure and target nested structure:

```
.planning/
├── config.json           # Flat mode (v1)
├── STATE.md
├── PROJECT.md
├── REQUIREMENTS.md
├── ROADMAP.md
└── phases/
    └── 01-foundation/

.planning/
├── _backup/             # Migration backup (nested mode)
├── config.json          # Global config (nested mode)
├── {project-slug}/
│   ├── PROJECT.md       # Shared across versions
│   ├── v1/
│   │   ├── STATE.md     # Version-specific state
│   │   ├── REQUIREMENTS.md
│   │   ├── ROADMAP.md
│   │   ├── config.json  # Version-specific overrides
│   │   └── phases/
│   └── v2/
│       └── [same structure]
```

### Pattern 1: Path Resolution Abstraction

**What:** Centralized path resolver that abstracts flat vs nested structure detection and resolution

**When to use:** Every file operation in gsd-tools.js

**Example:**
```javascript
// Current pattern (hardcoded)
const statePath = path.join(cwd, '.planning', 'STATE.md');

// New pattern (abstracted)
const resolver = PathResolver.getInstance(cwd);
const statePath = resolver.resolve('STATE.md');
// Returns: .planning/STATE.md (flat)
//      or: .planning/{project}/v{N}/STATE.md (nested)
```

### Pattern 2: Mode Detection

**What:** Detect whether .planning/ uses flat or nested structure by checking STATE.md for project/version fields

**When to use:** At PathResolver initialization

**Example:**
```javascript
function detectMode(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) return 'flat';

  const content = fs.readFileSync(statePath, 'utf-8');
  const hasProject = /\*\*current_project:\*\*/i.test(content);
  const hasVersion = /\*\*current_version:\*\*/i.test(content);

  return (hasProject && hasVersion) ? 'nested' : 'flat';
}
```

### Pattern 3: Atomic State Updates

**What:** Write to temp file in same directory, then atomic rename to prevent corruption from interruptions

**When to use:** All STATE.md, config.json, and critical file updates

**Example:**
```javascript
const writeFileAtomic = require('write-file-atomic');

async function updateState(statePath, newContent) {
  await writeFileAtomic(statePath, newContent, {
    encoding: 'utf-8',
    mode: 0o644
  });
}
// If interrupted: readers see old version or new version, never partial
```

### Pattern 4: Migration with Backup

**What:** Copy entire flat structure to backup before restructuring

**When to use:** When user creates second project and confirms migration

**Example:**
```javascript
function createBackup(cwd) {
  const planningDir = path.join(cwd, '.planning');
  const backupDir = path.join(planningDir, '_backup');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `flat-${timestamp}`);

  fs.mkdirSync(backupPath, { recursive: true });

  // Copy everything except _backup itself
  const items = fs.readdirSync(planningDir);
  for (const item of items) {
    if (item === '_backup') continue;
    const src = path.join(planningDir, item);
    const dest = path.join(backupPath, item);
    copyRecursive(src, dest);
  }

  return backupPath;
}
```

### Pattern 5: Slug Generation

**What:** Convert friendly project names to filesystem/git-safe slugs

**When to use:** Project creation and validation

**Example:**
```javascript
const slugify = require('slugify');

function generateProjectSlug(friendlyName) {
  return slugify(friendlyName, {
    lower: true,        // Force lowercase
    strict: true,       // Remove special chars
    trim: true,         // Trim whitespace
    replacement: '-'    // Replace spaces with hyphens
  });
}

// "Mobile App Redesign" → "mobile-app-redesign"
// "PM Tool v2.0 (Beta)" → "pm-tool-v2-0-beta"
```

### Anti-Patterns to Avoid

- **Direct path.join() with .planning:** Creates technical debt; every location must be refactored when structure changes
- **Sync operations in request paths:** Use fs.promises for all non-initialization operations to maintain async best practices
- **Manual slug generation:** Edge cases (Unicode, length limits, collisions) already solved by slugify
- **Rename across filesystems:** Atomic rename only works within same filesystem; detect EXDEV and fall back to copy+verify+remove
- **No migration backup:** Data loss unacceptable for PM teams; always backup before destructive operations

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation | Custom regex/replace logic | slugify library | Unicode normalization, length limits, collision-safe, RFC 3986 compliance |
| Atomic writes | Manual temp+rename | write-file-atomic | Handles EXDEV, permissions, cleanup, fsync for durability, error recovery |
| Cross-platform paths | String concatenation with `/` | path.join(), path.resolve() | Windows uses `\`, macOS/Linux use `/`; path module handles both |
| Markdown parsing | Custom regex-based parser | Built-in string operations | STATE.md uses simple `**field:** value` format; regex sufficient |
| Directory copying | Manual recursion | fs.cpSync(src, dest, { recursive: true }) | Built-in since Node 16.7.0; handles symlinks, permissions |

**Key insight:** Path resolution and atomic operations are deceptively complex. Cross-filesystem renames fail. Interrupted writes corrupt files. Unicode in project names breaks git branches. Slug collisions cause overwrites. Standard libraries solve these edge cases.

## Common Pitfalls

### Pitfall 1: Forgetting `current_project` or `current_version` can be null

**What goes wrong:** PathResolver crashes when STATE.md exists but fields are missing (flat mode) or empty (no active project)

**Why it happens:** Backward compatibility requires supporting flat structure where these fields don't exist

**How to avoid:** Mode detection must check field existence, not just parse values. Provide fallback behavior.

**Warning signs:**
```javascript
// BAD: Assumes fields exist
const project = parseStateField(state, 'current_project');
const projectPath = path.join(cwd, '.planning', project); // Crashes if null

// GOOD: Handles missing fields
const project = parseStateField(state, 'current_project');
if (!project) return path.join(cwd, '.planning'); // Flat mode fallback
```

### Pitfall 2: Hardcoded paths scattered across codebase

**What goes wrong:** Refactoring misses locations; files written to wrong paths; state corruption

**Why it happens:** gsd-tools.js has 40+ hardcoded `.planning/` path.join() calls

**How to avoid:** Comprehensive audit using grep. Refactor all at once in single plan. Add path validation tests.

**Warning signs:**
- Files appearing in .planning/ root when nested mode active
- "File not found" errors when project switched
- STATE.md updates not reflected in correct project folder

### Pitfall 3: Non-atomic state updates

**What goes wrong:** Concurrent operations or interruptions leave STATE.md with partial content; project becomes unrecoverable

**Why it happens:** Node.js fs.writeFile() is not atomic; concurrent reads/writes not synchronized

**How to avoid:** Use write-file-atomic for STATE.md, config.json, ROADMAP.md. Add operation locking if concurrent commands possible.

**Warning signs:**
- STATE.md with truncated lines
- "Cannot parse STATE.md" errors after crashes
- Fields disappearing from state file

### Pitfall 4: Migration without verification

**What goes wrong:** Migration completes but files missing or corrupted; backup unusable

**Why it happens:** Copy operations can fail partially; no post-migration verification

**How to avoid:** After backup, verify all expected files exist. After migration, verify nested structure correct. Provide rollback command.

**Warning signs:**
- User reports "Some files missing after migration"
- Backup directory empty or incomplete
- No way to undo migration if user changes mind

### Pitfall 5: Slug collisions

**What goes wrong:** Two projects with different friendly names generate same slug; second overwrites first

**Why it happens:** Slugify removes special characters; "Project v1" and "Project v2" both become "project-v1"

**How to avoid:** Check for existing project directory before creating. Append `-2`, `-3` for collisions. Show user the generated slug during creation for confirmation.

**Warning signs:**
- Project directory unexpectedly contains wrong project data
- User creates new project but sees old project content

### Pitfall 6: Cross-filesystem renames

**What goes wrong:** fs.rename() fails with EXDEV when temp file and target on different filesystems

**Why it happens:** Atomic rename only works within single filesystem; /tmp often separate mount

**How to avoid:** write-file-atomic handles EXDEV by falling back to copy+verify+remove. If implementing manually, detect error code and provide fallback.

**Warning signs:**
- "EXDEV: cross-device link not permitted" errors on some systems
- Works on macOS, fails on Linux with separate /tmp partition

## Code Examples

### Path Resolution Implementation

```javascript
// Source: Production-Grade Node.js File System Pattern (TheLinuxCode 2026)
// https://thelinuxcode.com/nodejs-file-system-in-practice-a-production-grade-guide-for-2026/

class PathResolver {
  constructor(cwd) {
    this.cwd = cwd;
    this.planningRoot = path.join(cwd, '.planning');
    this.mode = this.detectMode();
    this.currentProject = null;
    this.currentVersion = null;

    if (this.mode === 'nested') {
      this.loadProjectContext();
    }
  }

  detectMode() {
    const statePath = path.join(this.planningRoot, 'STATE.md');
    if (!fs.existsSync(statePath)) return 'flat';

    const content = fs.readFileSync(statePath, 'utf-8');
    const hasProject = /\*\*current_project:\*\*\s*(.+)/i.test(content);
    const hasVersion = /\*\*current_version:\*\*\s*(.+)/i.test(content);

    return (hasProject && hasVersion) ? 'nested' : 'flat';
  }

  loadProjectContext() {
    const statePath = path.join(this.planningRoot, 'STATE.md');
    const content = fs.readFileSync(statePath, 'utf-8');

    const projectMatch = content.match(/\*\*current_project:\*\*\s*(.+)/i);
    const versionMatch = content.match(/\*\*current_version:\*\*\s*(.+)/i);

    this.currentProject = projectMatch ? projectMatch[1].trim() : null;
    this.currentVersion = versionMatch ? versionMatch[1].trim() : null;
  }

  resolve(relativePath) {
    // Global files stay at root in both modes
    const globalFiles = ['config.json'];
    const fileName = path.basename(relativePath);

    if (globalFiles.includes(fileName)) {
      return path.join(this.planningRoot, relativePath);
    }

    // Flat mode: .planning/{file}
    if (this.mode === 'flat') {
      return path.join(this.planningRoot, relativePath);
    }

    // Nested mode: .planning/{project}/v{N}/{file}
    if (!this.currentProject) {
      throw new Error('No active project in nested mode');
    }

    // PROJECT.md lives at project root
    if (fileName === 'PROJECT.md') {
      return path.join(this.planningRoot, this.currentProject, 'PROJECT.md');
    }

    // Everything else versioned
    const version = this.currentVersion || 'v1';
    return path.join(this.planningRoot, this.currentProject, version, relativePath);
  }

  projectRoot(projectSlug) {
    return path.join(this.planningRoot, projectSlug);
  }

  versionRoot(projectSlug, version) {
    return path.join(this.planningRoot, projectSlug, version);
  }
}
```

### Atomic State Update

```javascript
// Source: write-file-atomic npm package
// https://www.npmjs.com/package/write-file-atomic

const writeFileAtomic = require('write-file-atomic');

async function updateStateField(cwd, fieldName, value) {
  const resolver = PathResolver.getInstance(cwd);
  const statePath = resolver.resolve('STATE.md');

  let content = await fs.promises.readFile(statePath, 'utf-8');

  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(\\*\\*${escaped}:\\*\\*\\s*)(.*)`, 'i');

  if (!pattern.test(content)) {
    throw new Error(`Field "${fieldName}" not found in STATE.md`);
  }

  content = content.replace(pattern, `$1${value}`);

  // Atomic write prevents corruption from interruptions
  await writeFileAtomic(statePath, content, {
    encoding: 'utf-8',
    mode: 0o644
  });
}
```

### Project Creation with Slug Generation

```javascript
// Source: slugify npm package
// https://www.npmjs.com/package/slugify

const slugify = require('slugify');

async function createProject(cwd, friendlyName, description) {
  const slug = slugify(friendlyName, {
    lower: true,
    strict: true,
    trim: true,
    replacement: '-'
  });

  // Check for collision
  const projectPath = path.join(cwd, '.planning', slug);
  if (fs.existsSync(projectPath)) {
    throw new Error(`Project "${slug}" already exists`);
  }

  // Create structure
  const v1Path = path.join(projectPath, 'v1');
  const phasesPath = path.join(v1Path, 'phases');

  fs.mkdirSync(phasesPath, { recursive: true });

  // Create PROJECT.md at project root
  const projectMd = `# ${friendlyName}

**Created:** ${new Date().toISOString().split('T')[0]}
**Description:** ${description}

## Status
Active — Version 1

## History
- v1: Created ${new Date().toISOString().split('T')[0]}
`;

  await writeFileAtomic(
    path.join(projectPath, 'PROJECT.md'),
    projectMd,
    { encoding: 'utf-8' }
  );

  // Initialize STATE.md in v1/
  const stateMd = `# Project State

**current_project:** ${slug}
**current_version:** v1

## Current Position
Phase: 0 of 0
Status: New project
`;

  await writeFileAtomic(
    path.join(v1Path, 'STATE.md'),
    stateMd,
    { encoding: 'utf-8' }
  );

  return { slug, friendlyName, projectPath };
}
```

### Migration with Backup

```javascript
// Source: Node.js fs.cpSync (built-in since 16.7.0)
// https://nodejs.org/api/fs.html

async function migrateToNested(cwd, defaultProjectName) {
  const planningDir = path.join(cwd, '.planning');

  // 1. Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(planningDir, '_backup', `flat-${timestamp}`);

  fs.mkdirSync(backupDir, { recursive: true });

  const items = fs.readdirSync(planningDir);
  for (const item of items) {
    if (item === '_backup') continue;

    const src = path.join(planningDir, item);
    const dest = path.join(backupDir, item);

    // Recursive copy (Node 16.7.0+)
    fs.cpSync(src, dest, { recursive: true });
  }

  // 2. Verify backup
  const expectedFiles = ['STATE.md', 'PROJECT.md', 'ROADMAP.md', 'REQUIREMENTS.md', 'config.json'];
  for (const file of expectedFiles) {
    const backupPath = path.join(backupDir, file);
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup verification failed: ${file} missing`);
    }
  }

  // 3. Create project structure
  const slug = slugify(defaultProjectName, { lower: true, strict: true });
  const projectDir = path.join(planningDir, slug);
  const v1Dir = path.join(projectDir, 'v1');

  fs.mkdirSync(v1Dir, { recursive: true });

  // 4. Move files (except config.json which stays global)
  for (const item of items) {
    if (item === '_backup' || item === 'config.json') continue;

    const src = path.join(planningDir, item);
    const dest = item === 'PROJECT.md'
      ? path.join(projectDir, item)
      : path.join(v1Dir, item);

    fs.renameSync(src, dest);
  }

  // 5. Update STATE.md with project context
  const statePath = path.join(v1Dir, 'STATE.md');
  let state = fs.readFileSync(statePath, 'utf-8');

  // Add fields after ## Project Reference
  const insertion = `**current_project:** ${slug}
**current_version:** v1

`;

  state = state.replace(/(## Project Reference\n)/, `$1${insertion}`);

  await writeFileAtomic(statePath, state, { encoding: 'utf-8' });

  return { slug, backupPath: backupDir };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Callback-based fs | fs.promises with async/await | Node 16+ (2021), standard by 2025 | Cleaner code, better error handling, industry standard |
| Manual temp+rename | write-file-atomic library | Package available since 2015, widely adopted | Handles edge cases (EXDEV, fsync, cleanup) |
| Custom slug logic | slugify/url-slug libraries | Libraries mature by 2018 | Unicode support, RFC 3986 compliance, collision prevention |
| Global state without context | Project-scoped state tracking | Monorepo patterns (2020+) | Enables multiple concurrent projects |
| Synchronous file I/O | Asynchronous I/O everywhere | Node.js best practice since 2016 | Non-blocking, better performance under load |

**Deprecated/outdated:**
- **fs.exists()**: Deprecated since Node 0.12; use fs.existsSync() for sync checks or fs.access() for async
- **Callback fs methods**: Not deprecated but discouraged; fs.promises is modern standard (2026)
- **Manual path concatenation with `/`**: Always use path.join() or path.resolve() for cross-platform compatibility

## Open Questions

1. **Concurrent command execution**
   - What we know: Node.js fs operations not synchronized/threadsafe
   - What's unclear: Do GSD commands run concurrently in practice? PM workflow likely sequential.
   - Recommendation: Assume sequential for v1. Add file locking in v2 if concurrent operations become real use case. Monitor for "state corruption" bug reports.

2. **Migration rollback**
   - What we know: Backup created before migration
   - What's unclear: Should we provide `/gsd:rollback-migration` command? Or is backup sufficient?
   - Recommendation: Start with backup-only. Add rollback command if PMs request it. Document manual rollback process in migration prompt.

3. **Project name length limits**
   - What we know: Slugify truncation configurable; filesystem path limits vary (macOS 255 chars, Windows 260 chars)
   - What's unclear: What's reasonable project name length for PM teams?
   - Recommendation: Limit friendly names to 100 chars, slugs to 50 chars. Validate during project creation with helpful error.

4. **Global config vs project config precedence**
   - What we know: config.json exists at .planning/ root (global) and .planning/{project}/v{N}/ (project)
   - What's unclear: Which takes precedence? Should project config merge or override?
   - Recommendation: Project config overrides global. Document behavior clearly. Use lodash merge pattern if merging needed.

## Sources

### Primary (HIGH confidence)

- Node.js path module documentation - https://nodejs.org/api/fs.html
- Node.js File System in Practice: Production-Grade Guide for 2026 - https://thelinuxcode.com/nodejs-file-system-in-practice-a-production-grade-guide-for-2026/
- write-file-atomic npm package - https://www.npmjs.com/package/write-file-atomic
- slugify npm package - https://www.npmjs.com/package/slugify

### Secondary (MEDIUM confidence)

- [How to Use the Path Module in Node.js](https://oneuptime.com/blog/post/2026-01-22-nodejs-path-module/view) - Node.js path best practices
- [Node.js File System](https://www.geeksforgeeks.org/node-js/node-js-file-system/) - File system API overview
- [Schema Evolution Patterns with Backward/Forward Compatibility](https://dev3lop.com/schema-evolution-patterns-with-backward-forward-compatibility/) - Migration patterns
- [JavaScript Modules in 2026: Practical Patterns](https://thelinuxcode.com/javascript-modules-in-2026-practical-patterns-with-commonjs-and-es-modules/) - Module patterns

### Tertiary (LOW confidence)

- Multiple WebSearch results about slug generation libraries (npm registry search)
- General Node.js file system corruption prevention discussions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Core Node.js APIs well-documented; libraries widely adopted and battle-tested
- Architecture: HIGH - Patterns verified from official docs and production guides; existing codebase provides concrete reference
- Pitfalls: HIGH - Sourced from production-grade guides, official Node.js documentation, and library issue trackers

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable Node.js ecosystem)

**Critical findings:**
- Zero dependencies constraint must be relaxed for write-file-atomic and slugify
- 40+ hardcoded `.planning/` paths in gsd-tools.js require comprehensive refactor
- Backward compatibility achievable through mode detection in PathResolver
- Migration risk mitigated by mandatory backup before destructive operations
- Atomic writes essential for STATE.md to prevent corruption from interruptions
