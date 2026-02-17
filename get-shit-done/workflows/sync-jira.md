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

Then restart Claude Code and run /gsd-pm:sync-jira again.
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

Run: /gsd-pm:sync-notion

Then run /gsd-pm:sync-jira again.
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

**Check for saved default project:**

```bash
SAVED_KEY=$(node ~/.claude/get-shit-done/bin/gsd-tools.js config-get jira.project_key 2>/dev/null || echo "")
SAVED_ID=$(node ~/.claude/get-shit-done/bin/gsd-tools.js config-get jira.project_id 2>/dev/null || echo "")
SAVED_CLOUD=$(node ~/.claude/get-shit-done/bin/gsd-tools.js config-get jira.cloud_id 2>/dev/null || echo "")
```

**If SAVED_KEY, SAVED_ID, and SAVED_CLOUD are all non-empty:**

Display:

```
Default Jira project: {SAVED_KEY}
```

Use `AskUserQuestion` to prompt:

```
Use default project {SAVED_KEY}?
- Yes, use {SAVED_KEY}
- No, choose a different project
```

If user selects "Yes": use the saved `cloudId`, `project_id`, and `project_key` values. Skip to end of this step.

If user selects "No": continue with project selection below.

**Project selection (runs when no default or user chose a different project):**

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

**Ask to save as default:**

Use `AskUserQuestion` to prompt:

```
Save {KEY} as default Jira project for future syncs?
- Yes (Recommended)
- No
```

If user selects "Yes": save to config (next step will persist it).

If user selects "No": use the selection for this session only — skip the `save_jira_config` step.

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
✓ Jira project saved as default: {key} - {name}
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

<step name="preview_and_approve">

First, read Jira config values saved in step 4:

```bash
CLOUD_ID=$(node ~/.claude/get-shit-done/bin/gsd-tools.js config-get jira.cloud_id)
PROJECT_KEY=$(node ~/.claude/get-shit-done/bin/gsd-tools.js config-get jira.project_key)
PROJECT_ID=$(node ~/.claude/get-shit-done/bin/gsd-tools.js config-get jira.project_id)
```

Call the issue-creator module to build a preview:

```bash
PREVIEW=$(node -e '
var creator = require("./lib/jira/issue-creator.js");
var result = creator.buildPreview(process.cwd(), "{granularity}");
if (result.error) {
  console.log(JSON.stringify({ error: result.error }));
} else {
  console.log(JSON.stringify(result));
}
')
```

Check if preview contains an error:

```bash
PREVIEW_ERROR=$(echo "$PREVIEW" | jq -r '.error // ""')
```

**If PREVIEW_ERROR is not empty:**

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PREVIEW ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{PREVIEW_ERROR}
```

Stop.

**If preview is valid:**

Call `formatPreviewDisplay` to render the preview:

```bash
DISPLAY=$(node -e '
var creator = require("./lib/jira/issue-creator.js");
var preview = JSON.parse(process.argv[1]);
console.log(creator.formatPreviewDisplay(preview));
' "$PREVIEW")
```

Display the formatted preview to the user:

```
{DISPLAY}
```

Extract ticket count from preview:

```bash
TICKET_COUNT=$(echo "$PREVIEW" | jq -r '.ticket_count')
```

Use `AskUserQuestion` to prompt:

```
Proceed with Jira sync? This will create 1 epic + {TICKET_COUNT} tickets in {PROJECT_KEY}.

Type "yes" to proceed or "cancel" to abort:
```

**If user types anything other than "yes" (case-insensitive):**

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SYNC CANCELLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No changes made to Jira. Run /gsd-pm:sync-jira again to retry.
```

Stop.

**If user types "yes":**

Continue to step 7.

</step>

<step name="create_tickets">

**Detect the Epic issue type name:**

Different Jira projects may use different names for Epics. Call `mcp__jira__getJiraProjectIssueTypesMetadata` with the `CLOUD_ID` and `PROJECT_ID` to get available issue types.

Find the issue type with name containing "Epic" (case-insensitive). If no Epic type found, display error and stop.

Store the Epic type name (e.g., "Epic" or "epic") for use in creation.

Also find a standard task type (look for "Task", "Story", or "Sub-task" in that order). Store the task type name.

**Create the Epic:**

Extract epic summary and description from preview:

```bash
EPIC_SUMMARY=$(echo "$PREVIEW" | jq -r '.epic.summary')
EPIC_DESCRIPTION=$(echo "$PREVIEW" | jq -r '.epic.description')
```

Call `mcp__jira__createJiraIssue` with:
- `cloudId`: `CLOUD_ID`
- `projectKey`: `PROJECT_KEY`
- `issueTypeName`: The Epic type name found above
- `summary`: `EPIC_SUMMARY`
- `description`: `EPIC_DESCRIPTION`

Extract the created epic's `key` from the response.

Display:

```
✓ Epic created: {epic_key} — {EPIC_SUMMARY}
```

**Create child tickets:**

For each ticket in the preview's tickets array:

1. Extract ticket data:
   - `summary`: from `ticket.summary`
   - `description`: from `ticket.description`
   - `notion_link`: from `ticket.notion_link`

2. If `notion_link` is not null, prepend Notion link to description:
   ```
   **📎 Notion Page:** [View in Notion]({notion_link})

   {original description}
   ```

3. Call `mcp__jira__createJiraIssue` with:
   - `cloudId`: `CLOUD_ID`
   - `projectKey`: `PROJECT_KEY`
   - `issueTypeName`: The task type name found above
   - `summary`: ticket summary
   - `description`: ticket description (with Notion link if available)
   - `parent`: the epic key created above

4. After each ticket creation, display progress:
   ```
   ✓ [{N}/{TICKET_COUNT}] {ticket_key} — {ticket_summary}
   ```

**Handle errors gracefully:**

If any ticket creation fails, display the error, continue with remaining tickets, and track the failure count.

**Display completion banner:**

Collect all created ticket keys into a comma-separated list.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► JIRA SYNC COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Created 1 epic + {TICKET_COUNT} tickets in {PROJECT_KEY}

  Epic: {epic_key}
  Tickets: {comma-separated list of ticket keys}
  Granularity: {granularity}-level

All planning artifacts are now in Jira.
```

If there were any failures, append:

```

⚠ {failure_count} ticket(s) failed to create. See errors above.
```

</step>

<step name="save_sync_state">

Save the created Jira issue keys to `.planning/jira-sync.json` for future update/tracking operations:

```bash
node -e '
var fs = require("fs");
var path = require("path");
var syncData = {
  milestone: "{milestone_version}",
  granularity: "{granularity}",
  project_key: "{PROJECT_KEY}",
  cloud_id: "{CLOUD_ID}",
  epic: {
    key: "{epic_key}",
    summary: "{EPIC_SUMMARY}"
  },
  tickets: [
    // For each successfully created ticket:
    { key: "{ticket_key}", summary: "{ticket_summary}", phase: "{phase_number}" }
  ],
  synced_at: new Date().toISOString(),
  failed_count: {failure_count}
};
fs.writeFileSync(
  path.join(process.cwd(), ".planning", "jira-sync.json"),
  JSON.stringify(syncData, null, 2) + "\n"
);
'
```

Build the `tickets` array from all successfully created tickets during step 7, including each ticket's `key`, `summary`, and the `phase` number extracted from the ticket-mapper output.

Display:

```
✓ Sync state saved to .planning/jira-sync.json
```

</step>

</process>
