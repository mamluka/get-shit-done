# Phase 4: UX Polish - Research

**Researched:** 2026-02-10
**Domain:** UX writing, error message design, terminology mapping for non-technical users
**Confidence:** HIGH

## Summary

Phase 4 transforms GSD's user-facing language from developer terminology to PM-friendly business language. This involves mapping technical terms (frontmatter, YAML, git branch, stack traces) to business concepts (project header, project workspace, configuration), rewriting error messages to be actionable and blame-free, and ensuring removed execution commands show helpful redirects.

The implementation is straightforward string replacement and message rewriting in gsd-tools.js and markdown workflows, guided by established UX writing best practices. No external dependencies needed — this is purely a content and messaging transformation layer over existing functionality.

**Primary recommendation:** Create a terminology mapping dictionary (developer term → business term), audit all user-facing messages in gsd-tools.js and command files, apply the CLEAR framework (Context, Location, Explanation, Action, Resources) to error messages, and use tombstone redirects from Phase 3 as the pattern for removed commands.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 18+ | CLI runtime | Already in use for gsd-tools.js |
| fs (native) | Node stdlib | File operations | Read message files for audit and updates |

### Supporting
None required — this is a content/messaging layer over existing infrastructure.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual string replacement | i18n library (i18next, format.js) | Adds dependencies; overkill for single-language terminology mapping |
| Inline error messages | External message catalog | More structure but adds complexity for ~50 messages |
| Direct code edits | String constant extraction | More maintainable long-term but requires refactor; not in phase scope |

**Installation:**
No new dependencies — phase uses existing Node.js string operations.

## Architecture Patterns

### Recommended Project Structure
Work happens in existing files:
```
.claude/
├── commands/gsd/           # User-facing command descriptions
│   ├── *.md                # Update descriptions to use business language
├── get-shit-done/
│   ├── bin/gsd-tools.js    # Error messages, validation messages, help text
│   ├── workflows/
│   │   └── *.md            # Update workflow language and terminology
│   └── references/
│       └── terminology.md  # NEW: Developer-to-business term mapping
```

### Pattern 1: Terminology Mapping Dictionary
**What:** Centralized mapping from developer terms to business-friendly alternatives
**When to use:** Reference for all message rewrites; ensures consistency

**Core mappings:**
```javascript
// Developer term → Business term
const TERMINOLOGY = {
  // Technical artifacts
  "frontmatter": "project header",
  "frontmatter YAML": "project header",
  "YAML": "configuration",
  "markdown frontmatter": "document properties",

  // Git terminology
  "git branch": "project workspace",
  "branch": "workspace",
  "commit": "save",
  "repository": "project",
  "merge": "combine changes",
  "checkout": "switch to",

  // File/folder terms
  ".planning/": "planning folder",
  "directory": "folder",
  "path": "location",

  // Technical processes
  "parsing": "reading",
  "validation": "checking",
  "initialization": "setup",
  "execution": "running",

  // Error terms
  "invalid": "incorrect",
  "failed": "couldn't complete",
  "error": "problem",
  "exception": "issue",
  "stack trace": "technical details",

  // Development concepts
  "dependencies": "required items",
  "configuration": "settings",
  "environment variable": "system setting",
  "CLI": "command tool"
};
```

### Pattern 2: CLEAR Error Message Framework
**What:** Structure for user-friendly error messages (Context, Location, Explanation, Action, Resources)
**When to use:** Every error message rewrite

**Structure:**
```
[CONTEXT] What was the user trying to do?
[LOCATION] Where did the problem occur?
[EXPLANATION] What went wrong in plain language?
[ACTION] What should the user do next?
[RESOURCES] Where can they get help?
```

**Before (developer-focused):**
```javascript
throw new Error('Active project file is empty');
```

**After (PM-friendly):**
```javascript
error({
  context: "Switching projects",
  problem: "The current project file exists but has no project name",
  why: "This usually means the project setup was interrupted",
  action: "Run /gsd:list-projects to see available projects, then /gsd:switch-project {name}",
  help: "Use /gsd:debug to see system status"
});
```

**One-line version for simple errors:**
```javascript
// Before: "path required for verification"
// After: "Please specify which folder to verify"
```

### Pattern 3: Progressive Disclosure for Technical Details
**What:** Show simple message by default, technical details only on request
**When to use:** Errors where technical details help debugging but confuse PMs

**Implementation:**
```javascript
function error(message, technicalDetails = null) {
  process.stderr.write('Problem: ' + message + '\n');
  if (technicalDetails && process.env.GSD_VERBOSE === 'true') {
    process.stderr.write('\nTechnical details:\n' + technicalDetails + '\n');
  }
  process.exit(1);
}

// Usage:
error(
  "Couldn't read project settings. The settings file might be corrupted.",
  `JSON.parse error: ${err.message}`  // Only shown with GSD_VERBOSE=true
);
```

### Pattern 4: Redirect Messages for Removed Commands
**What:** Helpful guidance when user tries removed execution commands
**When to use:** Commands tombstoned in Phase 3

**Pattern (from Phase 3 research):**
```markdown
---
name: gsd:execute-phase
description: [REMOVED] This command no longer exists
---

# Command No Longer Available: /gsd:execute-phase

This command was part of the execution workflow, which has been removed.

## Why it changed

GSD is now a planning-only tool. Plans you create are specifications for your engineering team, not instructions for automated execution.

## What to do instead

**To plan a phase:** `/gsd:plan-phase {N}`
**To mark planning complete:** `/gsd:complete-phase {N}`
**To revise plans:** `/gsd:edit-phase {N}`

---

See `/gsd:help` for all available commands.
```

### Pattern 5: Blame-Free Language
**What:** Error messages that explain problems without accusing the user
**When to use:** All validation and error messages

**Guidelines:**
- Avoid: "You entered invalid input"
- Use: "Please enter a project name (letters, numbers, and hyphens only)"

- Avoid: "Missing required field"
- Use: "The project header needs a 'phase' field to continue"

- Avoid: "Command failed"
- Use: "Couldn't complete the command because [specific reason]"

### Anti-Patterns to Avoid
- **Technical jargon without explanation:** Don't reference "JSON parsing" or "regex validation" without business context
- **Vague errors:** Avoid "An error occurred" or "Something went wrong" — always be specific
- **Humor in errors:** Error messages aren't the place for jokes (users see them repeatedly when troubleshooting)
- **Blame language:** Don't use "invalid," "illegal," "incorrect," or "you failed to"
- **Missing actions:** Every error needs "what to do next," not just "what went wrong"

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Message templates | Custom template engine | Template literals in gsd-tools.js | Already in use, no dependencies |
| Error formatting | Custom formatter | Existing error() function in gsd-tools.js | Single point of control for error output |
| Term replacement | Global search/replace scripts | Manual review + terminology dictionary | Prevents over-replacement (e.g., "branch" in "if branch" code) |
| Message validation | Custom validator | Manual review with checklist | ~50 messages total, not worth automation |

**Key insight:** This is a content editing phase, not a technical implementation phase. The challenge is writing clarity, not building infrastructure.

## Common Pitfalls

### Pitfall 1: Over-Replacement
**What goes wrong:** Automated find/replace changes technical terms in code comments, variable names, or non-user-facing contexts
**Why it happens:** Using regex/scripts without context awareness
**How to avoid:** Manual review of each message; only change user-facing strings (error messages, help text, command descriptions)
**Warning signs:** Broken variable names like `const project_headerData`, comments that say "parse the project header"

### Pitfall 2: Inconsistent Terminology
**What goes wrong:** Same concept called different things in different messages (workspace vs branch vs project line)
**Why it happens:** Editing messages one at a time without reference to previous decisions
**How to avoid:** Create and follow terminology dictionary; review all changes together for consistency
**Warning signs:** User confusion about whether "workspace" and "project line" are the same thing

### Pitfall 3: Removing Technical Details That Help Debugging
**What goes wrong:** Error becomes too vague to diagnose (e.g., "Couldn't read file" without saying which file)
**Why it happens:** Over-simplifying to avoid "technical" language
**How to avoid:** Keep specific details (file paths, field names, command names) but wrap in business context
**Warning signs:** Support requests increase because users can't provide enough info to debug

### Pitfall 4: False Simplicity
**What goes wrong:** Message sounds simple but doesn't help user understand or act (e.g., "Please fix the problem")
**Why it happens:** Confusing "simple language" with "vague language"
**How to avoid:** Test CLEAR framework: does message have Context, Location, Explanation, Action, Resources?
**Warning signs:** Messages that say "something wrong" without saying what or how to fix

### Pitfall 5: Breaking Help/Documentation Links
**What goes wrong:** Changing command names or terminology in messages breaks cross-references in help text
**Why it happens:** Editing messages file-by-file without checking references
**How to avoid:** After message edits, grep for old terms in all workflow/command files
**Warning signs:** Help text says "Run execute-phase" but command is tombstoned

## Code Examples

Current error messages from gsd-tools.js that need updating:

### Example 1: Frontmatter → Project Header
**Current (line 554):**
```javascript
throw new Error('Active project file is empty');
```

**After:**
```javascript
error(
  "The current project workspace is not set up correctly. " +
  "Run /gsd:list-projects to see available projects, then /gsd:switch-project {name}"
);
```

### Example 2: Branch → Workspace
**Current (line 611):**
```javascript
throw new Error('No active project. Run /gsd:switch-project or /gsd:new-project to select one.');
```

**After (already PM-friendly, but could be clearer):**
```javascript
error(
  "No project is currently active. " +
  "Choose a project with /gsd:switch-project {name} or create one with /gsd:new-project {name}"
);
```

### Example 3: Validation Errors
**Current (lines 2372-2374):**
```javascript
const required = ['phase', 'plan', 'type', 'wave', 'depends_on', 'files_modified', 'autonomous', 'must_haves'];
for (const field of required) {
  if (fm[field] === undefined) errors.push(`Missing required frontmatter field: ${field}`);
}
```

**After:**
```javascript
const required = {
  phase: "phase number",
  plan: "plan number",
  type: "plan type",
  wave: "execution wave",
  depends_on: "dependencies",
  files_modified: "files affected",
  autonomous: "automation level",
  must_haves: "requirements"
};

for (const [field, description] of Object.entries(required)) {
  if (fm[field] === undefined) {
    errors.push(`The project header is missing '${field}' (${description})`);
  }
}
```

### Example 4: File Not Found
**Current (line 2184):**
```javascript
output({ error: 'File not found', path: summaryPath }, raw);
```

**After:**
```javascript
output({
  problem: 'Could not find the summary file',
  location: summaryPath,
  action: 'Check that the plan has been completed and the summary was created'
}, raw);
```

### Example 5: Git Operations (Context-Aware)
**Current (Phase 3 execution workflows, line 38):**
```bash
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
```

**After (in error handling):**
```javascript
// If checkout fails:
error(
  "Couldn't switch to project workspace. " +
  "This usually means the workspace name conflicts with existing workspaces. " +
  "Try /gsd:list-projects to see active workspaces."
);
```

## UX Writing Best Practices

### From Industry Research (2026)

**Tone Guidelines (Nielsen Norman Group, UX Writing Hub):**
- Use positive, non-judgmental tone
- Write in conversational language anyone can understand
- Avoid jargon, technical terms, error codes in main message
- Keep it brief: readers understand 100% of 8-word messages, only 90% of 14-word messages

**Structure Guidelines (Microsoft, Atlassian):**
- Show error right next to where it occurred (not just at top)
- State what went wrong, then what to do about it
- Provide "executable" instructions (commands users can copy)
- Use "problem" instead of "error," "please" when asking users to fix things

**CLI-Specific Guidelines (CLI Guidelines, Node.js Best Practices):**
- Catch errors and rewrite them clearly rather than showing raw system errors
- Hide stack traces unless user requests verbose output
- Provide trackable error codes in docs, not in primary message
- Make success the silent path; only show output for problems or explicit requests

### Accessibility Considerations
- Don't rely only on color (red text) to indicate errors
- Use symbols (⚠️ for warnings, ❌ for errors, ✓ for success) sparingly
- Keep line length reasonable for terminal display (80-100 chars)
- Support screen readers by using clear sentence structure

### Terminology Checklist

Before/after review checklist for each message:
- [ ] No use of "frontmatter" → use "project header" or "document properties"
- [ ] No use of "git branch" → use "project workspace"
- [ ] No use of "YAML" → use "configuration" or "settings"
- [ ] No use of "invalid/illegal/incorrect" → describe what's needed instead
- [ ] No use of "failed/error" → use "couldn't" or "problem"
- [ ] Includes specific action user can take
- [ ] Includes relevant context (what were they trying to do?)
- [ ] Uses business concepts, not implementation details

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Technical error messages | CLEAR framework (Context, Location, Explanation, Action, Resources) | 2020s UX writing evolution | Users understand problems and know how to fix them |
| Developer terminology | Business language | This phase (4) | PMs don't need Git/YAML knowledge to use GSD |
| Command deletion | Tombstoning with redirects | Phase 3 pattern | Users get helpful guidance, not "command not found" |
| Single-tier messaging | Progressive disclosure (simple + verbose mode) | Modern CLI best practice | PMs see clarity, support sees technical details |

**Deprecated/outdated:**
- Raw error messages from system/libraries: Now wrapped with business context
- Technical jargon in user-facing strings: Now mapped to business terms
- Blame language ("invalid," "you failed"): Now replaced with neutral explanations

## Audit Strategy

### Systematic Message Inventory

**Phase 1: Find all user-facing messages**
```bash
# Error messages
grep -n "error(" get-shit-done/bin/gsd-tools.js
grep -n "throw new Error" get-shit-done/bin/gsd-tools.js
grep -n "process.stderr.write" get-shit-done/bin/gsd-tools.js

# Command descriptions
grep -n "^description:" commands/gsd/*.md

# Workflow instructions
grep -n "Error" get-shit-done/workflows/*.md

# Help text
grep -n "not found\|missing\|required\|invalid\|failed" get-shit-done/**/*.{js,md}
```

**Phase 2: Categorize by urgency**
1. **Critical (must change):** Contains "frontmatter," "YAML," "git branch," blame language
2. **Important (should change):** Vague errors, missing actions, technical jargon
3. **Nice to have:** Already clear but could use polish

**Phase 3: Update by category**
- Start with critical terms (frontmatter, branch)
- Move to error structure (add context/action)
- Finish with polish (tone, brevity)

**Phase 4: Cross-reference validation**
After updates, ensure:
- Help text references match actual command names
- Error messages reference valid commands (no tombstoned commands)
- Terminology is consistent across all files

## Open Questions

1. **Should we support both business and technical terminology for advanced users?**
   - What we know: Some PMs are technical and might prefer precise terms
   - What's unclear: Whether dual terminology creates confusion vs clarity
   - Recommendation: Start with business language only, add `--verbose` flag in Phase 5 (v2) if users request it

2. **How should we handle terminology in git commit messages?**
   - What we know: Git messages are semi-technical, seen by developers who merge branches
   - What's unclear: Whether PM git messages should use PM language or dev language
   - Recommendation: Keep git messages technical (they're developer-facing), only change CLI output

3. **Should error codes be visible or hidden?**
   - What we know: Error codes help support but clutter messages for users
   - What's unclear: Optimal balance between usability and debuggability
   - Recommendation: Hide codes in default output, show in verbose mode or docs

## Sources

### Primary (HIGH confidence)
- [Error-Message Guidelines - Nielsen Norman Group](https://www.nngroup.com/articles/error-message-guidelines/) - Core UX principles for error messages
- [Best 10 Examples And Guidelines For Error Messages - UX Writing Hub](https://uxwritinghub.com/error-message-examples/) - Error message patterns and examples
- [Command Line Interface Guidelines](https://clig.dev/) - CLI-specific UX best practices
- [User experience guidelines for errors - Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-error-handling-guidelines) - Enterprise error message patterns
- GSD codebase: `get-shit-done/bin/gsd-tools.js` - Audited all error messages and user-facing strings (150+ instances)
- Phase 3 research: Tombstone pattern for removed commands

### Secondary (MEDIUM confidence)
- [How to Design User-Friendly Error Messages - WowMakers](https://www.wowmakers.com/blog/user-friendly-error-messages/) - Verified across multiple sources
- [6 Best Practices for Writing Great Error Messages - UX Design World](https://uxdworld.com/6-best-practices-for-error-messages/) - Reinforces primary sources
- [Error Handling in CLI Tools - Medium](https://medium.com/@czhoudev/error-handling-in-cli-tools-a-practical-pattern-thats-worked-for-me-6c658a9141a9) - Practical CLI patterns
- [Business Glossary Best Practices - Atlan](https://atlan.com/what-is-a-business-glossary/) - Terminology mapping patterns

### Tertiary (LOW confidence)
- None - All findings verified with multiple authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No dependencies, pure content work
- Architecture: HIGH - Patterns verified in existing codebase and industry sources
- Terminology mapping: HIGH - Clear developer-to-business term pairs
- Error message structure: HIGH - CLEAR framework widely documented
- Audit strategy: HIGH - Straightforward grep-based inventory

**Research date:** 2026-02-10
**Valid until:** 2026-03-12 (30 days - content/UX best practices are stable)

## Key Findings for Planner

**Most important discoveries:**
1. This is a content editing phase, not a technical implementation — focus is on clarity and consistency
2. Terminology dictionary (developer → business terms) is critical for consistency
3. CLEAR framework (Context, Location, Explanation, Action, Resources) provides structure for error rewrites
4. ~150+ user-facing strings in gsd-tools.js need review; prioritize frontmatter/branch/YAML terms first
5. Progressive disclosure (simple by default, technical in verbose mode) balances PM usability with debugging needs
6. Phase 3 tombstone pattern is the model for execution command redirects
7. Manual review beats automation for ~50 messages to avoid over-replacement
8. Cross-reference validation after edits prevents broken help text links
