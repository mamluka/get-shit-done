<purpose>
Switch the active project. All subsequent GSD commands will operate on the selected project.
</purpose>

<process>

## 1. Setup

```bash
INIT=$(node ./.claude/get-shit-done/bin/gsd-tools.js init switch-project)
```

Parse JSON for: `projects`, `active_project`, `has_projects`.

## 2. Handle No Projects

If `!has_projects` or `projects.length === 0`:
```
No projects found. Create one with /gsd:create-project
```
Exit workflow.

## 3. Present Projects

**Per user decision: Dedicated command that lists projects, PM picks one.**

Display project list with current active marked:

```
Available projects:

${for each project in projects:}
  ${project.name} (${project.slug}) — ${project.currentVersion}${project.active ? ' [ACTIVE]' : ''}
  ${project.description}

${end for}
```

Use AskUserQuestion:
- header: "Switch Project"
- question: "Which project do you want to work on?"
- options: [for each project: "${project.name}"]
- capture_as: selectedName

Map selectedName back to slug.

## 4. Switch

```bash
SWITCH_RESULT=$(node ./.claude/get-shit-done/bin/gsd-tools.js project switch "${selectedSlug}")
```

Parse result for `switched` field.

If `switched === true`:
```
Switched to ${selectedName}. All GSD commands now operate on this project.
```

**Per user decision: Active project shown on every GSD command output.** This is already implemented — all init commands now include `active_project` and `project_name` fields in their output.

</process>
