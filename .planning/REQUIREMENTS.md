# Requirements: GSD for PMs

**Defined:** 2026-02-10
**Core Value:** PMs can go from idea to fully planned, phase-by-phase project specification using a conversational AI workflow

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Planning Infrastructure

- [ ] **INFRA-01**: All file operations in gsd-tools.js use a path abstraction layer that resolves paths relative to current project and version
- [ ] **INFRA-02**: Each project is stored in its own folder at `.planning/{project-name}/`
- [ ] **INFRA-03**: Each milestone within a project is stored at `.planning/{project-name}/v{N}/` with full planning artifacts (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, config.json, phases/)
- [ ] **INFRA-04**: STATE.md tracks `current_project` and `current_version` fields so commands know which project/milestone is active
- [ ] **INFRA-05**: Existing flat `.planning/` structure is automatically detected and user is offered migration to the new nested structure

### Git Integration

- [ ] **GIT-01**: Creating a new project creates a `project/{name}` git branch and switches to it
- [ ] **GIT-02**: Completing a milestone creates an annotated git tag on the project branch (e.g., `project-{name}-v{N}`)
- [ ] **GIT-03**: Project names are validated and sanitized for safe use as git branch names and folder names (alphanumeric, hyphens, lowercase)

### Workflow

- [ ] **WKFL-01**: Execution workflows are removed: execute-phase, execute-plan, verify-phase commands no longer exist
- [ ] **WKFL-02**: Execution agents are removed: gsd-executor and gsd-verifier agent definitions no longer exist
- [ ] **WKFL-03**: After a PM marks a phase as complete, the workflow automatically advances to planning the next phase without requiring a separate command
- [ ] **WKFL-04**: Before auto-advancing, the system validates that the current phase has complete plans and all mapped requirements are addressed
- [ ] **WKFL-05**: PM can run `/gsd:edit-phase {N}` to revise any planning artifact (plan, requirements mapping, roadmap structure) for a given phase
- [ ] **WKFL-06**: When the last phase is marked complete, the system prompts for milestone completion instead of advancing

### Jira Integration

- [ ] **JIRA-01**: Before creating a new project, the system checks if a Jira MCP server is configured and available
- [ ] **JIRA-02**: If Jira MCP is not found, the system warns the user and provides setup instructions but does not block project creation

### PM Experience

- [ ] **PMX-01**: Error messages use business language instead of developer terminology (e.g., "project header" not "frontmatter YAML")
- [ ] **PMX-02**: All commands that remove execution-related features show helpful redirects (e.g., "This is a planning-only tool. Use /gsd:plan-phase instead.")

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Planning Infrastructure

- **INFRA-06**: Dual-mode auto-detection supports both flat and nested folder structures simultaneously without configuration
- **INFRA-07**: Active project can be switched via `/gsd:switch-project {name}` command

### Workflow

- **WKFL-07**: Auto-advance can be paused and resumed via `/gsd:pause` and `/gsd:resume` commands
- **WKFL-08**: PM can jump to any phase via `/gsd:goto-phase {N}` regardless of completion order

### Jira Integration

- **JIRA-03**: Jira MCP availability is validated lazily (only when Jira-specific features are used, not at project creation)

### PM Experience

- **PMX-03**: Stakeholder export generates exec-friendly summary from ROADMAP.md and REQUIREMENTS.md
- **PMX-04**: `--verbose` flag on all commands shows technical details for support/debugging while default output stays PM-friendly

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Jira sync (push artifacts to Jira) | Unclear if needed; one-way sync creates divergence |
| Cross-project search | Grows important at scale but not needed for launch |
| Cross-project learning | High complexity; requires multi-project pattern matching |
| Real-time collaboration | Markdown + Git handles async collaboration |
| Custom report templates | Beyond exec summary; defer until PM teams validate core |
| Drag-and-drop phase reordering | CLI tool, not GUI; decimal phase insertion exists |
| Story points estimation | False precision; complexity flags (LOW/MEDIUM/HIGH) sufficient |
| Code execution capability | Deliberately removed — this is planning-only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | TBD | Pending |
| INFRA-02 | TBD | Pending |
| INFRA-03 | TBD | Pending |
| INFRA-04 | TBD | Pending |
| INFRA-05 | TBD | Pending |
| GIT-01 | TBD | Pending |
| GIT-02 | TBD | Pending |
| GIT-03 | TBD | Pending |
| WKFL-01 | TBD | Pending |
| WKFL-02 | TBD | Pending |
| WKFL-03 | TBD | Pending |
| WKFL-04 | TBD | Pending |
| WKFL-05 | TBD | Pending |
| WKFL-06 | TBD | Pending |
| JIRA-01 | TBD | Pending |
| JIRA-02 | TBD | Pending |
| PMX-01 | TBD | Pending |
| PMX-02 | TBD | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18 ⚠️

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after initial definition*
