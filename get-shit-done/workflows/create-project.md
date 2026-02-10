<purpose>
Create a new project with isolated folder structure for multi-project planning support. This enables managing multiple distinct projects within one repository.
</purpose>

<process>

## 1. Setup

```bash
INIT=$(node ./get-shit-done/bin/gsd-tools.js init create-project --raw)
```

Parse JSON for: `planning_exists`, `existing_projects`, `has_flat_structure`, `commit_docs`.

If `!planning_exists`:
```bash
mkdir -p .planning
```

## 2. Collect Project Details

**Interactive prompting with name + description per user decision.**

Ask inline (freeform): "What's the name of this project?"

Wait for response. Accept friendly names with spaces, special characters, etc.

Preview the auto-generated slug:
```
Folder name will be: {slug}
```

(Use `node ./get-shit-done/bin/gsd-tools.js generate-slug "{name}"` to show preview)

Ask inline (freeform): "Brief description (one line — helps when listing projects):"

Wait for response.

## 3. Migration Check

**Per user decision: Migration only triggered when creating second project.**

If `has_flat_structure` AND `existing_projects.length` === 0:
- This means flat .planning/ structure exists with no projects yet
- This is the first time multi-project is being used
- Display: "I notice you have an existing project in .planning/. To support multiple projects, I'll need to move your existing work into a project folder."
- Ask inline: "I'll move your existing work into a project folder. What should I call it?"
  - Suggest name based on PROJECT.md title if available
  - Or suggest based on directory name
- Note: "Migration workflow will be available after Plan 03 is complete. For now, creating the new project alongside existing flat structure."

## 4. Create Project

```bash
node ./get-shit-done/bin/gsd-tools.js project create "{friendlyName}" "{description}" --raw
```

Parse result JSON for: `slug`, `friendlyName`, `projectPath`, `created`, `error`.

If `error` present: Display error and exit.

Display:
```
Project created:
  Name: {friendlyName}
  Folder: .planning/{slug}/
  Version: v1
```

## 5. Switch Prompt

**Per user decision: Prompt "Switch to it now?" rather than auto-activating.**

Use AskUserQuestion:
- header: "Activate Project"
- question: "Switch to {friendlyName} now?"
- options:
  - "Yes" — Activate this project for all GSD commands
  - "No" — Stay on current project (or no project)

If "Yes":
```bash
node ./get-shit-done/bin/gsd-tools.js project switch "{slug}" --raw
```

Display: "Switched to {friendlyName}. All GSD commands now operate on this project."

If "No":
Display: "Project created but not activated. Run /gsd:switch-project when ready."

## 6. Commit

If `commit_docs`:
```bash
node ./get-shit-done/bin/gsd-tools.js commit "docs: create project {slug}" --files .planning/{slug}/PROJECT.md .planning/{slug}/v1/STATE.md .planning/{slug}/v1/ROADMAP.md .planning/{slug}/v1/REQUIREMENTS.md .planning/{slug}/v1/config.json
```

If user said "Yes" to activation and commit_docs:
```bash
node ./get-shit-done/bin/gsd-tools.js commit "chore: activate project {slug}" --files .planning/.active-project
```

## 7. Next Steps

Display:
```
Ready! Next steps for {friendlyName}:
  /gsd:new-project — initialize project with questioning + research + requirements + roadmap
  /gsd:switch-project — switch between projects
  /gsd:list-projects — see all projects

Note: Run /gsd:new-project while this project is active to complete project initialization.
```

</process>

<success_criteria>
- [ ] .planning/ directory exists
- [ ] User provided project name and description
- [ ] Migration check performed if flat structure detected
- [ ] Project created at .planning/{slug}/v1/
- [ ] PROJECT.md contains friendly name and description
- [ ] STATE.md, ROADMAP.md, REQUIREMENTS.md, config.json created
- [ ] User prompted to activate project
- [ ] If activated, .active-project file written
- [ ] Changes committed if commit_docs enabled
- [ ] User knows next step is /gsd:new-project
</success_criteria>
