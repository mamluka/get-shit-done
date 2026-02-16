---
name: gsd:clear-notion-sync
description: Archive all synced Notion pages and reset sync state for a fresh resync
allowed-tools:
  - Bash
---
<objective>
Archive all Notion pages tracked in sync state, reset the sync state, then resync from scratch.
Pages that are already deleted or archived are silently skipped.
</objective>

<process>

Run the clear command:

```bash
node ~/.claude/get-shit-done/bin/notion-sync.js clear --cwd "$(pwd)"
```

Then run a fresh sync:

```bash
node ~/.claude/get-shit-done/bin/notion-sync.js sync --cwd "$(pwd)"
```

</process>
