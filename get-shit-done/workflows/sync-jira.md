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
var planningRoot = path.join(process.cwd(), ".planning-pm");
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

Save the selected Jira project configuration to .planning-pm/config.json:

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

<step name="detect_existing_sync">

Load existing sync state to determine if this is a fresh sync or incremental update:

```bash
SYNC_STATE=$(node -e '
var ss = require("./lib/jira/sync-state.js");
var state = ss.loadSyncState(process.cwd());
if (state === null) {
  console.log(JSON.stringify({ mode: "fresh" }));
} else if (state.error) {
  console.log(JSON.stringify({ mode: "error", error: state.error }));
} else {
  console.log(JSON.stringify({ mode: "incremental", state: state }));
}
')

SYNC_MODE=$(echo "$SYNC_STATE" | jq -r '.mode')
```

**If SYNC_MODE is "error":**

Extract and display the error:

```bash
SYNC_ERROR=$(echo "$SYNC_STATE" | jq -r '.error')
```

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SYNC STATE ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{SYNC_ERROR}
```

Stop.

**If SYNC_MODE is "fresh":**

Display:

```
ℹ No previous sync found. All tickets will be created.
```

Set `EXISTING_STATE` to null for use in preview step.

Continue to next step.

**If SYNC_MODE is "incremental":**

Extract existing state details:

```bash
EXISTING_EPIC_KEY=$(echo "$SYNC_STATE" | jq -r '.state.epic.key')
EXISTING_TICKET_COUNT=$(echo "$SYNC_STATE" | jq -r '.state.tickets | length')
EXISTING_SYNCED_AT=$(echo "$SYNC_STATE" | jq -r '.state.synced_at')
EXISTING_GRANULARITY=$(echo "$SYNC_STATE" | jq -r '.state.granularity')
```

Display:

```
ℹ Previous sync found:
  Epic: {EXISTING_EPIC_KEY}
  Tickets: {EXISTING_TICKET_COUNT}
  Last synced: {EXISTING_SYNCED_AT}
  Granularity: {EXISTING_GRANULARITY}
```

**Check for granularity change:**

If `EXISTING_GRANULARITY` does not match the current `granularity` selected in step 5:

Display:

```
⚠ Granularity changed from {EXISTING_GRANULARITY} to {granularity}.
  All tickets will be created fresh (previous tickets will NOT be deleted from Jira).
```

Set `EXISTING_STATE` to null (treat as fresh sync for diffing purposes).

Otherwise, if granularities match:

Set `EXISTING_STATE` to the loaded state for use in preview step.

Continue to next step.

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

Run diffTickets to determine creates vs updates:

```bash
DIFF=$(node -e '
var ss = require("./lib/jira/sync-state.js");
var preview = JSON.parse(process.argv[1]);
var existingStateJson = process.argv[2];
var existingState = existingStateJson === "null" ? null : JSON.parse(existingStateJson);
var diff = ss.diffTickets(existingState, preview.tickets, "{granularity}");
console.log(JSON.stringify(diff));
' "$PREVIEW" "$EXISTING_STATE")

TO_CREATE_COUNT=$(echo "$DIFF" | jq -r '.toCreate | length')
TO_UPDATE_COUNT=$(echo "$DIFF" | jq -r '.toUpdate | length')
EPIC_EXISTS=$(echo "$DIFF" | jq -r '.epicExists')
EXISTING_EPIC_KEY=$(echo "$DIFF" | jq -r '.existingEpicKey // ""')
```

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

Display sync operation summary:

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SYNC OPERATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ "$EPIC_EXISTS" = "true" ]; then
  echo "Epic: $EXISTING_EPIC_KEY (will be updated)"
else
  echo "Epic: NEW"
fi
echo "New tickets to CREATE: $TO_CREATE_COUNT"
echo "Existing tickets to UPDATE: $TO_UPDATE_COUNT"
echo ""
```

Extract ticket count from preview:

```bash
TICKET_COUNT=$(echo "$PREVIEW" | jq -r '.ticket_count')
```

Determine approval prompt based on sync mode:

```bash
if [ "$SYNC_MODE" = "fresh" ]; then
  APPROVAL_PROMPT="Proceed with Jira sync? This will create 1 epic + ${TICKET_COUNT} tickets in ${PROJECT_KEY}."
else
  APPROVAL_PROMPT="Proceed with Jira sync? This will update ${TO_UPDATE_COUNT} tickets and create ${TO_CREATE_COUNT} new tickets in ${PROJECT_KEY}. Epic: ${EXISTING_EPIC_KEY}."
fi
```

Use `AskUserQuestion` to prompt:

```
{APPROVAL_PROMPT}

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

Continue to step 8.

</step>

<step name="create_tickets">

**Detect the Epic issue type name:**

Different Jira projects may use different names for Epics. Call `mcp__jira__getJiraProjectIssueTypesMetadata` with the `CLOUD_ID` and `PROJECT_ID` to get available issue types.

Find the issue type with name containing "Epic" (case-insensitive). If no Epic type found, display error and stop.

Store the Epic type name (e.g., "Epic" or "epic") for use in creation.

Also find a standard task type (look for "Task", "Story", or "Sub-task" in that order). Store the task type name.

**Handle Epic:**

Extract epic summary and description from preview:

```bash
EPIC_SUMMARY=$(echo "$PREVIEW" | jq -r '.epic.summary')
EPIC_DESCRIPTION=$(echo "$PREVIEW" | jq -r '.epic.description')
```

If `EPIC_EXISTS` is `"true"` (from step 7 diff):

Call `mcp__jira__editJiraIssue` with:
- `cloudId`: `CLOUD_ID`
- `issueIdOrKey`: `EXISTING_EPIC_KEY`
- `summary`: `EPIC_SUMMARY`
- `description`: `EPIC_DESCRIPTION`

Display:

```
✓ Updated epic: {EXISTING_EPIC_KEY} — {EPIC_SUMMARY}
```

Set `EPIC_KEY` to `EXISTING_EPIC_KEY`.

If `EPIC_EXISTS` is `"false"`:

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

Set `EPIC_KEY` to the created epic's key.

**Process tickets:**

Extract the toCreate and toUpdate arrays from the diff:

```bash
TO_CREATE_JSON=$(echo "$DIFF" | jq -c '.toCreate')
TO_UPDATE_JSON=$(echo "$DIFF" | jq -c '.toUpdate')
```

Initialize tracking variables:

```bash
ALL_TICKET_KEYS=()
FAILURE_COUNT=0
TICKET_INDEX=0
TOTAL_TICKET_COUNT=$(echo "$DIFF" | jq -r '(.toCreate | length) + (.toUpdate | length)')
```

**For each ticket in toCreate:**

Parse ticket data and create new Jira issue:

1. Extract ticket data:
   - `summary`: from ticket object
   - `description`: from ticket object
   - `notion_link`: from `notion_page_id` (build URL if present)

2. If `notion_page_id` is present, prepend Notion link to description:
   ```
   **📎 Notion Page:** [View in Notion](https://www.notion.so/{notion_page_id})

   {original description}
   ```

3. Call `mcp__jira__createJiraIssue` with:
   - `cloudId`: `CLOUD_ID`
   - `projectKey`: `PROJECT_KEY`
   - `issueTypeName`: The task type name found above
   - `summary`: ticket summary
   - `description`: ticket description (with Notion link if available)
   - `parent`: `EPIC_KEY`

4. After each creation, display progress:
   ```
   ✓ Created [{TICKET_INDEX}/{TOTAL_TICKET_COUNT}] {ticket_key} — {ticket_summary}
   ```

5. Collect the created ticket key into `ALL_TICKET_KEYS` array.

**For each ticket in toUpdate:**

Parse ticket data and update existing Jira issue:

1. Extract ticket data:
   - `jira_key`: from ticket object (attached by diffTickets)
   - `summary`: from ticket object
   - `description`: from ticket object
   - `notion_link`: from `notion_page_id` (build URL if present)

2. If `notion_page_id` is present, prepend Notion link to description:
   ```
   **📎 Notion Page:** [View in Notion](https://www.notion.so/{notion_page_id})

   {original description}
   ```

3. Call `mcp__jira__editJiraIssue` with:
   - `cloudId`: `CLOUD_ID`
   - `issueIdOrKey`: `jira_key`
   - `summary`: ticket summary
   - `description`: ticket description (with Notion link if available)
   - **Note:** Do NOT change the parent field on updates

4. After each update, display progress:
   ```
   ✓ Updated [{TICKET_INDEX}/{TOTAL_TICKET_COUNT}] {jira_key} — {ticket_summary}
   ```

5. Collect the updated ticket key into `ALL_TICKET_KEYS` array.

**Handle errors gracefully:**

If any ticket creation or update fails, display the error, continue with remaining tickets, and increment the failure count.

**Display completion banner:**

Collect all ticket keys from `ALL_TICKET_KEYS` into a comma-separated list.

If `SYNC_MODE` is `"fresh"`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► JIRA SYNC COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Created 1 epic + {TOTAL_TICKET_COUNT} tickets in {PROJECT_KEY}

  Epic: {EPIC_KEY}
  Tickets: {comma-separated list of ticket keys}
  Granularity: {granularity}-level

All planning artifacts are now in Jira.
```

If `SYNC_MODE` is `"incremental"`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► JIRA SYNC COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Updated epic + {TO_UPDATE_COUNT} tickets, created {TO_CREATE_COUNT} new tickets in {PROJECT_KEY}

  Epic: {EPIC_KEY}
  Tickets: {comma-separated list of ticket keys}
  Granularity: {granularity}-level

All planning artifacts are now in Jira.
```

If there were any failures, append:

```

⚠ {FAILURE_COUNT} ticket(s) failed. See errors above.
```

</step>

<step name="assign_team">

**Prompt for assignment:**

Use `AskUserQuestion` to ask:

```
Would you like to assign the epic and tickets to team members?
- Yes
- No, skip assignment
```

**If user selects "No, skip assignment":**

Display:

```
Skipping team assignment.
```

Continue to save_sync_state step.

**If user selects "Yes":**

**Fetch assignable users:**

Call `mcp__jira__lookupJiraAccountId` with:
- `cloudId`: `CLOUD_ID`
- `query`: `""` (empty string to get all available users)

Store the response as `USERS_JSON`.

If the call fails or returns no users:

Display:

```
No assignable users found for this project. Skipping assignment.
```

Continue to save_sync_state step.

**Display team member list:**

```bash
USERS_JSON=$(echo "$USERS_RESPONSE" | jq -c '.')
USER_COUNT=$(echo "$USERS_JSON" | jq -r 'length')

TEAM_LIST=$(node -e '
var tf = require("./lib/jira/team-fetcher.js");
var users = JSON.parse(process.argv[1]);
console.log(tf.formatTeamList(users));
' "$USERS_JSON")
```

Display the formatted team list:

```
{TEAM_LIST}
```

**Epic assignment:**

Use `AskUserQuestion` to prompt:

```
Assign epic ({EPIC_KEY}) to a team member?

Enter member number (1-{USER_COUNT}), or "skip" to leave unassigned:
```

Parse the response:
- If user enters a valid number (1 to USER_COUNT):
  - Extract the selected user's `accountId` and `displayName` from `USERS_JSON`
  - Call `mcp__jira__editJiraIssue` with:
    - `cloudId`: `CLOUD_ID`
    - `issueIdOrKey`: EPIC_KEY
    - `assigneeAccountId`: selected user's accountId
  - Display: `Assigned {EPIC_KEY} to {displayName}`
  - Store epic assignee for later use

- If user enters "skip":
  - Display: `Epic assignment skipped.`

**Ticket assignment:**

Use the unified `ALL_TICKET_KEYS` array from step 8 (which includes both created and updated tickets).

Calculate the total ticket count:

```bash
ALL_TICKET_COUNT=${#ALL_TICKET_KEYS[@]}
```

Use `AskUserQuestion` to prompt:

```
Assign tickets to team members? ({ALL_TICKET_COUNT} tickets total)

Options:
- "all:{N}"          — Assign ALL tickets to member N
- "1:2, 3:1, 4:2"   — Assign specific tickets to specific members
- "skip"             — Leave all tickets unassigned

Enter assignment:
```

Parse the user input:

```bash
USER_INPUT="{user's response}"

CHOICE=$(node -e '
var tf = require("./lib/jira/team-fetcher.js");
var result = tf.parseAssignmentChoice(process.argv[1], parseInt(process.argv[2]), parseInt(process.argv[3]));
console.log(JSON.stringify(result));
' "$USER_INPUT" "$USER_COUNT" "$ALL_TICKET_COUNT")

CHOICE_ACTION=$(echo "$CHOICE" | jq -r '.action // "error"')
CHOICE_ERROR=$(echo "$CHOICE" | jq -r '.error // ""')
```

**If CHOICE_ERROR is not empty:**

Display the error message and re-prompt once. If second attempt also fails, display:

```
Invalid input format. Skipping ticket assignment.
```

Continue to assignment summary.

**If action is "skip":**

Display:

```
Ticket assignment skipped.
```

Continue to assignment summary.

**If action is "bulk":**

Extract the user index:

```bash
USER_INDEX=$(echo "$CHOICE" | jq -r '.userIndex')
```

Get the selected user's accountId and displayName from `USERS_JSON`.

Display:

```
Assigning all tickets to {displayName}...
```

For each ticket key in `ALL_TICKET_KEYS`, call `mcp__jira__editJiraIssue` with:
- `cloudId`: `CLOUD_ID`
- `issueIdOrKey`: ticket_key
- `assigneeAccountId`: selected user's accountId

After each assignment, display progress:

```
✓ Assigned [{N}/{ALL_TICKET_COUNT}] {ticket_key}
```

Track assigned tickets for jira-sync.json.

**If action is "individual":**

Extract the assignments array:

```bash
ASSIGNMENTS=$(echo "$CHOICE" | jq -c '.assignments')
```

For each assignment in the array:
- Extract `ticketIndex` and `userIndex`
- Get the corresponding ticket key from `ALL_TICKET_KEYS` array at index ticketIndex-1
- Get the corresponding user's accountId and displayName from `USERS_JSON` at index userIndex-1
- Call `mcp__jira__editJiraIssue` with:
  - `cloudId`: `CLOUD_ID`
  - `issueIdOrKey`: ticket_key
  - `assigneeAccountId`: user's accountId
- Display:

```
✓ {ticket_key} assigned to {displayName}
```

Track assigned tickets for jira-sync.json.

**Handle errors gracefully:**

If any assignment call fails, log the error, continue with remaining assignments, and track failure count.

**Assignment summary:**

After all assignments processed, display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 TEAM ASSIGNMENT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Epic: {EPIC_KEY} → {assignee displayName or "unassigned"}
Tickets assigned: {assigned_count}/{ALL_TICKET_COUNT}
```

</step>

<step name="save_sync_state">

Save the Jira issue keys and assignment information to `.planning-pm/jira-sync.json` using the sync-state module with merge logic:

```bash
node -e '
var ss = require("./lib/jira/sync-state.js");

// Load existing state (will be null for fresh sync)
var existingState = ss.loadSyncState(process.cwd());

// Build the new state by merging with existing state
var newTickets = [];
var existingTicketsMap = {};

// If we have existing state, build a map of existing tickets
if (existingState && !existingState.error && existingState.tickets) {
  for (var i = 0; i < existingState.tickets.length; i++) {
    var ticket = existingState.tickets[i];
    existingTicketsMap[ticket.key] = ticket;
  }
}

// Process tickets from current sync run
var currentTickets = JSON.parse(process.argv[1]);
for (var i = 0; i < currentTickets.length; i++) {
  var current = currentTickets[i];

  // If this ticket existed before, preserve existing data and update with new
  if (existingTicketsMap[current.key]) {
    // Remove from map (so we know which old tickets to preserve at the end)
    var existing = existingTicketsMap[current.key];
    delete existingTicketsMap[current.key];

    // Merge: keep new summary, preserve or update assignee
    newTickets.push({
      key: current.key,
      summary: current.summary,
      phase: current.phase || existing.phase,
      category: current.category || existing.category,
      requirement_id: current.requirement_id || existing.requirement_id,
      assignee: current.assignee || existing.assignee
    });
  } else {
    // New ticket
    newTickets.push(current);
  }
}

// Preserve tickets from previous state that were not in current run
for (var key in existingTicketsMap) {
  newTickets.push(existingTicketsMap[key]);
}

// Build complete state object
var syncData = {
  milestone: process.argv[2],
  granularity: process.argv[3],
  project_key: process.argv[4],
  cloud_id: process.argv[5],
  epic: {
    key: process.argv[6],
    summary: process.argv[7]
  },
  tickets: newTickets,
  synced_at: new Date().toISOString(),
  failed_count: parseInt(process.argv[8])
};

// Add epic assignee if provided
if (process.argv[9] && process.argv[9] !== "null") {
  syncData.epic.assignee = JSON.parse(process.argv[9]);
}

// Save using sync-state module
var result = ss.saveSyncState(process.cwd(), syncData);
if (result.error) {
  console.error("Error saving sync state:", result.error);
  process.exit(1);
}
' "$CURRENT_TICKETS_JSON" "$MILESTONE" "$GRANULARITY" "$PROJECT_KEY" "$CLOUD_ID" "$EPIC_KEY" "$EPIC_SUMMARY" "$FAILURE_COUNT" "$EPIC_ASSIGNEE_JSON"
```

To call this, you must:

1. Build `CURRENT_TICKETS_JSON`: an array of ticket objects from the current sync run (both created and updated), where each ticket has:
   - `key`: Jira ticket key
   - `summary`: Ticket summary
   - `phase`, `category`, or `requirement_id`: granularity metadata (depending on granularity mode)
   - `assignee`: (optional) `{ accountId: "...", displayName: "..." }` if assigned

2. Pass the necessary arguments:
   - `MILESTONE`: milestone version string
   - `GRANULARITY`: the granularity mode (phase/category/requirement)
   - `PROJECT_KEY`: Jira project key
   - `CLOUD_ID`: Jira cloud ID
   - `EPIC_KEY`: Epic key (created or updated)
   - `EPIC_SUMMARY`: Epic summary
   - `FAILURE_COUNT`: Number of failed operations
   - `EPIC_ASSIGNEE_JSON`: JSON string of epic assignee object, or "null" if unassigned

For each ticket in the current run, include granularity metadata based on the granularity mode:
- If `granularity` is "phase": include `phase` field with phase number as string
- If `granularity` is "category": include `category` field with category name
- If `granularity` is "requirement": include `requirement_id` field with requirement ID

Display:

```
✓ Sync state saved to .planning-pm/jira-sync.json
```

</step>

</process>
