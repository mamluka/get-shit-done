---
name: gsd-pm:use-external-spec
description: Import a spec from Jira or Notion and feed it into new-project or new-milestone
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
  - mcp__claude_ai_Notion__notion-search
  - mcp__claude_ai_Notion__notion-fetch
---
<objective>
Interactive router for external spec import. Asks the user to pick a source (Jira or Notion) and a target (new project or new milestone), then delegates to the matching command.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/fetch-jira-spec.md
@~/.claude/get-shit-done/workflows/fetch-notion-spec.md
@~/.claude/get-shit-done/workflows/new-project.md
@~/.claude/get-shit-done/workflows/new-milestone.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<process>
## Step 1: Choose Source and Target

Use AskUserQuestion with two questions:

```
questions: [
  {
    header: "Source",
    question: "Where is your spec?",
    multiSelect: false,
    options: [
      { label: "Jira", description: "Import from a Jira issue or epic" },
      { label: "Notion", description: "Import from a Notion page" }
    ]
  },
  {
    header: "Target",
    question: "What do you want to create?",
    multiSelect: false,
    options: [
      { label: "New project", description: "Initialize a brand new project from the spec" },
      { label: "New milestone", description: "Start a new milestone on an existing project" }
    ]
  }
]
```

## Step 2: Fetch Spec

Based on the source selection, execute the matching fetch workflow:

| Source | Action |
|--------|--------|
| Jira | Run fetch-jira-spec workflow |
| Notion | Run fetch-notion-spec workflow |

If the fetch fails, stop and display the error.

## Step 3: Review Imported Spec

Read `.planning/external-spec.md` and display its contents to the user.

Use AskUserQuestion:
- header: "Review"
- question: "Review the imported spec above. What would you like to do?"
- options:
  - { label: "Looks good, continue", description: "Proceed to create from this spec" }
  - { label: "Edit the spec", description: "Tell me what to change before continuing" }
  - { label: "Stop here", description: "Keep the file — I'll edit it myself and run the target command later" }

**If "Edit the spec":** Ask the user what to change. Apply their edits to `.planning/external-spec.md`. Show the updated content and re-ask the review question. Loop until they choose "Looks good" or "Stop here".

**If "Stop here":** Display the appropriate follow-up command based on their target selection:
```
Spec saved to .planning/external-spec.md

When ready, run:
  /gsd-pm:new-project --auto @.planning/external-spec.md   (for new project)
  /gsd-pm:new-milestone --auto                              (for new milestone)
```
Stop.

**If "Looks good, continue":** Proceed to Step 4.

## Step 4: Run Target (Auto Mode)

Based on the target selection, execute the matching workflow:

| Target | Action |
|--------|--------|
| New project | `/gsd-pm:new-project --auto @.planning/external-spec.md` |
| New milestone | `/gsd-pm:new-milestone --auto` |
</process>
