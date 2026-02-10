# Coding Conventions

**Analysis Date:** 2026-02-10

## Naming Patterns

**Files:**
- Kebab-case for multi-word filenames: `gsd-tools.js`, `gsd-check-update.js`, `gsd-statusline.js`
- Naming convention reflects functionality: tool files start with `gsd-`, test files end with `.test.js`
- Workflows are named by purpose: `install.js`, `build-hooks.js`

**Functions:**
- camelCase for all function names: `loadConfig()`, `extractFrontmatter()`, `normalizePhaseName()`, `execGit()`, `parseIncludeFlag()`
- Helper functions prefixed with verb: `safeReadFile()`, `getGlobalDir()`, `parseConfigDirArg()`
- Short, descriptive names that indicate return value or action: `isGitIgnored()`, `runGsdTools()`

**Variables:**
- camelCase for standard variables: `tmpDir`, `explicitConfigDir`, `selectedRuntimes`, `frontmatter`
- UPPER_SNAKE_CASE for constants: `MODEL_PROFILES`, `TOOLS_PATH`
- Descriptive names for clarity: `includeIndex`, `indentMatch`, `accumulator`
- Single-letter loop variables acceptable but context-dependent: `i`, `j` in simple loops; `k`, `v` in object iteration

**Types:**
- No formal type system (vanilla JavaScript), but names imply type: `isGitIgnored` (boolean), `getGlobalDir` (string)
- Object keys use kebab-case in frontmatter but camelCase in code: `model_profile` in JSON, `modelProfile` in code

## Code Style

**Formatting:**
- No explicit linter or formatter found; style is manual/convention-based
- 2-space indentation (consistent across all files)
- Semicolons required at end of statements
- Trailing commas in multi-line objects/arrays
- Line length varies but generally keeps lines readable (~90-100 chars typical)

**Linting:**
- No ESLint or Prettier configuration detected
- Consistent manual style adherence: descriptive variable names, clear function purposes
- Error handling is explicit with try-catch blocks

## Import Organization

**Order:**
1. Node.js built-in modules: `fs`, `path`, `crypto`, `readline`, `os`, `child_process`
2. Local utility modules (if any)
3. Constants and helper function definitions follow imports

**Pattern from `gsd-tools.js`:**
```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Constants
const MODEL_PROFILES = { ... };

// Helper functions
function parseIncludeFlag(args) { ... }
```

**Path Aliases:**
- Not used; full relative paths employed: `require('../package.json')`
- Absolute paths constructed with `path.join()` for cross-platform compatibility

## Error Handling

**Patterns:**
- Try-catch blocks with graceful fallback: `safeReadFile()` returns `null` on error
- Error objects captured but often ignored for non-critical operations
- Exit codes returned as objects: `{ exitCode: 0, stdout, stderr }`
- Validation errors printed to stderr with color formatting and process exit

**Example from `install.js`:**
```javascript
try {
  // operation
} catch {
  return defaults;  // Silent fallback
}
```

**Git operations (from `gsd-tools.js`):**
```javascript
function execGit(cwd, args) {
  try {
    const stdout = execSync('git ' + escaped.join(' '), { ... });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    return { exitCode: err.status ?? 1, stdout: '', stderr: '' };
  }
}
```

## Logging

**Framework:** Native `console` object (no logging library)

**Patterns:**
- `console.log()` for informational output and results
- `console.error()` for error messages
- ANSI color codes for terminal output: `cyan`, `green`, `yellow`, `dim`, `reset`
- Color constants defined at module start: `const cyan = '\x1b[36m'`
- JSON output for machine-readable results (e.g., `console.log(JSON.stringify(output))`)

**Example from `install.js`:**
```javascript
const cyan = '\x1b[36m';
const reset = '\x1b[0m';
console.log(cyan + 'Text' + reset);
```

## Comments

**When to Comment:**
- JSDoc-style comments for file headers describing purpose and usage
- Inline comments for complex logic (YAML parsing, git escaping)
- Section separators using comment lines: `// ─── Model Profile Table ─────`
- Comments above code blocks explaining "why" not "what"

**JSDoc/TSDoc:**
- Full JSDoc headers for public functions: parameters, return type, exceptions
- Example from `bin/install.js`:
```javascript
/**
 * Get the global config directory for a runtime
 * @param {string} runtime - 'claude', 'opencode', or 'gemini'
 * @param {string|null} explicitDir - Explicit directory from --config-dir flag
 */
function getGlobalDir(runtime, explicitDir = null) { ... }
```

## Function Design

**Size:** Functions range from 5-50 lines; larger functions broken into logical sections with clear variable assignments

**Parameters:**
- Functions accept positional arguments plus optional flags
- Destructuring not used for imports but manual extraction of values
- Default parameters used: `function cleanup(tmpDir) { }`
- Rest parameters for variadic argument functions

**Return Values:**
- Explicit returns preferred: `return { success: true, output }`
- Objects returned for multiple related values
- `null` used to indicate absence, `undefined` for unset optional fields
- Explicit return in error paths: `return defaults;`

## Module Design

**Exports:**
- Single default export pattern: main script uses `module.exports = function` (not observed in this codebase; scripts are CLI tools with direct execution)
- Node.js `require()` used throughout
- No barrel files (index.js re-exporting multiple modules)

**Initialization:**
- Scripts execute immediately after function definitions (CLI entry points)
- Helper functions defined before main logic
- Configuration/constants at module top

## CLI Argument Parsing

**Pattern (from `install.js`):**
```javascript
const args = process.argv.slice(2);
const hasGlobal = args.includes('--global') || args.includes('-g');
const configDirIndex = args.findIndex(arg => arg === '--config-dir' || arg === '-c');
if (configDirIndex !== -1) {
  const nextArg = args[configDirIndex + 1];
}
```

**Conventions:**
- Manual `process.argv.slice(2)` parsing
- Both long (`--flag`) and short (`-f`) forms supported
- Flags can use `--key=value` or `--key value` syntax
- Validation for required arguments with helpful error messages

## Data Structure Conventions

**Frontmatter (YAML in Markdown):**
- Extracted as nested objects from `---` delimited blocks
- Keys use kebab-case: `one-liner`, `key-files`, `tech-stack`
- Arrays supported in YAML: `[item1, item2]` or list form
- Nested objects common: `tech-stack.added`, `dependency-graph.provides`

**State/Config (JSON):**
- Keys use snake_case: `model_profile`, `commit_docs`, `phase_branch_template`
- Top-level and nested sections both used

**Return Objects (CLI output):**
- snake_case keys for consistency with JSON config
- `success`/`error` booleans paired with `output`/`message` payloads
- ISO dates in `YYYY-MM-DD` format

## Architectural Patterns

**Helper-First Structure:**
- Pure utility functions defined first: `loadConfig()`, `safeReadFile()`, `parseIncludeFlag()`
- Complex logic isolated in focused functions
- No class-based OOP; functional programming style

**Graceful Degradation:**
- Missing config files return defaults rather than error
- Missing files in reads return `null`
- Partial data accepted (missing optional fields)

**Immutability:**
- Functions tend to create new objects rather than mutate inputs
- Example: `reconstructFrontmatter()` creates new array of lines

---

*Convention analysis: 2026-02-10*
