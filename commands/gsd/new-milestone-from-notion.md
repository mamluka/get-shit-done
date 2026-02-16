---
name: gsd:new-milestone-from-notion
description: Import a Notion page as spec and start a new milestone
argument-hint: "[notion-url]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
  - mcp__claude_ai_Notion__notion-search
  - mcp__claude_ai_Notion__notion-fetch
---
<objective>
Fetch a spec from Notion, then start a new milestone using it.

Two-step composition:
1. Fetch Notion page content → write `.planning/external-spec.md`
2. Run `/gsd:new-milestone --auto`

**Creates/Updates:**
- `.planning/external-spec.md` — imported spec from Notion
- All standard `/gsd:new-milestone` artifacts (PROJECT.md update, REQUIREMENTS.md, ROADMAP.md, etc.)

**After:** `/gsd:plan-phase [N]` to start execution.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/fetch-notion-spec.md
@~/.claude/get-shit-done/workflows/new-milestone.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Notion page URL: $ARGUMENTS (optional — will search if not provided)

**Load project context:**
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/MILESTONES.md
@.planning/config.json
</context>

<process>
## Step 1: Fetch Notion Spec

Execute the fetch-notion-spec workflow from @~/.claude/get-shit-done/workflows/fetch-notion-spec.md end-to-end.

If the fetch fails, stop and display the error.

## Step 2: Review Imported Spec

Read `.planning/external-spec.md` and display its contents to the user.

Use AskUserQuestion:
- header: "Review"
- question: "Review the imported spec above. What would you like to do?"
- options:
  - { label: "Looks good, continue", description: "Proceed to create the milestone from this spec" }
  - { label: "Edit the spec", description: "Tell me what to change before continuing" }
  - { label: "Stop here", description: "Keep the file — I'll edit it myself and run /gsd:new-milestone --auto later" }

**If "Edit the spec":** Ask the user what to change. Apply their edits to `.planning/external-spec.md`. Show the updated content and re-ask the review question. Loop until they choose "Looks good" or "Stop here".

**If "Stop here":** Display:
```
Spec saved to .planning/external-spec.md

When ready, run:
  /gsd:new-milestone --auto
```
Stop.

**If "Looks good, continue":** Proceed to Step 3.

## Step 3: Run New Milestone (Auto Mode)

Execute `/gsd:new-milestone --auto`.

The new-milestone workflow detects `.planning/external-spec.md` and uses it as the spec document. Research, requirements, and roadmap gates are auto-approved.
</process>
