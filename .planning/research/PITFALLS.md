# Pitfalls Research

**Domain:** CLI Framework Adaptation (Developer Tool to PM Planning Tool)
**Researched:** 2026-02-10
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Hardcoded Path References Scattered Across the Codebase

**What goes wrong:**
The existing GSD framework has `.planning/` paths hardcoded throughout gsd-tools.js (4,597 lines), agent prompts (11 files), workflow templates (30+ files), and references. When changing from flat `.planning/` to nested `.planning/{project-name}/v{N}/`, every single reference must be updated or the system will write files to the wrong location, read from empty directories, and silently fail operations.

**Why it happens:**
Path construction in CLI tools often evolves organically - `path.join('.planning', 'STATE.md')` gets copied across the codebase without abstraction. The CONCERNS.md analysis shows "Embedded Path Construction Without Validation" is already flagged as technical debt (lines 25-29), with paths joined via `path.join()` but rarely validated. The root cause is small: a hardcoded slash, a missing parent folder, or a filename built from input that contains characters your filesystem rejects.

**How to avoid:**
1. **Pre-Migration Audit Phase:** Grep for all `.planning` references before any refactoring begins
   - `grep -r "\.planning" --include="*.js" --include="*.md"`
   - Document every location in a migration checklist
   - Estimate 50-100+ locations based on codebase size

2. **Path Abstraction Layer:** Create `getProjectPath(projectName, version, ...pathSegments)` utility
   - Single source of truth for path construction
   - Handles project name sanitization (spaces, special chars)
   - Validates paths are within project boundaries (no `../` traversal)
   - Example: `getProjectPath('pm-tool', 1, 'STATE.md')` → `.planning/pm-tool/v1/STATE.md`

3. **Incremental Migration Strategy:**
   - Phase 1: Add path abstraction alongside existing hardcoded paths
   - Phase 2: Replace paths in gsd-tools.js (highest risk)
   - Phase 3: Update agent prompts and workflows
   - Phase 4: Template updates and references
   - Add style rule: no new manual path concatenation for `.planning/`

4. **Backwards Compatibility:**
   - Keep flat structure detection for existing installations
   - Auto-migration offer: "Detected flat structure. Migrate to project-based? [y/N]"
   - Don't break users who haven't migrated yet

**Warning signs:**
- File operations succeed but files end up in `.planning/` root instead of project folders
- STATE.md reads return empty/default values despite successful writes
- Commands report "Phase not found" when phases exist
- Git commits miss files because they're in unexpected locations
- Tests pass but manual testing shows wrong behavior (paths mocked)

**Phase to address:**
Phase 1 (Path Abstraction) - Must happen before any folder restructuring. This is foundational.

---

### Pitfall 2: State Management Assumes Flat Structure

**What goes wrong:**
The existing STATE.md and config.json live at `.planning/STATE.md` and `.planning/config.json` (singular, project-wide). When moving to `.planning/{project}/v{N}/`, state becomes ambiguous: Which project is "current"? Does config apply globally or per-project? Commands that load state without context (`gsd-tools state:get current_phase`) break because there's no single STATE.md anymore.

**Why it happens:**
State management was designed for single-project repos. The CONCERNS.md analysis confirms "STATE.md Parsing" is a fragile area (lines 100-104) using regex to extract field values from markdown - breaks with formatting changes. The current architecture has no concept of multi-project state. Research shows that deeply nested state is not convenient to update, and when possible, prefer to structure state in a flat way (though the old "flat" structure referred to data shape, not file hierarchy).

**How to avoid:**
1. **Active Project Tracking:**
   - New `.planning/.active-project` file containing `{"project": "pm-tool", "version": 1}`
   - Commands default to active project, or require `--project` flag if none active
   - `/gsd:new-project` sets active project on creation
   - `/gsd:switch-project {name}` command to change active project

2. **State Schema Migration:**
   - Add `project_name` and `milestone_version` fields to STATE.md frontmatter
   - Global state (shared across projects): `.planning/config.json` (model profiles, git settings)
   - Per-project state: `.planning/{project}/v{N}/STATE.md` (phase, plan status, decisions)
   - Per-project overrides: `.planning/{project}/v{N}/config.json` (optional, merges with global)

3. **Config Hierarchy:**
   - Load order: Global config → Project config → CLI flags
   - Document precedence clearly in help text and error messages
   - Add `gsd-tools config:show --source` to debug which config was used (addresses Model Resolution issue in CONCERNS.md lines 52-56)

4. **State Commands Update:**
   - `gsd-tools state:get` → reads active project's STATE.md
   - `gsd-tools state:get --project pm-tool` → reads specific project
   - `gsd-tools state:list-projects` → shows all projects with their current phase
   - Error messages must include project context: "Phase 3 not found in project 'pm-tool' v1"

**Warning signs:**
- "Phase not found" errors despite correct phase existing
- State updates to one project affect another project
- Config changes apply globally when user expects project-specific
- `git status` shows STATE.md modified in multiple project folders after single command
- Commands work after fresh clone but break with multiple projects

**Phase to address:**
Phase 1 (State Refactoring) - Must happen in parallel with path abstraction. These are co-dependent.

---

### Pitfall 3: Git Branch Strategy Assumes Single Project

**What goes wrong:**
The new design requires `project/{name}` branches with git tags for milestones. But programmatic git operations are error-prone: Branch creation can fail if name contains invalid characters, switching branches can fail with uncommitted changes, tags can conflict across projects, and branch deletion requires force flags. The CONCERNS.md analysis shows "Git Command Shell Injection Risk" (lines 45-50) where commit messages with backticks or shell metacharacters can cause issues.

**Why it happens:**
Git branching strategies become complex when implemented programmatically. Research shows GitFlow's elaborate dance—with develop branches, release branches, and hotfix branches—becomes pure overhead when shipping continuously. The branching strategy that worked in 2018 might actively hold you back in 2026. Release branch management requires applying changes twice: once to release branch, then to main code line, and working with two branches is extra work that's easy to forget.

**How to avoid:**
1. **Branch Naming Validation:**
   - Sanitize project names before branch creation: lowercase, replace spaces with hyphens, strip special chars
   - Validate against git branch naming rules: no spaces, no `~^:?*[`, no double dots `..`
   - Test pattern: `git check-ref-format --branch "project/{sanitized-name}"`
   - Store original project name separately from branch name

2. **Graceful Branch Operations:**
   ```javascript
   // Before branch creation
   if (hasUncommittedChanges()) {
     error("Uncommitted changes. Commit or stash first.");
     return;
   }

   // Before branch switch
   if (branchExists(`project/${name}`)) {
     exec(`git checkout project/${name}`);
   } else {
     exec(`git checkout -b project/${name}`);
   }

   // Use execSync with { shell: false } to prevent injection
   execFileSync('git', ['checkout', '-b', branchName], { stdio: 'inherit' });
   ```

3. **Milestone Tag Strategy:**
   - Tag naming: `project-{name}-milestone-{N}` (e.g., `project-pm-tool-milestone-1`)
   - Prevents tag conflicts across projects
   - Annotated tags with metadata: `git tag -a {tag} -m "Milestone {N}: {description}"`
   - Tag list command: `git tag -l "project-{name}-*"`

4. **Working Directory Safety:**
   - Check `git status --porcelain` before destructive operations
   - Offer to commit, stash, or abort on uncommitted changes
   - Never auto-commit without user confirmation (violates git best practices)

5. **Main Branch Protection:**
   - Keep main/master clean - never commit project work directly
   - All planning work happens on `project/{name}` branches
   - Merge to main only when user explicitly requests (optional workflow)

**Warning signs:**
- "fatal: branch name contains invalid characters" errors
- Branch creation succeeds but files disappear (wrong branch context)
- Git tag conflicts: "tag already exists"
- Commands hang waiting for git operations
- Uncommitted changes lost during branch switches
- Project files end up on main branch instead of project branch

**Phase to address:**
Phase 2 (Git Integration) - After path and state refactoring. Requires stable state management to track branch context.

---

### Pitfall 4: Auto-Advance Workflow Without Validation Gates

**What goes wrong:**
The requirement states "marking phase complete auto-advances to planning next phase." This creates a dangerous pattern: If phase completion logic is buggy, users get stuck in an infinite loop of auto-advancing through phases they didn't complete. Or worse, incomplete phases get marked "complete" triggering advancement, and users don't notice until much later. Research shows that traditional approaches to building state machines involve managing retry logic, handling timeouts, dealing with partial failures—complexity that grows exponentially with each service added.

**Why it happens:**
Auto-advancing workflows optimize for happy path (user completes phase, immediately wants next phase) but ignore edge cases: What if completion check is wrong? What if user wants to pause? What if next phase is blocked? Current state machines often fail to plan for failures using retries and saga compensations, assuming services will never fail - a dangerous assumption in distributed systems.

**How to avoid:**
1. **Explicit Validation Gates:**
   - Phase completion requires explicit criteria met (not just "files exist")
   - Verify: All plans have summaries, all requirements mapped, success criteria documented
   - Show completion status: "Phase 3: 3/3 plans complete, 12/12 requirements addressed ✓"
   - Don't auto-advance until validation passes

2. **User Confirmation Before Advance:**
   - After marking phase complete, show: "Phase 3 complete. Start planning Phase 4? [Y/n/pause]"
   - Default to yes but require keypress (prevents accidental advancement)
   - "pause" option commits current state without advancing
   - "n" completes phase without advancement (user can manually advance later)

3. **Advancement State Tracking:**
   - STATE.md tracks: `last_completed_phase`, `last_advanced_phase`, `auto_advance_paused`
   - If advancement fails (e.g., next phase doesn't exist in roadmap), record in STATE.md
   - Don't retry failed advancement automatically - requires manual intervention
   - Log advancement history: "Phase 3 completed 2026-02-10, advanced to Phase 4 planning"

4. **Escape Hatches:**
   - `/gsd:pause` command stops auto-advancement (sets flag in state)
   - `/gsd:resume` re-enables auto-advancement
   - `/gsd:goto-phase {N}` manually sets current phase (with confirmation)
   - `/gsd:undo-advance` rolls back last auto-advancement (requires backup)

5. **State Machine Best Practices:**
   - Define valid transitions: planning → executing → verifying → complete → [next phase planning]
   - Prevent invalid transitions: complete → planning (same phase) not allowed
   - Add transition logging for debugging: "STATE transition: phase_2_complete → phase_3_planning"

**Warning signs:**
- User reports "CLI won't stop creating phases"
- Phase counter increments but no work was done
- STATE.md shows `current_phase: 15` but only 3 phases exist in roadmap
- Users asking "How do I stop it from advancing?"
- Completion status shows "2/3 plans complete" but phase marked complete anyway
- Git history shows rapid-fire phase creation commits

**Phase to address:**
Phase 3 (Auto-Advance Implementation) - After git integration. Requires both state management and git operations to be stable.

---

### Pitfall 5: PM-Facing Error Messages Use Developer Terminology

**What goes wrong:**
The target audience is PMs, not developers. But the existing GSD codebase has error messages like "Failed to parse frontmatter YAML", "Git ref validation failed", "Phase directory missing PLAN.md", "State patch operation invalid". PMs don't know what frontmatter is, don't care about git refs, and get frustrated by cryptic errors. Research shows that 63% of developers struggle to integrate AI tools effectively - imagine how much worse it is for non-technical users.

**Why it happens:**
Developer tools are built by developers for developers. The current GSD system assumes technical literacy. When adapting for PMs, we need to translate technical concepts into business language. Research emphasizes that error validation strategies are often neglected in product design, despite being crucial to ensuring smooth UX. Best practices include always identifying and describing errors to users when they occur and providing solutions to fix errors if possible.

**How to avoid:**
1. **Error Message Translation Layer:**
   ```javascript
   // Before (developer-facing)
   error("Failed to parse frontmatter YAML in STATE.md line 3");

   // After (PM-facing)
   error("Project status file is corrupted. Try running '/gsd:repair' or contact support.");

   // Before
   error("Git ref validation failed: invalid characters in branch name");

   // After
   error("Project name contains special characters. Use letters, numbers, and hyphens only.");
   ```

2. **Contextual Help:**
   - Every error message includes: What went wrong (simple language), Why it matters (impact), What to do next (action)
   - Example: "Cannot advance to Phase 4. → Phase 3 still has incomplete plans. → Complete all Phase 3 plans or run '/gsd:skip-phase 3'."

3. **Progressive Disclosure:**
   - Default: Simple, actionable message for PMs
   - `--verbose` flag: Technical details for debugging or support requests
   - Example: "Project status locked. Another process may be using it. [Show details]"
   - Details: "Lockfile exists: .planning/pm-tool/.lock (PID: 12345, created 3m ago)"

4. **Terminology Glossary:**
   - Replace "frontmatter" → "project header"
   - Replace "git branch" → "project workspace"
   - Replace "milestone tag" → "saved milestone"
   - Replace "phase directory" → "phase folder"
   - Replace "PLAN.md" → "phase plan document"

5. **Validation with PM Users:**
   - Before launch, test all error paths with actual PMs
   - Ask: "What would you do next?" after showing error
   - Iterate until 80%+ can resolve errors without technical support

**Warning signs:**
- Support requests: "What's frontmatter?" "What's a ref?" "What does this error mean?"
- Users bypass CLI and manually edit files because errors are confusing
- High rate of "command failed" issues with no resolution
- PMs asking developers to interpret error messages
- Documentation gets filled with "Error X means..." translations

**Phase to address:**
Phase 4 (UX Polish) - After core functionality works. Can be done as final pass before launch.

---

### Pitfall 6: Prerequisite Check for Jira MCP Creates Dependency Hell

**What goes wrong:**
The requirement states "verify Jira MCP is installed before new project, prompt if missing." But MCP prerequisite checking is fragile: How do you detect if MCP is installed? What if it's installed but not configured? What if user has different MCP implementation? What if network is down when checking Jira availability? What if Jira MCP version is incompatible? Prerequisite validation often becomes a blocker rather than a helper.

**Why it happens:**
Installation validation seems simple but has many edge cases. Research shows teams invest significant time developing fully featured products before validating core concepts with users - this applies to prerequisites too. You assume "check if installed" is straightforward, but it requires: Finding the MCP binary/config, parsing version info, testing connectivity, handling timeouts, providing clear feedback if failed. The CONCERNS.md analysis already flags "No Input Validation Consistency" (lines 19-23) where some commands validate parameters and others crash on edge cases.

**How to avoid:**
1. **Soft Prerequisites (Recommended):**
   - Don't block project creation if Jira MCP missing
   - Show warning: "Jira MCP not detected. Some features unavailable. Continue? [Y/n]"
   - Disable Jira-dependent features gracefully (e.g., Jira sync command returns "Requires Jira MCP")
   - Allow user to continue with core planning features

2. **Lazy Validation:**
   - Check Jira MCP only when Jira features are used, not at project creation
   - `/gsd:jira-sync` checks for Jira MCP, fails fast with clear message if missing
   - Cache validation result: "Jira MCP: available ✓" stored in config.json
   - Re-validate if cache is older than 24 hours

3. **Clear Installation Guidance:**
   - If Jira MCP missing, provide exact installation command: "Install: npm install @modelcontextprotocol/server-jira"
   - Link to official docs: https://modelcontextprotocol.io/docs/servers/jira
   - Show post-install verification: "Run '/gsd:check-prerequisites' to verify"

4. **Graceful Degradation:**
   - Core features work without Jira MCP: Project creation, research, requirements, roadmap, phase planning
   - Optional features require Jira MCP: Jira sync, issue import, sprint alignment
   - UI clearly shows which features are available: "Jira sync: unavailable (MCP not installed)"

5. **Configuration Options:**
   - `skip_prerequisite_checks: true` in config.json disables all checks (for air-gapped environments)
   - Per-feature flags: `enable_jira: false` disables Jira features entirely
   - Don't force prerequisites on users who don't need them

**Warning signs:**
- Users can't create projects because prerequisite check fails
- Installation hangs checking for Jira MCP (network timeout)
- False positives: Jira MCP "not found" but it's actually installed
- False negatives: Jira MCP "found" but version incompatible
- Users in air-gapped environments can't use tool at all
- Support requests: "How do I skip the Jira check?"

**Phase to address:**
Phase 5 (MCP Integration) - After core PM planning workflow is stable. Jira is optional, not foundational.

---

### Pitfall 7: Migration Path for Existing GSD Users Not Considered

**What goes wrong:**
Existing GSD installations have projects in flat `.planning/` structure. When upgrading to PM-focused version, their projects break: Commands can't find STATE.md, phases disappear, roadmap parsing fails. Users are forced to choose: Stay on old version (miss new features) or upgrade and manually migrate (high friction). No migration path means existing users won't adopt new version.

**Why it happens:**
New features focus on new users, not existing users. The CONCERNS.md analysis emphasizes "File Write Without Backup" (lines 72-76) where operations overwrite files without backup - if migration fails, user loses data. Research shows that hardcoded configuration values create brittle systems that break during infrastructure changes. The requirement states "Changes should not break existing GSD installations that use execution" but doesn't specify how.

**How to avoid:**
1. **Version Detection:**
   - On first run after upgrade, detect flat structure: `.planning/STATE.md` exists but `.planning/.version` doesn't
   - Show message: "Detected GSD v1 project. Migrate to v2 project structure? [y/N]"
   - Store version: `.planning/.version` file with `{"schema_version": 2}`

2. **Automated Migration:**
   ```
   gsd-tools migrate:to-v2 --project-name "my-project"

   Steps:
   1. Backup current .planning/ to .planning-backup-{timestamp}/
   2. Create .planning/my-project/v1/
   3. Move STATE.md, config.json, ROADMAP.md, REQUIREMENTS.md → v1/
   4. Move phases/ → v1/phases/
   5. Create .planning/.active-project
   6. Create .planning/.version
   7. Verify all files accessible
   8. Commit migration: "Migrate to GSD v2 project structure"
   ```

3. **Dual-Mode Support (Compatibility Layer):**
   - Commands auto-detect structure: If `.planning/STATE.md` exists (v1), use flat paths
   - If `.planning/{project}/v{N}/STATE.md` exists (v2), use nested paths
   - Maintain dual-mode for 6-12 months, then deprecate v1 with warnings

4. **Migration Validation:**
   - After migration, run verification: "Migration complete. Verifying..."
   - Check: All phases present, STATE.md readable, ROADMAP.md parseable, git history intact
   - If verification fails, offer rollback: "Restore from backup? [y/N]"

5. **Clear Deprecation Timeline:**
   - GSD v2.0: Dual-mode support, migration encouraged
   - GSD v2.5 (6mo later): Warnings on v1 structure "Upgrade recommended"
   - GSD v3.0 (12mo later): v1 structure deprecated, requires migration

**Warning signs:**
- Existing users report "All my phases disappeared"
- "STATE.md not found" errors after upgrade
- Users manually reinstalling old version
- Migration script fails halfway, leaves project in broken state
- No way to verify migration succeeded
- Git history lost after migration

**Phase to address:**
Phase 1 (Path Abstraction) - Must be designed from the start. Retrofitting migration is much harder.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip path abstraction, update hardcoded paths manually | Faster initial implementation (saves 2-3 days) | Every new feature requires path updates in 50+ locations. High regression risk. | Never - foundational mistake |
| Store active project in memory, not file | Simpler implementation (no file I/O) | Context lost between CLI invocations. User must pass --project every time. | Never - unusable UX |
| Auto-advance without confirmation | Smoother workflow (fewer clicks) | Users lose control, can't pause, hard to debug issues. | Only with explicit escape hatches |
| Generic error messages "Operation failed" | Less translation work upfront | PM users can't self-service, high support burden. | Never - core UX requirement |
| Skip migration path for v1 users | Focus on new users only | Existing users can't upgrade, community splits into v1/v2. | Never - kills adoption |
| Synchronous git operations block CLI | Simpler sync code (no promises) | CLI hangs during git operations, feels broken on slow networks. | MVP only, fix in Phase 2 |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Git operations | Assuming git available and configured | Check `git --version` succeeds, verify `.git/` exists, validate git config has user.name/email |
| Jira MCP | Blocking project creation if MCP missing | Soft prerequisite: warn but allow continuation. Lazy validation when Jira features used. |
| File system | Assuming paths are writable | Check write permissions before operations. Create directories if missing. Handle EACCES gracefully. |
| Node.js modules | Using `require()` for dynamic paths | Use absolute paths or path.resolve(). Relative paths break depending on CWD. |
| Shell commands | Building commands via string interpolation | Use execFileSync() with argument array to prevent injection. Quote all user input. |
| State files | Assuming STATE.md exists and is valid | Default empty state if file missing. Validate schema on load. Provide repair command if corrupted. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full roadmap parse on every command | CLI feels slow (1-2 second lag) | Cache parsed roadmap in memory or .planning/.cache/roadmap.json with mtime check | >20 phases, >500KB ROADMAP.md |
| Recursive directory reads without limits | Commands hang, high memory usage | Stream directory contents, paginate results, limit depth to 3 levels | >10,000 files per project |
| Regex parsing of large markdown files | Slow phase discovery, timeout on large files | Use streaming parser or split large files. Add size limits (warn if >1MB). | ROADMAP.md >5MB |
| Synchronous file I/O in loops | CLI freezes during phase enumeration | Batch file operations, use async I/O, parallel reads where safe | >100 phases, >50 projects |
| Git operations without timeout | CLI hangs if git operation stalls | Set timeout on all git commands: execSync(..., {timeout: 10000}) | Slow network, large repos |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Path traversal in project names | User creates project with name "../../etc", writes outside .planning/ | Validate project names: alphanumeric + hyphens only. Reject paths with .. or / |
| Shell injection in git commit messages | Malicious commit message with backticks executes commands | Use execFileSync() with array args, not string interpolation. Escape all input. |
| Secrets in STATE.md or config.json | API keys committed to git, exposed in logs | Never store secrets in planning files. Use environment variables. Mask in output. |
| Unrestricted file writes | Malicious template could write to system directories | Restrict all file operations to .planning/ and subdirectories. Validate paths. |
| Git operations on untrusted repos | Cloning malicious repo could execute hooks | Warn if .git/hooks/ contains scripts. Disable hooks during automated operations. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress feedback for long operations | User thinks CLI is frozen, Ctrl+C kills operation | Show progress: "Analyzing phases... (3/15)", spinner for unknown duration |
| Technical error messages | PM doesn't understand "frontmatter YAML parse error" | Translate to business language: "Project header corrupted, run /gsd:repair" |
| Auto-advance without confirmation | User loses control, phases advance unexpectedly | Require keypress confirmation: "Phase complete. Start Phase 4? [Y/n]" |
| No undo for destructive operations | User accidentally deletes phase, loses work | Add confirmation prompts, create backups, provide rollback command |
| Commands require memorizing flags | User forgets syntax, constantly refers to docs | Interactive mode: prompt for missing args. Provide examples in help text. |
| Silent failures | Command exits with no feedback, user doesn't know if it worked | Always show result: "✓ Phase 3 created" or "✗ Failed to create phase: reason" |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Path Refactoring:** Paths updated in main logic but not in agent prompts, workflow templates, or reference docs - verify with full-text search for `.planning/`
- [ ] **State Management:** STATE.md works for single project but not tested with multiple simultaneous projects - verify by creating 3 projects in parallel
- [ ] **Git Branch Creation:** Branch creation works with simple names but fails with special characters, spaces, or Unicode - verify with edge case project names
- [ ] **Auto-Advance:** Advancement works on happy path but not tested when next phase doesn't exist in roadmap - verify by completing last phase
- [ ] **Error Messages:** Technical errors translated to PM language but verbose mode doesn't provide technical details for support - verify all error paths have both modes
- [ ] **Migration:** Migration script works on test projects but not tested on real user projects with custom structures - verify with varied v1 project layouts
- [ ] **Prerequisite Checks:** Jira MCP check works when installed but doesn't gracefully degrade when missing - verify uninstalled and misconfigured states
- [ ] **Multi-User:** Single user workflow works but not tested with concurrent git operations from multiple users - verify with parallel CLI invocations

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hardcoded paths used wrong locations | LOW | 1. Identify wrong location 2. Move files to correct structure 3. Update paths 4. Verify with test commands |
| State corruption from concurrent operations | MEDIUM | 1. Restore STATE.md from .planning/.backups/ 2. Replay operations manually 3. Add locking mechanism |
| Git branch name invalid characters | LOW | 1. Delete invalid branch 2. Sanitize project name 3. Recreate branch 4. Re-apply commits |
| Auto-advance loop (infinite phase creation) | HIGH | 1. Stop CLI 2. Manually edit STATE.md to remove auto-advance phases 3. Fix completion logic 4. Add validation gates |
| Jira MCP prerequisite blocks all operations | LOW | 1. Set skip_prerequisite_checks: true in config 2. Restart command 3. Fix prerequisite logic to be soft check |
| Migration failed halfway | MEDIUM | 1. Restore from .planning-backup-{timestamp}/ 2. Investigate failure cause 3. Fix migration script 4. Re-run with dry-run flag |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hardcoded path references | Phase 1: Path Abstraction | Grep for `.planning/` returns only abstraction layer, not hardcoded paths |
| State management flat assumption | Phase 1: State Refactoring | Create 3 projects, verify state isolated, config hierarchy works |
| Git branch strategy assumptions | Phase 2: Git Integration | Create projects with edge-case names, verify branch creation succeeds |
| Auto-advance without validation | Phase 3: Auto-Advance Implementation | Complete phase with incomplete plans, verify advancement blocked |
| PM-facing error terminology | Phase 4: UX Polish | Trigger all error paths, verify messages use business language |
| Jira MCP prerequisite dependency | Phase 5: MCP Integration | Uninstall Jira MCP, verify tool still usable for core features |
| Migration path for existing users | Phase 1: Path Abstraction | Test migration on real v1 projects, verify data preserved |

## Sources

### Code Refactoring and Folder Structure
- [Code Refactoring Best Practices - Tembo](https://www.tembo.io/blog/code-refactoring)
- [Code Refactoring: 6 Techniques and 5 Critical Best Practices - CodeSee](https://www.codesee.io/learning-center/code-refactoring)
- [Terraform Files and Folder Structure - env0](https://www.env0.com/blog/terraform-files-and-folder-structure-organizing-infrastructure-as-code)

### Developer Tools for Non-Developers
- [10 Common Mistakes Developers Make with AI Code Assistants - Ryz Labs](https://learn.ryzlabs.com/ai-coding-assistants/10-common-mistakes-developers-make-with-ai-code-assistants-and-how-to-avoid-them)
- [6 things developer tools must have in 2026 - Evil Martians](https://evilmartians.com/chronicles/six-things-developer-tools-must-have-to-earn-trust-and-adoption)

### Git Workflows and Branching
- [Agile Git Branching Strategies in 2026 - Java Code Geeks](https://www.javacodegeeks.com/2025/11/agile-git-branching-strategies-in-2026.html)
- [Git Branching Strategy Guide - DataCamp](https://www.datacamp.com/tutorial/git-branching-strategy-guide)
- [The Non-Technical Guide to Git for Product Managers - Medium](https://medium.com/womenintechnology/the-non-technical-guide-to-git-for-product-managers-cdf69e281b9d)
- [Not just for developers: How GitHub teams use Copilot - GitHub Blog](https://github.blog/ai-and-ml/github-copilot/not-just-for-developers-how-product-and-security-teams-can-use-github-copilot/)

### Path Refactoring and Migration
- [Django Migrations: FileSystemStorage Path Hardcoding - pythontutorials.net](https://www.pythontutorials.net/blog/django-migrations-and-filesystemstorage-depending-on-settings/)
- [5 Critical ETL Pipeline Design Pitfalls - Airbyte](https://airbyte.com/data-engineering-resources/etl-pipeline-pitfalls-to-avoid)
- [Lift & Shift vs Refactor: AWS Migration Strategy - Medium](https://medium.com/@arantika129bagewadi/lift-shift-vs-refactor-choosing-the-right-aws-migration-strategy-2214b515b30f)

### State Management
- [Choosing the State Structure - React Docs](https://react.dev/learn/choosing-the-state-structure)
- [State Design Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/state)

### Workflow State Machines
- [Workflow Engine vs. State Machine - Workflow Engine](https://workflowengine.io/blog/workflow-engine-vs-state-machine/)
- [State Machine Workflows - Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/framework/windows-workflow-foundation/state-machine-workflows)

### UX and Validation
- [13 UX Design Mistakes You Should Avoid in 2026 - Tenet](https://www.wearetenet.com/blog/ux-design-mistakes)
- [Building UX for Error Validation Strategy - Medium](https://medium.com/@olamishina/building-ux-for-error-validation-strategy-36142991017a)
- [A Complete Guide To Live Validation UX - Smashing Magazine](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)

### Project Management
- [6 Steps to Requirements Gathering for Project Success - Asana](https://asana.com/resources/requirements-gathering)
- [What Is a Project Management Plan? - Productive.io](https://productive.io/blog/project-management-plan/)
- [Project milestones: strategic planning and execution - Monday.com](https://monday.com/blog/project-management/project-milestones/)
- [7 Document Management Best Practices in 2026 - Digital PM](https://thedigitalprojectmanager.com/project-management/document-management-best-practices/)

### Codebase Analysis
- Internal: `.planning/codebase/CONCERNS.md` - Technical debt and fragile areas analysis
- Internal: `.planning/codebase/STRUCTURE.md` - Directory layout and file organization
- Internal: `.planning/PROJECT.md` - Requirements and constraints

---

*Pitfalls research for: GSD PM Planning Tool Modifications*
*Researched: 2026-02-10*
*Confidence: HIGH (based on existing codebase analysis + industry research)*
