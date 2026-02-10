# Testing Patterns

**Analysis Date:** 2026-02-10

## Test Framework

**Runner:**
- Node.js built-in `node:test` module (no external test framework)
- Config: Inline test discovery (no config file needed)

**Assertion Library:**
- `node:assert` (Node.js built-in strict assertions)

**Run Commands:**
```bash
npm test                    # Run all tests
node --test src/**/*.test.js # Test specific files
node get-shit-done/bin/gsd-tools.test.js # Run single test file
```

From `package.json`:
```json
"test": "node --test get-shit-done/bin/gsd-tools.test.js"
```

## Test File Organization

**Location:**
- Tests are co-located with source code
- Pattern: `<source-file>.test.js` (same directory as implementation)
- Example: `get-shit-done/bin/gsd-tools.test.js` tests `get-shit-done/bin/gsd-tools.js`

**Naming:**
- Test files end with `.test.js`
- Test suites named with `describe()` blocks
- Individual tests named with `test()` blocks using descriptive strings

**Structure:**
```
get-shit-done/bin/
├── gsd-tools.js           # Source: CLI tool
├── gsd-tools.test.js      # Tests: ~2000 lines covering all commands
└── ...
```

## Test Structure

**Suite Organization:**

From `gsd-tools.test.js`:
```javascript
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

describe('history-digest command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('empty phases directory returns valid schema', () => {
    const result = runGsdTools('history-digest', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const digest = JSON.parse(result.output);
    assert.deepStrictEqual(digest.phases, {}, 'phases should be empty object');
  });

  test('nested frontmatter fields extracted correctly', () => {
    // ... test setup ...
    const result = runGsdTools('history-digest', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const digest = JSON.parse(result.output);
    assert.deepStrictEqual(digest.phases['01'].provides.sort(), [...], '...');
  });
});
```

**Patterns:**
- Setup: `beforeEach()` creates temp project directory with `.planning` structure
- Teardown: `afterEach()` recursively removes temp directory
- Assertion: Multiple `assert` calls per test with descriptive messages
- Test isolation: Each test gets fresh temp directory via setup/teardown

## Mocking

**Framework:** No mocking library (node:assert only)

**Patterns:**
- File system mocking via `fs.mkdirSync()`, `fs.writeFileSync()` (actual temp files)
- Process mocking via `execSync()` to run CLI tool as subprocess
- No mock library used; real filesystem operations in isolated temp directories

**Helper Function for Process Testing:**
```javascript
function runGsdTools(args, cwd = process.cwd()) {
  try {
    const result = execSync(`node "${TOOLS_PATH}" ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return {
      success: false,
      output: err.stdout?.toString().trim() || '',
      error: err.stderr?.toString().trim() || err.message,
    };
  }
}
```

**What to Mock:**
- External processes (tested via `execSync()` wrapper in subprocess)
- File I/O (created in temp directories, not mocked)
- Not mocked: Real CLI invocations (by design - integration tests)

**What NOT to Mock:**
- Filesystem operations (use real temp dirs instead)
- Process execution (use subprocess wrapper instead)
- JSON parsing (use actual JSON to verify serialization)

## Fixtures and Factories

**Test Data:**
- Inline YAML/Markdown content embedded in tests
- Example fixture from test:
```javascript
const summaryContent = `---
phase: "01"
name: "Foundation Setup"
dependency-graph:
  provides:
    - "Database schema"
    - "Auth system"
---

# Summary content here
`;

fs.writeFileSync(path.join(phaseDir, '01-01-SUMMARY.md'), summaryContent);
```

**Factory Functions:**
```javascript
function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gsd-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
  return tmpDir;
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
```

**Location:**
- Helper functions defined at top of test file
- Constants like `TOOLS_PATH` defined at module level
- Per-suite fixtures defined in `beforeEach()` blocks

## Coverage

**Requirements:** No coverage enforcement detected (no `.nycrc` or `coverage` config)

**View Coverage:**
```bash
node --test --coverage get-shit-done/bin/gsd-tools.test.js
```

## Test Types

**Unit Tests:**
- Scope: Individual CLI commands (e.g., `history-digest`, `phases list`, `state-snapshot`)
- Approach: Subprocess invocation with isolated temp filesystem
- Example: "empty phases directory returns valid schema" — tests default behavior with no files

**Integration Tests:**
- Scope: Multi-file workflows (create phases, update ROADMAP, verify consistency)
- Approach: Full setup/execution/verification cycle in temp project
- Example: "removes phase directory and renumbers subsequent" — tests cascade renumbering across files

**End-to-End Tests:**
- Scope: Entire command workflows with realistic data
- Approach: Real filesystem, JSON parsing, complex nested frontmatter
- Example: "phase complete marks phase done and transitions to next" — full state machine test

## Common Patterns

**Async Testing:**
- Not applicable; Node.js `node:test` runs synchronously by default
- No async/await patterns in test suite
- Filesystem operations are synchronous: `fs.writeFileSync()`, `fs.mkdirSync()`

**Error Testing:**
```javascript
test('rejects missing phase', () => {
  fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), `# Roadmap\n`);

  const result = runGsdTools('phase remove 99 --force', tmpDir);
  assert.ok(!result.success, 'should fail for missing phase');
  assert.ok(result.error.includes('not found'), 'error mentions not found');
});

test('handles missing ROADMAP.md gracefully', () => {
  const result = runGsdTools('roadmap analyze', tmpDir);
  assert.ok(result.success, `Command should succeed: ${result.error}`);

  const output = JSON.parse(result.output);
  assert.strictEqual(output.error, 'ROADMAP.md not found');
});
```

**Assertion Patterns:**
- `assert.ok()` — truthiness checks with custom message
- `assert.strictEqual()` — exact value equality with message
- `assert.deepStrictEqual()` — deep object/array equality
- Message always provided for context in failure

**Example Test with Multiple Assertions:**
```javascript
test('extracts all fields from SUMMARY.md', () => {
  // Setup: create file with frontmatter
  fs.writeFileSync(path.join(phaseDir, '01-01-SUMMARY.md'), `---
one-liner: Set up Prisma with User and Project models
key-files:
  - prisma/schema.prisma
  - src/lib/db.ts
tech-stack:
  added:
    - prisma
    - zod
patterns-established:
  - Repository pattern
  - Dependency injection
key-decisions:
  - Use Prisma over Drizzle: Better DX and ecosystem
  - Single database: Start simple, shard later
---

# Summary
`);

  // Execute
  const result = runGsdTools('summary-extract .planning/phases/01-foundation/01-01-SUMMARY.md', tmpDir);

  // Assert: multiple checks on single result
  assert.ok(result.success, `Command failed: ${result.error}`);
  const output = JSON.parse(result.output);

  assert.strictEqual(output.path, '.planning/phases/01-foundation/01-01-SUMMARY.md', 'path correct');
  assert.strictEqual(output.one_liner, 'Set up Prisma with User and Project models', 'one-liner extracted');
  assert.deepStrictEqual(output.key_files, ['prisma/schema.prisma', 'src/lib/db.ts'], 'key files extracted');
  assert.deepStrictEqual(output.tech_added, ['prisma', 'zod'], 'tech added extracted');
  assert.deepStrictEqual(output.patterns, ['Repository pattern', 'Dependency injection'], 'patterns extracted');
  assert.strictEqual(output.decisions.length, 2, 'decisions extracted');
  assert.strictEqual(output.decisions[0].summary, 'Use Prisma', 'decision summary parsed');
  assert.strictEqual(output.decisions[0].rationale, 'Better DX and ecosystem', 'decision rationale parsed');
});
```

**Data-Driven Testing:**
- Multiple test cases per describe block covering variations
- Example: test with inline array, test with nested arrays, test with missing fields
- Patterns tested: empty state, single item, multiple items, malformed input

**Test Isolation:**
- Fresh filesystem state per test via `createTempProject()` + `cleanup()`
- No shared state between tests
- Process isolation via `execSync()` subprocess calls

---

*Testing analysis: 2026-02-10*
