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

**Read existing PROJECT.md to suggest a name:**
```bash
cat .planning/PROJECT.md 2>/dev/null | head -5
```

Extract title from first `# Heading` line if possible.

**Display:**
"I notice you have an existing project in .planning/. To support multiple projects, I need to move your existing work into a project folder."

**Confirm migration:**
Use AskUserQuestion:
- header: "Migrate Existing Project"
- question: "I'll move your existing work into a project folder. OK?"
- options:
  - "Yes" — Proceed with migration
  - "No" — Cancel operation (user must migrate manually later)

If "No": Display error and exit. Migration is required before creating additional projects.

**If "Yes", ask for name:**
Ask inline: "What should I call this existing project?"
- Suggest based on PROJECT.md title if detected
- Or use current directory name as suggestion

Wait for response.

**Execute migration:**
```bash
MIGRATE_RESULT=$(node ./get-shit-done/bin/gsd-tools.js project migrate "{existingProjectName}" "{description from PROJECT.md if available}" --raw)
```

Parse result JSON for: `migrated`, `project_slug`, `backup_path`, `files_moved`, `verification`, `error`.

If `error` present: Display error, mention backup location, and exit.

**Verify migration:**
```bash
VERIFY_RESULT=$(node ./get-shit-done/bin/gsd-tools.js project verify-migration "{project_slug}" --raw)
```

Parse result for: `valid`, `issues`.

If not valid: Display issues and warn user to check backup.

**Display results:**
```
Migration complete:
  Project: {existingProjectName}
  Folder: .planning/{project_slug}/
  Backup: {backup_path}
  Files moved: {files_moved}
  Status: ✓ Verified

Your existing work is now in .planning/{project_slug}/v1/
A backup was created at {backup_path}
```

Then proceed to create the NEW project (the one the user originally requested).

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
