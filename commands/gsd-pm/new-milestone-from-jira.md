---
name: gsd-pm:new-milestone-from-jira
description: Import a Jira issue as spec and start a new milestone
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
Fetch a spec from Jira, then start a new milestone using it.

Two-step composition:
1. Fetch Jira issue content → write `.planning-pm/external-spec.md`
2. Run `/gsd-pm:new-milestone --auto`

**Creates/Updates:**
- `.planning-pm/external-spec.md` — imported spec from Jira
- All standard `/gsd-pm:new-milestone` artifacts (PROJECT.md update, REQUIREMENTS.md, ROADMAP.md, etc.)

**After:** `/gsd-pm:plan-phase [N]` to start execution.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/fetch-jira-spec.md
@~/.claude/get-shit-done/workflows/new-milestone.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Jira issue key: $ARGUMENTS (optional — will search if not provided)

**Load project context:**
@.planning-pm/PROJECT.md
@.planning-pm/STATE.md
@.planning-pm/MILESTONES.md
@.planning-pm/config.json
</context>

<process>
## Step 1: Fetch Jira Spec

Execute the fetch-jira-spec workflow from @~/.claude/get-shit-done/workflows/fetch-jira-spec.md end-to-end.

If the fetch fails, stop and display the error.

## Step 2: Review Imported Spec

Read `.planning-pm/external-spec.md` and display its contents to the user.

Use AskUserQuestion:
- header: "Review"
- question: "Review the imported spec above. What would you like to do?"
- options:
  - { label: "Looks good, continue", description: "Proceed to create the milestone from this spec" }
  - { label: "Edit the spec", description: "Tell me what to change before continuing" }
  - { label: "Stop here", description: "Keep the file — I'll edit it myself and run /gsd-pm:new-milestone --auto later" }

**If "Edit the spec":** Ask the user what to change. Apply their edits to `.planning-pm/external-spec.md`. Show the updated content and re-ask the review question. Loop until they choose "Looks good" or "Stop here".

**If "Stop here":** Display:
```
Spec saved to .planning-pm/external-spec.md

When ready, run:
  /gsd-pm:new-milestone --auto
```
Stop.

**If "Looks good, continue":** Proceed to Step 3.

## Step 3: Run New Milestone (Auto Mode)

Execute `/gsd-pm:new-milestone --auto`.

The new-milestone workflow detects `.planning-pm/external-spec.md` and uses it as the spec document. Research, requirements, and roadmap gates are auto-approved.
</process>
