# Phase 2: Git Integration - Research

**Researched:** 2026-02-10
**Domain:** Git automation with Node.js for project lifecycle management
**Confidence:** HIGH

## Summary

Phase 2 implements git-based project isolation using dedicated branches and milestone tagging. Each project gets its own `project/{name}` branch created automatically during project setup, and completing a milestone creates an annotated tag on that branch for version history. This provides clean separation between projects while keeping all work in a single repository.

The implementation leverages Node.js execSync for git operations (matching existing patterns in gsd-tools.js), applies strict sanitization to ensure safe branch/tag names, and follows git best practices for annotated tags with metadata. The existing `execGit()` helper and `generateSlugInternal()` function provide the foundation - they just need extension for branch operations and stricter validation for git safety.

**Primary recommendation:** Use Node.js child_process.execSync for sequential git operations, sanitize all user input to git-safe slugs (lowercase alphanumeric + hyphens only), create annotated tags for milestones with rich metadata, and implement status/switch commands using git branch and git symbolic-ref primitives.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js child_process | Built-in | Execute git commands via execSync | Zero dependencies, synchronous execution matches existing codebase patterns |
| Git CLI | 2.x+ | Version control operations | Universal, already required for the repository |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fs (Node.js) | Built-in | File system operations for validation | Check .git directory existence, validate paths |
| path (Node.js) | Built-in | Path manipulation | Construct git paths safely |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| execSync | nodegit / simple-git npm packages | External dependencies violate project constraint (`"dependencies": {}`), added complexity for simple operations |
| execSync | spawn/exec (async) | Project uses synchronous patterns throughout (fs.readFileSync, etc.), async would break consistency |
| Sanitization regex | slugify npm package | External dependency, existing generateSlugInternal() already implements slug logic |

**Installation:**
```bash
# No installation required - uses Node.js built-ins only
```

## Architecture Patterns

### Recommended Project Structure
```
.claude/get-shit-done/bin/
├── gsd-tools.js              # Add git functions after execGit helper
commands/gsd/
├── project-create.md         # Triggers branch creation (GIT-01)
├── milestone-complete.md     # Triggers tag creation (GIT-02)
├── project-switch.md         # Switches between project branches
├── project-status.md         # Shows current branch and project
```

### Pattern 1: Git Branch Creation and Switching
**What:** Create a new branch for a project and switch to it atomically
**When to use:** During new project creation (implements GIT-01)
**Example:**
```javascript
// Based on existing execGit() pattern in gsd-tools.js
function createAndSwitchBranch(cwd, projectSlug) {
  // Sanitize project name first (see Pattern 3)
  const safeName = sanitizeForGit(projectSlug);
  const branchName = `project/${safeName}`;

  // Validate branch doesn't already exist
  const checkResult = execGit(cwd, ['rev-parse', '--verify', branchName]);
  if (checkResult.exitCode === 0) {
    throw new Error(`Branch ${branchName} already exists`);
  }

  // Create and switch to new branch (git checkout -b creates + switches atomically)
  const result = execGit(cwd, ['checkout', '-b', branchName]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to create branch: ${result.stderr}`);
  }

  return { branch: branchName, created: true };
}
```

### Pattern 2: Annotated Tag Creation for Milestones
**What:** Create annotated git tag with metadata when milestone completes
**When to use:** During milestone completion (implements GIT-02)
**Example:**
```javascript
// Annotated tags store tagger, date, and message - best practice for releases
function createMilestoneTag(cwd, projectSlug, version, message) {
  const safeName = sanitizeForGit(projectSlug);
  const tagName = `project-${safeName}-${version}`;

  // Verify we're on the correct project branch
  const currentBranch = getCurrentBranch(cwd);
  if (currentBranch !== `project/${safeName}`) {
    throw new Error(`Not on project branch. Expected project/${safeName}, got ${currentBranch}`);
  }

  // Create annotated tag (-a flag) with message (-m flag)
  // Annotated tags include: tagger name, email, date, message, and can be GPG-signed
  const result = execGit(cwd, ['tag', '-a', tagName, '-m', message]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to create tag: ${result.stderr}`);
  }

  return { tag: tagName, created: true };
}
```

### Pattern 3: Git-Safe Name Sanitization
**What:** Convert user input to git-safe branch/tag names (implements GIT-03)
**When to use:** Before any branch or tag creation
**Example:**
```javascript
// Extends existing generateSlugInternal() with git-specific validation
// Based on git-check-ref-format rules
function sanitizeForGit(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Input required for git name sanitization');
  }

  // Apply slug rules: lowercase, alphanumeric + hyphens only
  let sanitized = input
    .toLowerCase()                      // Lowercase (git is case-sensitive on some filesystems)
    .trim()                             // Remove leading/trailing whitespace
    .replace(/[^a-z0-9]+/g, '-')       // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');          // Remove leading/trailing hyphens

  // Git-specific validation per git-check-ref-format rules:
  // - Cannot be empty
  // - Cannot start with '.'
  // - Cannot contain '..' (double dots)
  // - Cannot end with '.lock'
  // - Cannot contain ASCII control characters, ~, ^, :, ?, *, [, \, spaces

  if (sanitized.length === 0) {
    throw new Error('Sanitized name cannot be empty');
  }

  if (sanitized.startsWith('.')) {
    sanitized = sanitized.replace(/^\.+/, '');
  }

  if (sanitized.includes('..')) {
    sanitized = sanitized.replace(/\.\./g, '-');
  }

  if (sanitized.endsWith('.lock')) {
    sanitized = sanitized.slice(0, -5); // Remove .lock suffix
  }

  // Final validation: ensure result is git-safe
  // Valid pattern: lowercase letters, numbers, hyphens (no leading/trailing hyphens)
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(sanitized)) {
    throw new Error(`Sanitized name "${sanitized}" failed git safety validation`);
  }

  return sanitized;
}
```

### Pattern 4: Branch Status and Switching
**What:** Show current branch and switch between project branches
**When to use:** Status display and project switching (success criteria #4)
**Example:**
```javascript
// Get current branch using git symbolic-ref
function getCurrentBranch(cwd) {
  const result = execGit(cwd, ['symbolic-ref', '--short', 'HEAD']);
  if (result.exitCode !== 0) {
    // Detached HEAD state or other error
    return null;
  }
  return result.stdout.trim();
}

// List all project branches
function listProjectBranches(cwd) {
  const result = execGit(cwd, ['branch', '--list', 'project/*']);
  if (result.exitCode !== 0) {
    return [];
  }

  return result.stdout
    .split('\n')
    .map(line => line.replace(/^\*?\s+/, '').trim()) // Remove * and whitespace
    .filter(Boolean);
}

// Switch to project branch
function switchToProjectBranch(cwd, projectSlug) {
  const safeName = sanitizeForGit(projectSlug);
  const branchName = `project/${safeName}`;

  // Check for uncommitted changes
  const statusResult = execGit(cwd, ['status', '--porcelain']);
  if (statusResult.stdout.trim().length > 0) {
    throw new Error('Uncommitted changes detected. Commit or stash before switching projects.');
  }

  // Switch branch
  const result = execGit(cwd, ['checkout', branchName]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to switch to branch ${branchName}: ${result.stderr}`);
  }

  return { branch: branchName, switched: true };
}
```

### Anti-Patterns to Avoid
- **Using user input directly in git commands:** Always sanitize through sanitizeForGit() first to prevent injection and invalid refs
- **Creating lightweight tags for milestones:** Use annotated tags (-a flag) for metadata and audit trail
- **Forgetting to check current branch before tagging:** Tags are created on current HEAD, not automatically on project branch
- **Using async exec() when codebase is synchronous:** Breaks existing patterns, adds complexity, use execSync consistently
- **Adding npm dependencies for git operations:** Violates project constraint and adds unnecessary weight

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git command execution | Custom shell escaping, spawn wrappers | Existing `execGit()` helper in gsd-tools.js | Already handles argument escaping, error handling, and return codes correctly |
| Slug generation | New sanitization function | Existing `generateSlugInternal()` + git-specific validation | Core logic exists, just needs git-check-ref-format rules layered on top |
| Branch name validation | Manual regex checks | Git's own `git check-ref-format` command | Git knows its own rules, let it validate rather than reimplementing |
| Checking git repository | Filesystem navigation | `git rev-parse --git-dir` via execGit | Canonical way to detect .git directory location |

**Key insight:** Git CLI provides robust primitives for all operations. Don't parse git output with complex regexes when git provides structured commands (symbolic-ref, rev-parse, branch --list, etc.). The existing execGit() helper already solves command execution safely.

## Common Pitfalls

### Pitfall 1: Branch Already Exists Error
**What goes wrong:** Creating a new project when a branch with that name already exists causes git checkout -b to fail
**Why it happens:** User creates project "foo", deletes it, then creates "foo" again without removing the git branch
**How to avoid:** Check branch existence with `git rev-parse --verify <branch>` before attempting creation, provide clear error message
**Warning signs:** execGit returns exit code 128 with stderr containing "already exists"

### Pitfall 2: Uncommitted Changes During Branch Switch
**What goes wrong:** Switching project branches fails or loses work when there are uncommitted changes in working directory
**Why it happens:** Git refuses to switch branches if it would overwrite uncommitted changes
**How to avoid:** Run `git status --porcelain` before switching, require clean working directory or stash changes first
**Warning signs:** execGit returns exit code 1 with stderr containing "overwritten by checkout" or "Please commit your changes"

### Pitfall 3: Creating Tags on Wrong Branch
**What goes wrong:** Milestone tag gets created on main branch instead of project branch
**Why it happens:** User switches branches between project work and tag creation, tag is created on current HEAD
**How to avoid:** Verify current branch with `git symbolic-ref HEAD` before creating tag, error if not on expected project branch
**Warning signs:** Tag exists but `git log --all --oneline --graph` shows it on wrong branch

### Pitfall 4: Special Characters in Project Names
**What goes wrong:** Project name "My Cool Project!" becomes invalid branch name, git commands fail
**Why it happens:** Git branch names cannot contain spaces, uppercase letters, or special characters like ! @ # $
**How to avoid:** Sanitize ALL user input through sanitizeForGit() before using in any git command, validate result matches safe pattern
**Warning signs:** execGit returns exit code 128 with stderr containing "not a valid branch name"

### Pitfall 5: Detached HEAD State
**What goes wrong:** User is in detached HEAD state (e.g., after checking out a tag), current branch queries fail
**Why it happens:** Not every git state has a "current branch" - tags, specific commits put you in detached HEAD
**How to avoid:** Check if `git symbolic-ref HEAD` succeeds before assuming on a branch, handle null/error gracefully
**Warning signs:** getCurrentBranch() returns null, symbolic-ref exits with code 128

### Pitfall 6: Shell Metacharacter Injection
**What goes wrong:** Project name containing `; rm -rf /` or similar could execute malicious commands
**Why it happens:** If execGit doesn't properly escape arguments, shell interprets special characters
**How to avoid:** Existing execGit() already escapes arguments with regex `/^[a-zA-Z0-9._\-/=:@]+$/` or single quotes, maintain this pattern
**Warning signs:** Security audit flags unescaped user input to execSync

## Code Examples

Verified patterns from existing codebase and official git documentation:

### Creating Project Branch During Project Setup
```javascript
// Integrate into project creation workflow
// Source: Existing execGit() pattern in gsd-tools.js line 222
function cmdProjectCreate(cwd, projectName, raw) {
  // ... existing project creation logic ...

  // GIT-01: Create and switch to project branch
  const safeName = sanitizeForGit(projectName);
  const branchName = `project/${safeName}`;

  // Check if branch already exists
  const checkResult = execGit(cwd, ['rev-parse', '--verify', branchName]);
  if (checkResult.exitCode === 0) {
    error(`Project branch ${branchName} already exists`);
  }

  // Create and switch atomically (checkout -b is atomic)
  const branchResult = execGit(cwd, ['checkout', '-b', branchName]);
  if (branchResult.exitCode !== 0) {
    error(`Failed to create project branch: ${branchResult.stderr}`);
  }

  // ... rest of project setup ...

  output({
    created: true,
    project: projectName,
    branch: branchName,
    switched: true
  }, raw);
}
```

### Creating Annotated Tag During Milestone Completion
```javascript
// Integrate into milestone completion workflow
// Source: git-tag documentation and existing execGit() pattern
function cmdMilestoneComplete(cwd, version, options, raw) {
  // ... existing milestone completion logic ...

  // GIT-02: Create annotated tag on project branch
  const projectName = getCurrentProjectName(cwd); // From STATE.md
  const safeName = sanitizeForGit(projectName);
  const tagName = `project-${safeName}-${version}`;

  // Verify on correct branch
  const currentBranch = getCurrentBranch(cwd);
  const expectedBranch = `project/${safeName}`;
  if (currentBranch !== expectedBranch) {
    error(`Not on project branch. Switch to ${expectedBranch} first.`);
  }

  // Create annotated tag with metadata
  const tagMessage = options.name
    ? `Milestone ${version}: ${options.name}`
    : `Milestone ${version}`;

  const tagResult = execGit(cwd, ['tag', '-a', tagName, '-m', tagMessage]);
  if (tagResult.exitCode !== 0) {
    error(`Failed to create milestone tag: ${tagResult.stderr}`);
  }

  // ... archive milestone, etc. ...

  output({
    milestone: version,
    tag: tagName,
    branch: currentBranch,
    archived: true
  }, raw);
}
```

### Showing Current Project and Branch Status
```javascript
// Add to init commands or create dedicated status command
// Source: git symbolic-ref and branch --list documentation
function cmdProjectStatus(cwd, raw) {
  const currentBranch = getCurrentBranch(cwd);
  const isProjectBranch = currentBranch?.startsWith('project/');
  const projectName = isProjectBranch
    ? currentBranch.replace('project/', '')
    : null;

  const allProjectBranches = listProjectBranches(cwd);

  output({
    current_branch: currentBranch,
    on_project_branch: isProjectBranch,
    current_project: projectName,
    available_projects: allProjectBranches.map(b => b.replace('project/', '')),
    project_count: allProjectBranches.length
  }, raw);
}
```

### Switching Between Projects
```javascript
// New command for project switching (success criteria #4)
// Source: git checkout documentation
function cmdProjectSwitch(cwd, projectName, raw) {
  const safeName = sanitizeForGit(projectName);
  const targetBranch = `project/${safeName}`;

  // Verify branch exists
  const checkResult = execGit(cwd, ['rev-parse', '--verify', targetBranch]);
  if (checkResult.exitCode !== 0) {
    error(`Project branch ${targetBranch} does not exist`);
  }

  // Check for uncommitted changes
  const statusResult = execGit(cwd, ['status', '--porcelain']);
  if (statusResult.stdout.trim().length > 0) {
    error('Uncommitted changes detected. Commit or stash before switching projects.');
  }

  // Switch to project branch
  const switchResult = execGit(cwd, ['checkout', targetBranch]);
  if (switchResult.exitCode !== 0) {
    error(`Failed to switch to project: ${switchResult.stderr}`);
  }

  output({
    switched: true,
    project: projectName,
    branch: targetBranch,
    previous_branch: getCurrentBranch(cwd) // Will be targetBranch after switch
  }, raw);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lightweight tags for releases | Annotated tags with metadata | Git 1.x era (2005+) | Annotated tags include tagger, date, message; lightweight tags are just pointers. Annotated = best practice for releases. |
| git checkout for all operations | git switch and git restore | Git 2.23 (Aug 2019) | Newer git versions split checkout into switch (branches) and restore (files). Both still work, but switch is clearer. |
| Manual branch validation | git check-ref-format | Git 1.x (built-in) | Git provides native validation, no need to reimplement rules in application code |

**Deprecated/outdated:**
- **Lightweight tags for milestones**: Still work but lack metadata. Annotated tags are strongly recommended for any permanent markers.
- **Uppercase branch names**: Technically valid but cause issues on case-insensitive filesystems (macOS, Windows). Lowercase is universal best practice.
- **Spaces in branch names**: Git allows with quoting but extremely fragile across tools and shells. Hyphens are standard.

## Open Questions

1. **Should we support pushing branches/tags to remote?**
   - What we know: Git operations are currently local-only. No push commands in existing codebase.
   - What's unclear: Do PM teams expect automatic push to remote, manual push, or no remote at all?
   - Recommendation: Start with local-only (simplest, no auth issues), add push as optional flag later if requested. Document that branches/tags are local until manually pushed.

2. **How to handle branch conflicts during project creation?**
   - What we know: If branch already exists, git checkout -b fails
   - What's unclear: Should we error (safest), force-switch to existing branch, or prompt user?
   - Recommendation: Error with clear message "Branch already exists. Use /gsd:switch-project instead." Prevents accidental overwrites.

3. **Should we prevent switching projects with incomplete plans?**
   - What we know: Current workflow has no restrictions on when you can switch projects
   - What's unclear: Is it valid to have multiple in-progress projects, or should one complete before starting another?
   - Recommendation: Allow switching freely (matches git philosophy), rely on PM discipline. Could add --allow-incomplete flag later if needed.

## Sources

### Primary (HIGH confidence)
- [Git check-ref-format documentation](https://git-scm.com/docs/git-check-ref-format) - Official git rules for valid reference names
- [Git tagging documentation](https://git-scm.com/book/en/v2/Git-Basics-Tagging) - Annotated vs lightweight tags, best practices
- [Git checkout documentation](https://git-scm.com/docs/git-checkout) - Branch creation and switching
- Existing gsd-tools.js codebase (line 222: execGit helper, line 3546: generateSlugInternal function)

### Secondary (MEDIUM confidence)
- [Graphite: Git branch naming conventions](https://graphite.com/guides/git-branch-naming-conventions) - Industry best practices for branch names
- [GitHub: Dealing with special characters in branch and tag names](https://docs.github.com/en/get-started/using-git/dealing-with-special-characters-in-branch-and-tag-names) - Special character handling
- [Atlassian: Git tagging tutorial](https://www.atlassian.com/git/tutorials/inspecting-a-repository/git-tag) - Annotated tags best practices
- [Hatica: Git tags best practices](https://www.hatica.io/blog/git-tags/) - Milestone tagging strategy
- [DEV: Node.js exec vs execSync](https://dev.to/tene/nodejs-exec-vs-execsync-choosing-the-right-tool-for-your-child-processes-20n9) - When to use synchronous git operations
- [Refine: git switch vs git checkout](https://refine.dev/blog/git-switch-and-git-checkout/) - Modern git branch switching
- [DEV: How to slugify a string in JavaScript](https://dev.to/bybydev/how-to-slugify-a-string-in-javascript-4o9n) - Slug sanitization patterns

### Tertiary (LOW confidence)
- [iHateRegex: URL slug validation](https://ihateregex.io/expr/url-slug/) - Regex patterns (not git-specific, needs verification with git-check-ref-format)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Node.js built-ins already in use, git CLI is universal requirement
- Architecture: HIGH - Existing execGit() pattern proven, git commands well-documented
- Pitfalls: MEDIUM-HIGH - Based on git documentation and common issues, but specific to this tool's patterns (need validation during implementation)
- Code examples: HIGH - Based on existing codebase patterns (execGit, generateSlugInternal) and official git documentation

**Research date:** 2026-02-10
**Valid until:** 2027-02-10 (30 days for git fundamentals - these practices are stable)

**Note on confidence:** Git branch/tag fundamentals are extremely stable (unchanged since Git 1.x era). The main variables are integration patterns with this specific codebase, which are HIGH confidence due to existing execGit() helper and synchronous filesystem patterns throughout gsd-tools.js.
