<purpose>
Sync planning artifacts to Jira. Validates Jira MCP availability, checks Notion sync state, selects target Jira project, then saves configuration for subsequent ticket operations.
</purpose>

<required_reading>
@./.claude/get-shit-done/references/ui-brand.md
</required_reading>

<process>

<step name="check_jira_mcp">

Check if Jira MCP is configured and available:

```bash
MCP_CHECK=$(node ~/.claude/get-shit-done/bin/gsd-tools.js check-jira-mcp)
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

Then restart Claude Code and run /gsd:sync-jira again.
```

Stop.

**If MCP_AVAILABLE is "true":**

Display:

```
✓ Jira MCP detected: {MCP_SERVER}
```

Continue to next step.

</step>

<step name="check_notion_sync">

Check if Notion sync has been completed (required for page links on Jira tickets):

```bash
SYNC_CHECK=$(node -e '
var fs = require("fs");
var path = require("path");
var planningRoot = path.join(process.cwd(), ".planning");
var activeProjectPath = path.join(planningRoot, ".active-project");
var syncPath;

try {
  if (fs.existsSync(activeProjectPath)) {
    var slug = fs.readFileSync(activeProjectPath, "utf8").trim();
    if (slug && fs.existsSync(path.join(planningRoot, slug))) {
      syncPath = path.join(planningRoot, slug, "notion-sync.json");
    }
  }
} catch (e) {}

if (!syncPath) syncPath = path.join(planningRoot, "notion-sync.json");

var exists = fs.existsSync(syncPath);
var hasPages = false;

if (exists) {
  try {
    var state = JSON.parse(fs.readFileSync(syncPath, "utf8"));
    hasPages = state.projects && Object.keys(state.projects).length > 0;
  } catch(e) {}
}

console.log(JSON.stringify({ exists: exists, has_pages: hasPages, path: syncPath }));
' 2>/dev/null || echo '{"exists":false,"has_pages":false}')

SYNC_EXISTS=$(echo "$SYNC_CHECK" | jq -r '.exists')
SYNC_HAS_PAGES=$(echo "$SYNC_CHECK" | jq -r '.has_pages')
```

**If SYNC_EXISTS is "false" OR SYNC_HAS_PAGES is "false":**

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 NOTION SYNC REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Notion sync is required before Jira sync. Planning docs must be
synced to Notion first so Jira tickets can include Notion page links.

Run: /gsd:sync-notion

Then run /gsd:sync-jira again.
```

Stop.

**If both SYNC_EXISTS and SYNC_HAS_PAGES are "true":**

Display:

```
✓ Notion sync state found. Notion page links will be included on Jira tickets.
```

Continue to next step.

</step>

<step name="select_jira_project">

Display banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SYNCING TO JIRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Get accessible Atlassian resources to obtain cloud ID:

Call `mcp__jira__getAccessibleAtlassianResources` tool.

Extract the first `cloudId` from the response.

Then get visible Jira projects:

Call `mcp__jira__getVisibleJiraProjects` tool with the extracted `cloudId`.

Display a numbered list of available projects:

```
Available Jira Projects:

1. {KEY} - {NAME}
2. {KEY} - {NAME}
...
```

Use `AskUserQuestion` to prompt the user:

```
Select a Jira project by number:
```

Validate that the user's selection is:
- A valid number
- Within the range of available projects (1 to N)

Extract the selected project's:
- `id` (project ID)
- `key` (project key)
- `name` (project name)

Store these values along with the `cloudId` for the next step.

</step>

<step name="save_jira_config">

Save the selected Jira project configuration to .planning/config.json:

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js config-set jira.cloud_id "{cloud_id}"
node ~/.claude/get-shit-done/bin/gsd-tools.js config-set jira.project_id "{project_id}"
node ~/.claude/get-shit-done/bin/gsd-tools.js config-set jira.project_key "{project_key}"
```

Display success banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► JIRA SYNC CONFIGURED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {key} - {name}
Cloud ID: {cloud_id}

✓ Ready for ticket creation. This workflow will be extended in future phases.
```

</step>

</process>
