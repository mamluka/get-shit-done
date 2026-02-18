<purpose>
Fetch a spec from Jira and write it to .planning-pm/external-spec.md. Validates Jira MCP availability, resolves the issue (accepts key as argument or searches), fetches issue content (handles epics by fetching children), formats as markdown, and writes the output file.
</purpose>

<required_reading>
@./.claude/gsd-pm/references/ui-brand.md
</required_reading>

<process>

<step name="validate_jira_mcp">

Check if Jira MCP is configured and available:

```bash
MCP_CHECK=$(node ~/.claude/gsd-pm/bin/gsd-tools.js check-jira-mcp)
MCP_AVAILABLE=$(echo "$MCP_CHECK" | jq -r '.available')
MCP_SERVER=$(echo "$MCP_CHECK" | jq -r '.serverName // "unknown"')
```

**If MCP_AVAILABLE is "false":**

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 JIRA MCP NOT CONFIGURED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jira MCP is not configured. Install it with:

  claude mcp add jira --transport http https://mcp.atlassian.com/v1/mcp

Then restart Claude Code and try again.
```

Stop.

**If MCP_AVAILABLE is "true":**

Display:

```
✓ Jira MCP detected: {MCP_SERVER}
```

Continue to next step.

</step>

<step name="resolve_issue">

**If $ARGUMENTS contains a Jira issue key (matches pattern `[A-Z]+-\d+`):**

Use the provided key directly. Skip to fetch step.

**If $ARGUMENTS is empty or doesn't match a key pattern:**

Get accessible resources and cloud ID:

Call `mcp__jira__getAccessibleAtlassianResources` tool.

Extract the first `cloudId`.

Ask the user what to search for:

Use AskUserQuestion:
- header: "Jira Search"
- question: "Enter a search term to find the Jira issue (e.g., project name, epic title, or issue summary):"
- options:
  - "Search by text" — I'll search Jira for matching issues
  - "Enter issue key" — I know the exact issue key (e.g., PROJ-123)

**If "Enter issue key":** Ask inline for the key, then use it directly.

**If "Search by text":** Ask inline for search text, then:

Call `mcp__jira__searchJiraIssuesUsingJql` with:
- `cloudId`: extracted cloud ID
- `jql`: `summary ~ "{search_text}" OR description ~ "{search_text}" ORDER BY updated DESC`
- `limit`: 10

Display results as numbered list:

```
Found issues:

1. {KEY} — {summary} ({status})
2. {KEY} — {summary} ({status})
...
```

Use AskUserQuestion to let user select by number.

If no results found, ask user to refine search or enter key directly.

</step>

<step name="fetch_issue">

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► FETCHING JIRA SPEC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Get the cloud ID (if not already obtained):

Call `mcp__jira__getAccessibleAtlassianResources` tool.
Extract the first `cloudId`.

Fetch the issue:

Call `mcp__jira__getJiraIssue` with:
- `cloudId`: cloud ID
- `issueKey`: the resolved issue key

Extract from response:
- `summary` — issue title
- `description` — issue body (may be ADF format)
- `issuetype.name` — check if "Epic"
- `status.name` — current status
- `labels` — any labels
- `priority.name` — priority

**If issue type is "Epic":**

Display:

```
◆ Epic detected — fetching child issues...
```

Search for children:

Call `mcp__jira__searchJiraIssuesUsingJql` with:
- `cloudId`: cloud ID
- `jql`: `parent = {issue_key} ORDER BY rank ASC`
- `limit`: 50

For each child issue, extract:
- `key` — issue key
- `summary` — title
- `description` — body
- `status.name` — status
- `priority.name` — priority

Display progress:

```
✓ Found {N} child issues under {EPIC_KEY}
```

</step>

<step name="format_and_write">

Format the fetched content as a markdown spec document:

**For a single issue:**

```markdown
# {summary}

> Imported from Jira: {issue_key} ({status})

## Description

{description converted to markdown}

## Metadata

- **Priority:** {priority}
- **Labels:** {labels joined with comma, or "None"}
- **Status:** {status}
```

**For an Epic with children:**

```markdown
# {epic_summary}

> Imported from Jira: {epic_key} (Epic, {status})

## Overview

{epic_description converted to markdown}

## Features / Child Issues

{for each child issue:}

### {child_key}: {child_summary}

**Status:** {child_status} | **Priority:** {child_priority}

{child_description converted to markdown}

---

{end for each}

## Metadata

- **Total issues:** {count}
- **Priority:** {epic_priority}
- **Labels:** {labels or "None"}
```

**ADF to Markdown conversion:**

Jira returns descriptions in Atlassian Document Format (ADF). Convert to markdown:
- `paragraph` → plain text with newline
- `heading` → `#` with appropriate level
- `bulletList` / `orderedList` → `-` or `1.` items
- `codeBlock` → fenced code block
- `table` → markdown table
- `inlineCard` / `mention` → plain text
- Bold/italic/code marks → `**bold**` / `*italic*` / `` `code` ``

If description is already plain text, use as-is.

Write to `.planning-pm/external-spec.md`:

```bash
mkdir -p .planning-pm
```

Write the formatted markdown to `.planning-pm/external-spec.md`.

Display:

```
✓ Spec written to .planning-pm/external-spec.md

  Source: {issue_key} — {summary}
  Content: {word_count} words{, {child_count} child issues if epic}
```

</step>

</process>
