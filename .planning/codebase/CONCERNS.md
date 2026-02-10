# Codebase Concerns

**Analysis Date:** 2026-02-10

## Tech Debt

**Silent Error Handling:**
- Issue: 30+ instances of bare `catch {}` blocks that silently swallow errors without logging or graceful degradation
- Files: `get-shit-done/bin/gsd-tools.js` (lines 152, 205, 217, 545, 547, 958, 1026, 1076, 2482, etc.)
- Impact: Bugs become invisible. User doesn't know why a command failed. Debugging becomes impossible when operations silently fail.
- Fix approach: Replace `catch {}` with logged error handlers. At minimum: `catch (e) { console.error('Failed to read X:', e.message); }`. For critical operations, propagate errors to caller.

**Monolithic CLI Tool:**
- Issue: `get-shit-done/bin/gsd-tools.js` is 4,597 lines - a single file handling 50+ distinct commands and subcommands
- Files: `get-shit-done/bin/gsd-tools.js`
- Impact: Hard to navigate, test, or modify. Single regression can break multiple workflows. Difficult to understand data flow for new contributors.
- Fix approach: Split into modules: `lib/state.js`, `lib/verify.js`, `lib/phase.js`, etc. Keep CLI router thin (~200 lines), delegate to specialized modules.

**No Input Validation Consistency:**
- Issue: Some commands validate parameters (`if (!filePath) { error(...) }`), others assume arguments exist (line 4452: `args.slice(2).join(' ')` could be undefined)
- Files: `get-shit-done/bin/gsd-tools.js` (scattered validation throughout)
- Impact: Edge cases cause crashes instead of user-friendly errors. Hard-to-debug "command failed" messages.
- Fix approach: Create `validateArgs()` schema validator. Centralize required/optional argument checking.

**Embedded Path Construction Without Validation:**
- Issue: Paths are joined with `path.join()` but rarely validated for directory traversal attacks. User input flows into file paths (line 2251-2253)
- Files: `get-shit-done/bin/gsd-tools.js` (lines 2240-2253, 2323, 2377, etc.)
- Impact: Low risk in local tooling, but could allow unintended file access if input sanitization is weak. Not a high-risk vulnerability for local CLI, but poor practice.
- Fix approach: Validate paths are within project directory. Reject paths containing `..` or absolute paths unless explicitly allowed.

## Known Bugs

**Orphan Summaries Not Prevented:**
- Symptoms: Users can create summaries for non-existent plans. Phase completion check only requires `summaries.length >= plans.length`, not 1:1 matching
- Files: `get-shit-done/bin/gsd-tools.js` (lines 2215-2224)
- Trigger: Create SUMMARY without PLAN, or delete PLAN after creating SUMMARY
- Workaround: Manual cleanup of orphan files in phase directories

**Regex Pattern Parsing Fragility:**
- Symptoms: Phase name extraction relies on regex `###\s*Phase\s+(\d+(?:\.\d+)?)\s*:` - fails if markdown formatting changes slightly
- Files: `get-shit-done/bin/gsd-tools.js` (line 2434)
- Trigger: ROADMAP.md with inconsistent heading spacing (e.g., `###Phase` without space) causes silent parse failures
- Workaround: Keep ROADMAP.md formatting consistent per template

**Git Command Shell Injection Risk:**
- Symptoms: Git commands built from arguments without strict quoting validation
- Files: `get-shit-done/bin/gsd-tools.js` (lines 222-240)
- Trigger: Commit message containing backticks or shell metacharacters
- Impact: Low risk because args are pre-filtered, but `execGit()` escaping logic is incomplete (line 225: only alphanumeric chars pass through)
- Fix approach: Use `execSync()` with `{ shell: false }` option or proper array-based argument passing instead of string interpolation

**Model Resolution Order Not Documented:**
- Symptoms: `resolveModel()` returns different values based on undocumented priority (lines 397-415). Users don't know which config takes precedence.
- Files: `get-shit-done/bin/gsd-tools.js` (lines 390-420)
- Impact: Unexpected agent selection. User sets config but wrong model is used.
- Fix approach: Document priority order in inline comments. Add `--debug` flag to show which config was used.

## Security Considerations

**No Credential Validation:**
- Risk: Environment variables containing API keys are read and cached in memory but no masking occurs before logging/output
- Files: `get-shit-done/bin/gsd-tools.js` (lines 173-185 loading config)
- Current mitigation: Codebase tools themselves don't log secrets. But if someone adds debugging output, secrets could leak.
- Recommendations: Add `SECRET_KEYS` allowlist, automatically mask any values matching sensitive key names in debug output.

**Git Repo Access Not Validated:**
- Risk: Tool assumes `.git/` directory exists and is readable. No validation that current directory is safe git repo.
- Files: `get-shit-done/bin/gsd-tools.js` (multiple git operations)
- Trigger: Run `gsd-tools` in non-git directory or symbolic link to dangerous location
- Recommendations: Validate with `git rev-parse --git-dir` before any git operations. Fail fast with clear error.

**File Write Without Backup:**
- Risk: `cmdStateUpdate()` and file writing operations overwrite files without backup (lines 1058-1075)
- Files: `get-shit-done/bin/gsd-tools.js` (lines 1058-1075, 668-690)
- Impact: User loses data if write fails mid-operation or if command crashes
- Recommendations: Write to temp file first, then atomic rename. Preserve .bak for critical files like STATE.md.

## Performance Bottlenecks

**Full Phase Directory Read for Every Operation:**
- Problem: `cmdRoadmapAnalyze()` reads entire phases directory structure for each phase (lines 2464-2482). With 100+ phases, this is O(n²) complexity.
- Files: `get-shit-done/bin/gsd-tools.js` (lines 2420-2540)
- Cause: No caching between phase iterations. Each phase stats the filesystem independently.
- Improvement path: Cache phase directory contents once, reuse for all phases. Pre-populate phase name mappings.

**Regex Exec Loop Without Exit Condition:**
- Problem: `while ((match = phasePattern.exec(content)) !== null)` can get stuck if regex doesn't advance (though currently safe). Inefficient for large ROADMAP files.
- Files: `get-shit-done/bin/gsd-tools.js` (line 2438)
- Cause: Global regex flag combined with mutable state. If someone modifies ROADMAP.md structure unexpectedly, could cause issues.
- Improvement path: Use `content.matchAll()` instead. Easier to reason about.

**No Pagination for Large Output:**
- Problem: Commands like `phases list` return all results. With 1000+ phases, JSON output bloats memory and network.
- Files: `get-shit-done/bin/gsd-tools.js` (lines 4420-4433)
- Impact: Not current issue (most projects have <100 phases) but limits scalability
- Improvement path: Add `--limit` and `--offset` flags for pagination support

## Fragile Areas

**STATE.md Parsing:**
- Files: `get-shit-done/bin/gsd-tools.js` (lines 1010-1076)
- Why fragile: Uses regex to extract field values from markdown. Breaks if formatting changes (e.g., `**Field:**` vs `** Field:**` or extra spaces). No schema validation.
- Safe modification: Add frontmatter YAML block to STATE.md instead of relying on markdown heading patterns. Migrate existing states incrementally.
- Test coverage: Minimal - no unit tests for STATE.md parsing. Only integration tests via workflows.

**Frontmatter YAML Parsing:**
- Files: `get-shit-done/bin/gsd-tools.js` (lines 280-340)
- Why fragile: Nested YAML parsing uses string manipulation (`content.slice()`, `indexOf('\n')`) instead of proper YAML parser. Breaks with complex structures or special characters.
- Safe modification: Use `yaml` npm package instead of manual parsing. Add schema validation with `ajv`.
- Test coverage: `gsd-tools.test.js` has 22 tests but doesn't cover all YAML edge cases (comments, multiline strings, etc.)

**Phase Directory Naming Normalization:**
- Files: `get-shit-done/bin/gsd-tools.js` (line 2456: `normalizePhaseName()`)
- Why fragile: Converts phase numbers to directory names but logic is spread across multiple functions. If phase naming convention changes, needs updates in 3+ places.
- Safe modification: Create phase name lookup table at startup. Reference everywhere instead of recalculating.
- Test coverage: No dedicated tests for normalization edge cases (decimal phases, special characters, etc.)

**Config.json Merge Logic:**
- Files: `get-shit-done/bin/gsd-tools.js` (lines 626-690)
- Why fragile: Deep merge for nested objects uses recursive logic without depth limits. Could cause stack overflow with very deep structures.
- Safe modification: Use `deepMerge()` from lodash or similar tested library instead of custom logic.
- Test coverage: Only tested with standard config shapes, not adversarial deeply nested structures.

## Scaling Limits

**File Enumeration Performance:**
- Current capacity: Handles ~500 files per phase directory reasonably
- Limit: At 10,000+ files per phase, `fs.readdirSync()` becomes slow and memory-intensive
- Scaling path: Implement lazy loading. Only read file counts when needed. Cache metadata in `.planning/.cache/phase-index.json`.

**Markdown Document Size:**
- Current capacity: ROADMAP.md and STATE.md up to ~100KB perform OK
- Limit: At 1MB+ sizes, regex operations and string slicing become slow
- Scaling path: Split large documents into per-phase files. Implement chunked reading with streaming.

**JSON Output Size:**
- Current capacity: Commands return JSON up to ~5MB comfortably
- Limit: At 50MB+ (very large projects with 1000+ phases), parsing and serialization is slow
- Scaling path: Stream JSON output. Implement pagination for list operations.

## Dependencies at Risk

**Custom Error Handling Instead of Try/Catch:**
- Risk: Bare `catch {}` blocks mean errors are silently suppressed. Difficult to debug when operations fail.
- Impact: User gets "command failed" with no indication of why
- Migration plan: Standardize on proper error logging. Create `ErrorHandler` utility that logs, formats, and reports errors consistently.

**No Async/Promise Support:**
- Risk: Tool is synchronous only. Blocking operations (file I/O, git commands) could hang under high load.
- Impact: CI/CD pipelines or concurrent tool usage could deadlock
- Migration plan: Convert to async/await where beneficial. Maintain backwards compatibility with sync API.

**Embedded Bash Command Execution:**
- Risk: Multiple `execSync()` calls execute bash directly. Vulnerable to injection if arguments aren't properly escaped.
- Impact: Low current risk but limits user-provided input safety
- Migration plan: Use Node.js APIs instead of bash where possible. Validate all arguments before shell execution.

## Missing Critical Features

**No Dry-Run Mode:**
- Problem: Destructive operations (phase remove, milestone complete) execute immediately. No way to preview changes.
- Blocks: Users can't safely test phase operations before committing them
- Fix: Add `--dry-run` flag that shows what would happen without modifying files

**No Rollback Capability:**
- Problem: Phase operations modify ROADMAP, STATE, and directory structure. If something breaks, manual cleanup required.
- Blocks: Complex phase operations are risky. Users avoid them.
- Fix: Create `.planning/.backups/` directory. Store STATE and ROADMAP snapshots before major operations. Add `--undo` command.

**No Operation Logging:**
- Problem: Which user ran which command when? No audit trail.
- Blocks: Multi-user projects can't track who did what
- Fix: Create `.planning/.log/operations.jsonl` with timestamps, user (from git config), command, and result

## Test Coverage Gaps

**Silent Error Handling Not Tested:**
- What's not tested: Behavior when files don't exist, git commands fail, JSON parsing breaks
- Files: All error cases in `get-shit-done/bin/gsd-tools.js`
- Risk: Regressions go unnoticed. Error messages are unclear.
- Priority: HIGH - These affect user experience most

**Edge Cases in Regex Parsing:**
- What's not tested: ROADMAP with unusual formatting, STATE.md with special characters, phase names with unicode
- Files: `cmdRoadmapAnalyze()`, `cmdStateGet()` (lines 2422-2550, 1010-1076)
- Risk: Silent parsing failures. Phase discovery breaks with non-ASCII names.
- Priority: MEDIUM - Low probability but high impact

**Path Traversal & Security:**
- What's not tested: Paths with `../`, symlinks to parent directory, absolute paths in arguments
- Files: `get-shit-done/bin/gsd-tools.js` (lines 2240-2280)
- Risk: Unintended file access. Low risk in local context but poor practice.
- Priority: MEDIUM - Security best practices

**Very Large File Operations:**
- What's not tested: ROADMAP > 10MB, STATE > 5MB, phases directory with 10,000+ files
- Files: File I/O operations throughout
- Risk: Performance degradation, memory spikes
- Priority: LOW - Only affects very large projects

---

*Concerns audit: 2026-02-10*
