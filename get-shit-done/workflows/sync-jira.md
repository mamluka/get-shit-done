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

Display:

```
✓ Jira project configured: {key} - {name}
```

Continue to next step.

</step>

<step name="choose_granularity">

Display granularity selection prompt:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 TICKET GRANULARITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

How should planning artifacts map to Jira tickets?

1. Phase-level     — One ticket per phase (fewest tickets, broadest scope)
2. Category-level  — One ticket per requirement category (grouped by theme)
3. Requirement-level — One ticket per requirement (most granular)
```

Use `AskUserQuestion` to prompt:

```
Select granularity (1, 2, or 3):
```

Validate that the selection is 1, 2, or 3.

Map the selection to granularity string:
- 1 → `phase`
- 2 → `category`
- 3 → `requirement`

Save the granularity to config:

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js config-set jira.granularity "{granularity}"
```

Store the granularity value for the next step.

</step>

<step name="map_tickets">

Call the ticket-mapper module to generate the ticket structure:

```bash
TICKETS=$(node -e '
var mapper = require("./lib/jira/ticket-mapper.js");
var result = mapper.mapTickets(process.cwd(), "{granularity}");
console.log(JSON.stringify(result));
')
```

Parse the result to extract:
- `milestone`
- `ticket_count`
- `tickets` array

Display the ticket preview banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 TICKET PREVIEW ({granularity}-level)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Milestone: {milestone}
Tickets: {ticket_count}
```

For each ticket in the tickets array, display:

```
  [{N}] {ticket.title}
      {first 100 chars of description}...
```

Display completion message:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TICKET MAPPING COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Ticket mapping complete. {ticket_count} tickets ready for Jira sync.

  Granularity: {granularity}-level
  Project: {key} - {name}

Run /gsd:sync-jira again after Phase 19 is implemented to create tickets in Jira.
```

</step>

</process>
