<purpose>
Display all projects with status at a glance.
</purpose>

<process>

## 1. Setup

```bash
INIT=$(node ./.claude/get-shit-done/bin/gsd-tools.js init list-projects)
```

Parse JSON for: `projects`, `active_project`, `project_count`.

## 2. Handle No Projects

If `project_count === 0`:
```
No projects yet. Create one with /gsd:create-project
```
Exit workflow.

## 3. Display Projects

**Per user decision: Separate command for project overview with status at a glance.**

Display table format:

```
Projects (${project_count}):

| # | Project | Slug | Version | Status |
|---|---------|------|---------|--------|
${for each project in projects with index i:}
| ${i+1} | ${project.name} | ${project.slug} | ${project.currentVersion} | ${project.active ? 'ACTIVE' : ''} |
${end for}

Commands:
  /gsd:switch-project — switch active project
  /gsd:create-project — create a new project
```

</process>
