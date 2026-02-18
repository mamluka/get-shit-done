---
name: gsd-pm:sync-jira
description: Push planning artifacts to Jira as epic and tickets
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - Write
  - AskUserQuestion
  - mcp__jira__getAccessibleAtlassianResources
  - mcp__jira__getVisibleJiraProjects
  - mcp__jira__createJiraIssue
  - mcp__jira__editJiraIssue
  - mcp__jira__searchJiraIssuesUsingJql
  - mcp__jira__lookupJiraAccountId
  - mcp__jira__getJiraProjectIssueTypesMetadata
  - mcp__jira__getJiraIssueRemoteIssueLinks
  - mcp__jira__getTransitionsForJiraIssue
---
<objective>
Sync planning artifacts to Jira. Validates Jira MCP, checks Notion sync state, selects target project, then creates/updates tickets.
</objective>

<execution_context>
@~/.claude/gsd-pm/workflows/sync-jira.md
</execution_context>

<process>
Execute the sync-jira workflow from @~/.claude/gsd-pm/workflows/sync-jira.md end-to-end.
</process>
