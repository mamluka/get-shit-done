# Requirements: GSD for PMs

**Defined:** 2026-02-18
**Core Value:** PMs can go from idea to fully planned, phase-by-phase project specification using a conversational AI workflow — producing artifacts that are version-controlled, historically preserved, and ready for handoff to engineering.

## v1.5 Requirements

Requirements for v1.5 Structural Fixes. Each maps to roadmap phases.

### Sync State

- [ ] **SYNC-01**: jira-sync.json is written inside the project folder (`.planning-pm/{name}/v{N}/jira-sync.json`) instead of at root level
- [ ] **SYNC-02**: Existing jira-sync.json references in sync-state module, workflow, and gsd-tools resolve to project folder path

### Folder Rename

- [ ] **FOLD-01**: Planning folder is named `.planning-pm` instead of `.planning` in PathResolver and gsd-tools
- [ ] **FOLD-02**: All workflow files reference `.planning-pm/` instead of `.planning/`
- [ ] **FOLD-03**: All template files reference `.planning-pm/` instead of `.planning/`
- [ ] **FOLD-04**: All agent prompts and command definitions reference `.planning-pm/` instead of `.planning/`
- [ ] **FOLD-05**: Existing `.planning/` folder is migrated to `.planning-pm/` with safe rename

## Future Requirements

None — this is a focused structural fix milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Notion sync path updates | notion-sync.json already uses project folder — no change needed |
| Backward compatibility shim for .planning | Clean break — old path not supported after migration |
| Automated migration script for external users | This is the framework repo itself — migration is direct |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SYNC-01 | — | Pending |
| SYNC-02 | — | Pending |
| FOLD-01 | — | Pending |
| FOLD-02 | — | Pending |
| FOLD-03 | — | Pending |
| FOLD-04 | — | Pending |
| FOLD-05 | — | Pending |

**Coverage:**
- v1.5 requirements: 7 total
- Mapped to phases: 0
- Unmapped: 7 ⚠️

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 after initial definition*
