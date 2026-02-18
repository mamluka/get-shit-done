<purpose>
Display all projects with status at a glance. Provides overview of all projects in the repository.
</purpose>

<process>

## 1. Setup

```bash
INIT=$(node ./gsd-pm/bin/gsd-tools.js init list-projects --raw)
```

Parse JSON for: `projects`, `active_project`, `project_count`.

## 2. Handle No Projects

If `project_count` === 0:
  Display: "No projects yet. Create one with /gsd-pm:new-project"
  Exit.

## 3. Display Projects

**Per user decision: Separate command for project overview with status at a glance.**

Display table format:

```
Projects ({project_count}):

| # | Project             | Slug                | Version | Status  |
|---|---------------------|---------------------|---------|---------|
| 1 | Mobile App Redesign | mobile-app-redesign | v2      | ACTIVE  |
| 2 | Backend API         | backend-api         | v1      |         |
| 3 | Data Pipeline       | data-pipeline       | v1      |         |
```

Build table from projects array:
- Number column: 1-based index
- Project column: `name` field (friendly name)
- Slug column: `slug` field
- Version column: `currentVersion` field
- Status column: "ACTIVE" if `active` is true, else empty

After table, display available commands:

```
Commands:
  /gsd-pm:switch-project — switch active project
  /gsd-pm:new-project — create a new project
  /gsd-pm:progress — view active project status
```

</process>

<success_criteria>
- [ ] All projects displayed in table format
- [ ] Active project clearly marked
- [ ] Friendly names and versions shown
- [ ] User knows how to switch projects
</success_criteria>
