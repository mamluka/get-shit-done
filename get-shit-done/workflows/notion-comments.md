<purpose>
Retrieve unresolved comments from synced Notion pages, identify themes across all feedback, map themes to affected roadmap phases, and walk the user through an interactive triage discussion. Saves results as a dated markdown file for historical reference.
</purpose>

<required_reading>
1. `.planning/ROADMAP.md`
2. `.planning/STATE.md`
</required_reading>

<process>

<step name="fetch_comments">

Fetch all unresolved comments from synced Notion pages:

```bash
node ~/.claude/get-shit-done/bin/notion-sync.js comments --cwd "$(pwd)"
```

Parse the JSON output between `---COMMENTS_JSON_START---` and `---COMMENTS_JSON_END---` markers.

If no comments found (total === 0):
```
No unresolved comments found on synced Notion pages.

This means either:
- No one has commented on your Notion pages yet
- All existing comments have been resolved in Notion

Nothing to triage. You're all clear!
```
Exit workflow.

If comments found, continue to next step.

</step>

<step name="interpret_comments">

After fetching comments, provide a plain-language interpretation of each comment grouped by source file (Notion page).

**Grouping:** Use the `source_page_title` field from the JSON output to group comments. If `source_page_title` is null, fall back to the `source_file` path. Each group represents one Notion page.

**Interpretation format:** For each comment in each group, create an interpretation block with:

```
> "{original comment text}" — {created_by}, {created_time formatted as YYYY-MM-DD}
>
> **Intent:** {Claude's plain-language interpretation of what the commenter means and what they're asking for}
```

**Output structure:**

```markdown
## Comment Interpretation

Found {N} comments across {M} pages.

### {Page Title 1}

> "{comment text}" — Author, 2026-02-12
>
> **Intent:** The commenter is asking for...

> "{comment text}" — Author, 2026-02-12
>
> **Intent:** The commenter wants to...

### {Page Title 2}

...
```

**Output routing:** After composing the full interpretation output:

1. **Estimate token count:** Count total characters in the interpretation text and divide by 4 (1 token ≈ 4 characters).

2. **Route based on length:**
   - **If estimated tokens < 1500:** Present the interpretation directly in the conversation (inline). No file is created.
   - **If estimated tokens >= 1500:** Save the interpretation to `.planning/notion-comments-{YYYY-MM-DD}.md` (using today's date in ISO 8601 format). If the file already exists for today, append a counter (e.g., `notion-comments-2026-02-12-2.md`). Tell the user: "Comment interpretation saved to `.planning/notion-comments-{date}.md` — read the file for full details." Then present a brief summary inline: total comment count, page count, and a one-line-per-page overview (page title + comment count).

**File format when saving:**

```markdown
# Notion Comment Interpretation — {YYYY-MM-DD}

**Source:** {N} comments from {M} pages
**Generated:** {YYYY-MM-DD}

## {Page Title 1}

> "{comment text}" — Author, 2026-02-12
>
> **Intent:** The commenter is asking for...

## {Page Title 2}

...
```

**Note:** This interpretation output is separate from the triage results saved by the `save_results` step later in the workflow. The interpretation file provides raw understanding; the triage file records user decisions.

After either output path (inline or file), continue to the next step.

</step>

<step name="cluster_themes">

Read `.planning/ROADMAP.md` to understand the project's phase structure.

Analyze all fetched comments and identify 2-5 themes. For each theme:
1. **Theme name** — Short descriptive label (e.g., "Authentication UX Concerns", "API Documentation Gaps")
2. **Comments** — Which comments belong to this theme (by discussion text)
3. **Affected phases** — Which roadmap phases are impacted by this feedback (reference phase numbers and names from ROADMAP.md)
4. **Severity** — How critical is this theme? (blocking / important / nice-to-have)

Present the themes to the user:

```
## Comment Themes

Found {N} unresolved comments across {M} pages, grouped into {T} themes:

### Theme 1: {Name}
**Severity:** {blocking/important/nice-to-have}
**Affected phases:** Phase {X} ({name}), Phase {Y} ({name})
**Comments ({count}):**
- "{comment text excerpt}" — {author}, {page title}
- "{comment text excerpt}" — {author}, {page title}

### Theme 2: {Name}
...

---

Review these themes? (yes / adjust grouping / skip triage)
```

AskUserQuestion and wait for response.

- **"yes":** Continue to triage_discussion
- **"adjust grouping":** Ask user what to change, regroup, re-present
- **"skip triage":** Save themes as-is to dated file (skip discussion), jump to save_results

</step>

<step name="triage_discussion">

For each theme, conduct an interactive triage discussion:

```
## Triage: Theme {N}/{Total} — {Theme Name}

**Severity:** {severity}
**Affected phases:** {phase list}
**Comments:**
{Full comment text for each comment in this theme}

---

**Triage options:**
1. **Accept** — Create a task/requirement for this feedback
2. **Defer** — Acknowledge but handle in a future milestone
3. **Dismiss** — Not actionable or already addressed
4. **Discuss** — Need to think about this more

Your decision? (accept / defer / dismiss / discuss)
```

AskUserQuestion for each theme.

For each decision, record:
- Theme name
- Decision (accept / defer / dismiss / discuss)
- User's notes (if they provide additional context)
- Action items (if accept: what specifically needs to change)

If user chooses "discuss": engage in brief back-and-forth conversation about the theme, then ask for final decision (accept/defer/dismiss).

After all themes are triaged, present summary:

```
## Triage Summary

| Theme | Decision | Action |
|-------|----------|--------|
| {name} | Accepted | {brief action} |
| {name} | Deferred | To milestone v{X} |
| {name} | Dismissed | {reason} |

Save these results? (yes / revise)
```

AskUserQuestion. If "revise": let user change specific decisions, then re-present.

</step>

<step name="save_results">

Generate a dated triage output file.

**Filename:** `.planning/notion-comments-{YYYY-MM-DD}.md` where the date is today's date (ISO 8601 format).

**If file already exists for today:** Append a counter, e.g., `notion-comments-2026-02-11-2.md`

**File content template:**

```markdown
# Notion Comment Triage — {YYYY-MM-DD}

**Source:** {N} unresolved comments from {M} synced Notion pages
**Triaged by:** User + Claude
**Date:** {YYYY-MM-DD}

## Themes

### Theme 1: {Name}
**Decision:** {Accept / Defer / Dismiss}
**Severity:** {blocking / important / nice-to-have}
**Affected Phases:** Phase {X} ({name}), Phase {Y} ({name})
**Action:** {What needs to happen, or "Deferred to v{X}" or "Dismissed: {reason}"}

**Comments:**
- "{full comment text}" — {author} on {page title} ({date})
- "{full comment text}" — {author} on {page title} ({date})

### Theme 2: {Name}
...

## Summary

| Theme | Decision | Severity | Affected Phases |
|-------|----------|----------|-----------------|
| {name} | {decision} | {severity} | {phases} |

## Accepted Actions

{If any themes were accepted, list specific action items here:}

- [ ] {Action item from Theme 1}
- [ ] {Action item from Theme 2}

## Deferred Items

{If any themes were deferred:}

- {Theme name} — Deferred to {milestone/reason}

---
*Generated by /gsd:notion-comments on {YYYY-MM-DD}*
```

Write the file and commit:

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js commit "docs(10): save notion comment triage results" --files .planning/notion-comments-{date}.md
```

Present result:

```
Triage results saved to .planning/notion-comments-{date}.md

{If any accepted themes:}
Next steps for accepted items:
- Add requirements to next milestone via /gsd:new-milestone

{If all dismissed/deferred:}
All feedback triaged — nothing requires immediate action.
```

</step>

</process>

<success_criteria>
- [ ] Comments fetched from all synced Notion pages
- [ ] Comments grouped into 2-5 meaningful themes
- [ ] Each theme mapped to affected roadmap phases
- [ ] User walked through triage discussion for each theme
- [ ] Dated .md file saved with full triage results
- [ ] File committed to git
</success_criteria>
