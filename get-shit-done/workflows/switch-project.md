<purpose>
Switch the active project. All subsequent GSD commands will operate on the selected project.
</purpose>

<process>

## 1. Setup

```bash
INIT=$(node ./get-shit-done/bin/gsd-tools.js init switch-project --raw)
```

Parse JSON for: `projects`, `active_project`, `has_projects`.

## 2. Handle No Projects

If `!has_projects`:
  Display: "No projects found. Create one with /gsd-pm:new-project"
  Exit.

## 3. Present Projects

**Per user decision: Dedicated command that lists projects, PM picks one.**

Show project list with current active marked:

```
Available projects:

  1. {name} ({slug}) — {currentVersion} [ACTIVE]
     {description}

  2. {name} ({slug}) — {currentVersion}
     {description}

  3. {name} ({slug}) — {currentVersion}
     {description}
```

If only one project exists and it's already active:
  Display: "Only one project exists and it's already active: {name}"
  Exit.

Use AskUserQuestion:
- header: "Switch Project"
- question: "Which project do you want to work on?"
- options: [one per project, showing friendly name and version]

Get selected project slug from user's choice.

## 4. Switch

If selected project is already active:
  Display: "{name} is already the active project."
  Exit.

```bash
node ./get-shit-done/bin/gsd-tools.js project switch "{selectedSlug}" --raw
```

Parse result for: `switched`, `project`, `error`.

If `error` present: Display error and exit.

Display:
```
Switched to {friendlyName}.

All GSD commands now operate on this project.

Next steps:
  /gsd-pm:progress — view project status
  /gsd-pm:plan-phase {N} — plan next phase
```

**Per user decision: Active project shown on every GSD command output.**

Note: All init commands now return `active_project` and `project_name` fields, which workflows can display as context.

</process>

<success_criteria>
- [ ] Projects listed with current active marked
- [ ] User selected project
- [ ] .active-project file updated
- [ ] PathResolver cache cleared
- [ ] User confirmation displayed
- [ ] User knows how to check project status
</success_criteria>
