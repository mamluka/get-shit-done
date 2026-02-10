<purpose>
Create a new project with isolated folder structure for multi-project planning support.
</purpose>

<process>

## 1. Setup

```bash
INIT=$(node ./.claude/get-shit-done/bin/gsd-tools.js init create-project)
```

Parse JSON for: `planning_exists`, `existing_projects`, `has_flat_structure`, `commit_docs`.

If `!planning_exists`: Create .planning directory:
```bash
mkdir -p .planning
```

## 2. Collect Project Details

**Per user decision: Interactive prompting with name + description.**

Use AskUserQuestion:
- header: "Project Name"
- question: "What's the name of this project?"
- input_type: "freeform"
- capture_as: friendlyName

Display the auto-generated slug:
```bash
SLUG=$(node ./.claude/get-shit-done/bin/gsd-tools.js generate-slug "${friendlyName}" --raw)
echo "Folder name will be: ${SLUG}"
```

Use AskUserQuestion:
- header: "Project Description"
- question: "Brief description (one line — helps when listing projects):"
- input_type: "freeform"
- capture_as: description

## 3. Migration Check

**Per user decision: Migration only triggered when creating second project.**

If `has_flat_structure` AND `existing_projects.length === 0`:
- This means flat `.planning/` structure exists with no projects yet
- This is the first time multi-project is being used
- Display: "I notice you have an existing project in `.planning/`. To support multiple projects, I'll need to move your existing work into a project folder."
- Use AskUserQuestion:
  - header: "Migrate Existing Project"
  - question: "I'll move your existing work into a project folder. What should I call it?"
  - input_type: "freeform"
  - suggestion: (read from `.planning/PROJECT.md` title if available)
  - capture_as: existingProjectName
- NOTE: Migration workflow will be implemented in Plan 03. For now, display: "Migration will be available after the migration feature is implemented. For now, creating the new project alongside existing flat structure."

## 4. Create Project

```bash
RESULT=$(node ./.claude/get-shit-done/bin/gsd-tools.js project create "${friendlyName}" "${description}")
```

Parse JSON result for: `slug`, `friendlyName`, `projectPath`, `created`.

If `created === false` or error field exists:
- Display error message
- Exit workflow

Display:
```
Project created:
  Name: ${friendlyName}
  Folder: .planning/${slug}/
  Version: v1
```

## 5. Switch Prompt

**Per user decision: Prompt "Switch to it now?" rather than auto-activating.**

Use AskUserQuestion:
- header: "Activate Project"
- question: "Switch to ${friendlyName} now?"
- options:
  - "Yes — Activate this project for all GSD commands"
  - "No — Stay on current project (or no project)"

If "Yes":
```bash
node ./.claude/get-shit-done/bin/gsd-tools.js project switch "${slug}"
echo "Switched to ${friendlyName}. All GSD commands now operate on this project."
```

If "No":
```
To switch later, run: /gsd:switch-project
```

## 6. Commit

If `commit_docs === true`:
```bash
node ./.claude/get-shit-done/bin/gsd-tools.js commit "docs: create project ${slug}" --files ".planning/${slug}/PROJECT.md" ".planning/${slug}/v1/STATE.md" ".planning/${slug}/v1/ROADMAP.md" ".planning/${slug}/v1/REQUIREMENTS.md" ".planning/${slug}/v1/config.json"
```

## 7. Next Steps

Display:
```
Ready! Next steps for ${friendlyName}:
  /gsd:new-project — initialize project with questioning + research + requirements + roadmap
  /gsd:switch-project — switch between projects
  /gsd:list-projects — see all projects
```

</process>
