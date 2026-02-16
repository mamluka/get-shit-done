---
name: gsd:new-project-from-jira
description: Import a Jira issue as spec and initialize a new project
argument-hint: "[PROJ-123]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
  - mcp__jira__getAccessibleAtlassianResources
  - mcp__jira__getVisibleJiraProjects
  - mcp__jira__getJiraIssue
  - mcp__jira__searchJiraIssuesUsingJql
  - mcp__jira__getJiraProjectIssueTypesMetadata
---
<objective>
Fetch a spec from Jira, then initialize a new project using it.

Two-step composition:
1. Fetch Jira issue content → write `.planning/external-spec.md`
2. Run `/gsd:new-project --auto @.planning/external-spec.md`

**Creates:**
- `.planning/external-spec.md` — imported spec from Jira
- All standard `/gsd:new-project` artifacts (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, etc.)

**After:** `/gsd:plan-phase 1` to start execution.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/fetch-jira-spec.md
@~/.claude/get-shit-done/workflows/new-project.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Jira issue key: $ARGUMENTS (optional — will search if not provided)
</context>

<process>
## Step 1: Fetch Jira Spec

Execute the fetch-jira-spec workflow from @~/.claude/get-shit-done/workflows/fetch-jira-spec.md end-to-end.

If the fetch fails, stop and display the error.

## Step 2: Review Imported Spec

Read `.planning/external-spec.md` and display its contents to the user.

Use AskUserQuestion:
- header: "Review"
- question: "Review the imported spec above. What would you like to do?"
- options:
  - { label: "Looks good, continue", description: "Proceed to create the project from this spec" }
  - { label: "Edit the spec", description: "Tell me what to change before continuing" }
  - { label: "Stop here", description: "Keep the file — I'll edit it myself and run /gsd:new-project --auto later" }

**If "Edit the spec":** Ask the user what to change. Apply their edits to `.planning/external-spec.md`. Show the updated content and re-ask the review question. Loop until they choose "Looks good" or "Stop here".

**If "Stop here":** Display:
```
Spec saved to .planning/external-spec.md

When ready, run:
  /gsd:new-project --auto @.planning/external-spec.md
```
Stop.

**If "Looks good, continue":** Proceed to Step 3.

## Step 3: Run New Project (Auto Mode)

Execute `/gsd:new-project --auto @.planning/external-spec.md`.

This runs the full new-project flow in auto mode — config questions are still asked, but research, requirements, and roadmap gates are auto-approved.
</process>
