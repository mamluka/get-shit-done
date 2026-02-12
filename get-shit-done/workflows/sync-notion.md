<purpose>
Sync .planning/ markdown files to Notion. Validates Notion configuration, runs auth check, then pushes files with live progress output.
</purpose>

<required_reading>
@./.claude/get-shit-done/references/ui-brand.md
</required_reading>

<process>

<step name="validate_config">

Check Notion configuration exists and is valid:

```bash
NOTION_CHECK=$(node -e "
const fs = require('fs');
const path = require('path');
const configPath = path.join(process.cwd(), '.planning', 'config.json');

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const hasKey = config.notion && config.notion.api_key && config.notion.api_key.trim() !== '';
  const validPrefix = hasKey && (config.notion.api_key.startsWith('secret_') || config.notion.api_key.startsWith('ntn_'));
  const hasParent = !!(config.notion && config.notion.parent_page_id);

  console.log(JSON.stringify({
    configured: hasKey && validPrefix,
    has_parent: hasParent,
    reason: !hasKey ? 'no_api_key' : !validPrefix ? 'invalid_prefix' : 'valid'
  }));
} catch (e) {
  console.log(JSON.stringify({ configured: false, has_parent: false, reason: 'no_config' }));
}
" 2>/dev/null || echo '{"configured":false,"has_parent":false,"reason":"exec_error"}')

CONFIGURED=$(echo "$NOTION_CHECK" | jq -r '.configured')
REASON=$(echo "$NOTION_CHECK" | jq -r '.reason')
```

**If CONFIGURED is "false":**

Display error based on reason:

- `no_config` → "No .planning/config.json found. Run `/gsd:new-project` first."
- `no_api_key` → "No Notion API key configured. Run `node bin/install.js` to set up Notion integration."
- `invalid_prefix` → "Notion API key has invalid format. Keys should start with `secret_` or `ntn_`. Run `node bin/install.js` to reconfigure."
- `exec_error` → "Failed to read configuration. Check .planning/config.json exists and is valid JSON."

Stop.

**If CONFIGURED is "true":** Continue to next step.

</step>

<step name="run_sync">

Display banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SYNCING TO NOTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Run sync with live progress:

```bash
node bin/notion-sync.js sync --cwd "$(pwd)"
```

**If exit code 0:**

```
✓ Planning docs synced to Notion
```

**If exit code non-zero:**

```
⚠ Sync encountered errors. Check the output above for details.

Common fixes:
- Verify API key: node bin/notion-sync.js auth-check
- Check parent page access in Notion sharing settings
- Retry: /gsd:sync-notion
```

</step>

</process>
