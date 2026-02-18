<purpose>
Fetch a spec from Notion and write it to .planning-pm/external-spec.md. Validates Notion MCP availability, resolves the page (accepts URL as argument or searches), fetches page content, formats as markdown, and writes the output file.
</purpose>

<required_reading>
@./.claude/get-shit-done/references/ui-brand.md
</required_reading>

<process>

<step name="validate_notion_mcp">

Validate that Notion MCP is available by attempting a search:

Call `mcp__claude_ai_Notion__notion-search` with:
- `query`: "test"
- `limit`: 1

**If the call fails or tool is not available:**

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 NOTION MCP NOT CONFIGURED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Notion MCP is not available. You need the Notion MCP integration.

Add it through Claude Code settings or install manually:

  claude mcp add notion

Then restart Claude Code and try again.
```

Stop.

**If the call succeeds:**

Display:

```
✓ Notion MCP detected
```

Continue to next step.

</step>

<step name="resolve_page">

**If $ARGUMENTS contains a Notion URL (matches `notion.so/` or `notion.site/`):**

Extract the page ID from the URL. Notion URLs have the page ID as the last 32-character hex string (with or without dashes).

Use the extracted page ID directly. Skip to fetch step.

**If $ARGUMENTS is empty or doesn't contain a Notion URL:**

Ask the user what to search for:

Use AskUserQuestion:
- header: "Notion Search"
- question: "How do you want to find the Notion page?"
- options:
  - "Search by title" — I'll search Notion for matching pages
  - "Enter page URL" — I have the Notion page URL

**If "Enter page URL":** Ask inline for the URL, extract page ID, skip to fetch.

**If "Search by title":** Ask inline for search text, then:

Call `mcp__claude_ai_Notion__notion-search` with:
- `query`: the search text
- `limit`: 10

Display results as numbered list:

```
Found pages:

1. {title} ({type}) — last edited {date}
2. {title} ({type}) — last edited {date}
...
```

Use AskUserQuestion to let user select by number.

If no results found, ask user to refine search or enter URL directly.

</step>

<step name="fetch_page">

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► FETCHING NOTION SPEC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Fetch the page content:

Call `mcp__claude_ai_Notion__notion-fetch` with:
- `uri`: the Notion page URL or `notion://page/{page_id}`

The tool returns the page content as markdown.

Extract:
- Page title
- Full content body
- Any child pages or databases referenced

**If the page has child pages (sub-pages):**

Display:

```
◆ Page has child pages — fetching...
```

For each child page, call `mcp__claude_ai_Notion__notion-fetch` to get its content.

Display progress:

```
✓ Fetched {N} sub-pages
```

</step>

<step name="format_and_write">

Format the fetched content as a markdown spec document:

**For a single page:**

```markdown
# {page_title}

> Imported from Notion

{page content as markdown — already formatted by Notion MCP}
```

**For a page with children:**

```markdown
# {page_title}

> Imported from Notion (with {N} sub-pages)

{main page content as markdown}

---

{for each child page:}

## {child_title}

{child content as markdown}

---

{end for each}
```

Write to `.planning-pm/external-spec.md`:

```bash
mkdir -p .planning-pm
```

Write the formatted markdown to `.planning-pm/external-spec.md`.

Display:

```
✓ Spec written to .planning-pm/external-spec.md

  Source: {page_title} (Notion)
  Content: {word_count} words{, {child_count} sub-pages if any}
```

</step>

</process>
