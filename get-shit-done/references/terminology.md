# Terminology: Developer to Business

This document maps developer/technical terms to PM-friendly business language for use in all user-facing error messages and documentation in GSD.

## Core Principle

PMs using GSD should never encounter jargon in error messages. Every message should use business language and tell them what to do next.

## Term Mapping

| Developer Term | Business Term | Context |
|----------------|---------------|---------|
| frontmatter | project header | YAML block at top of .md files |
| frontmatter YAML | project header | Same as above |
| YAML | configuration / settings | Generic data format |
| git branch | project workspace | Branch isolation |
| branch | workspace | Short form |
| commit | save | Git commit |
| repository | project | Git repo |
| merge | combine changes | Git merge |
| checkout | switch to | Git checkout |
| directory | folder | File system |
| path | location | File path |
| parsing | reading | Technical process |
| validation | checking | Technical process |
| initialization | setup | Technical process |
| invalid | (describe what's needed instead) | Blame language |
| failed | couldn't complete | Blame language |
| error | problem | Blame language |
| exception | issue | Blame language |
| stack trace | technical details | Debug info |
| dependencies | required items | Technical concept |
| environment variable | system setting | Technical concept |
| CLI | command tool | Technical concept |

## CLEAR Framework

All error messages should follow the CLEAR framework:

- **C**ontext: What was being attempted
- **L**ocation: Where the problem occurred (if relevant)
- **E**xplanation: What went wrong
- **A**ction: What to do next (always actionable)
- **R**esources: Optional - link to docs or related commands

## Examples

### Bad (Developer Language)
```
Error: Invalid frontmatter YAML in plan file
```

### Good (Business Language)
```
Problem: The project header in the plan file is missing required fields. Please ensure it includes 'phase', 'plan', and 'type' fields.
```

### Bad (Blame Language)
```
Error: Failed to parse STATE.md - file is corrupted
```

### Good (Constructive Language)
```
Problem: Couldn't read the project state file. The file may be corrupted. Run /gsd:new-project to set up a fresh project.
```

## Progressive Disclosure

Technical details should be hidden by default and only shown when `GSD_VERBOSE=true` is set:

```javascript
error('Couldn\'t save project settings. Try running the command again.',
      `Technical details: ${err.message}`);
```

The technical details are only displayed when `GSD_VERBOSE=true` environment variable is set, keeping the default experience clean for PMs.
