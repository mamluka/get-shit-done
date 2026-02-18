<purpose>
Retrieve unresolved comments from synced Notion pages, interpret each comment, analyze them against the current roadmap, recommend planning changes (update existing phases or create new ones), and let the user choose between interactive discussion or auto-incorporation. Applies accepted changes directly to ROADMAP.md, REQUIREMENTS.md, and phase directories.
</purpose>

<required_reading>
1. `.planning-pm/ROADMAP.md`
2. `.planning-pm/STATE.md`
3. `.planning-pm/REQUIREMENTS.md`
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

No comments to process. You're all clear!
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
   - **If estimated tokens >= 1500:** Save the interpretation to `.planning-pm/notion-comments-{YYYY-MM-DD}.md` (using today's date in ISO 8601 format). If the file already exists for today, append a counter (e.g., `notion-comments-2026-02-12-2.md`). Tell the user: "Comment interpretation saved to `.planning-pm/notion-comments-{date}.md` — read the file for full details." Then present a brief summary inline: total comment count, page count, and a one-line-per-page overview (page title + comment count).

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

**Note:** This interpretation output (when saved to file) provides raw understanding of comments. The `incorporate_changes` step later in the workflow applies accepted changes directly to planning artifacts.

After either output path (inline or file), continue to the next step.

</step>

<step name="analyze_and_recommend">

After comment interpretation, analyze each comment against the current roadmap and recommend planning changes.

**1. Read the current roadmap:**

Read `.planning-pm/ROADMAP.md` and `.planning-pm/REQUIREMENTS.md` to understand the current phase structure, goals, requirements, and what's in progress vs complete.

**2. For each interpreted comment**, analyze whether it:

**Updates an existing phase** — the feedback relates to a phase that already exists (even if complete). Claude identifies which specific phase and what changes are needed:
- Add a new requirement
- Add a new success criterion
- Update the goal
- Modify existing requirements

**Creates a new phase** — the feedback suggests entirely new capability not covered by any existing phase. Claude proposes:
- Phase name
- Goal (outcome-shaped, not task-shaped)
- Requirements (using the project's requirement ID format from REQUIREMENTS.md)
- Success criteria (what must be TRUE)
- Where it fits in the roadmap (which milestone, after which phase)

**3. Present recommendations** in a structured format:

```
## Recommended Changes

Based on the comments, I recommend the following planning changes:

### Change 1: Update Phase {N} — {Phase Name}
**Type:** Update existing phase
**Affected phase:** Phase {N} ({name})
**What to change:**
- Add requirement {ID}: {description}
- Add success criterion: {criterion text}
**Rationale:** {Why this comment maps to this phase}

### Change 2: Create New Phase — {Proposed Name}
**Type:** New phase
**Proposed name:** {name}
**Goal:** {outcome-shaped goal}
**Requirements:**
- {ID}: {description}
**Success criteria:**
1. {criterion}
**Suggested placement:** After Phase {N} in milestone {X}
**Rationale:** {Why this needs a new phase}

### Change 3: ...
```

If no comments warrant planning changes (e.g., all are "nice work" or already addressed), say so and end the workflow:
```
None of the comments require planning changes. All feedback is either already addressed or informational.
```

**4. After presenting recommendations, prompt the user with exactly two options:**

```
How would you like to proceed?

1. **Discuss changes** — I'll walk through each proposed change for your approval
2. **Let Claude decide** — I'll incorporate all recommended changes automatically

Your choice? (discuss / auto)
```

AskUserQuestion and wait for response.

</step>

<step name="incorporate_changes">

This step handles both the discuss and auto paths.

**Path A: "Discuss changes" (CTRL-02)**

For each recommended change, present it individually and ask:

```
## Change {N}/{Total}: {Change title}

{Full change details from recommendations}

**Options:**
- **Accept** — Apply this change as proposed
- **Modify** — Apply with modifications (describe what to change)
- **Skip** — Don't apply this change

Your decision? (accept / modify / skip)
```

AskUserQuestion for each change. If "modify", ask for specifics and update the change accordingly.

After all changes are reviewed, present a summary of accepted changes before applying.

**Path B: "Let Claude decide" (CTRL-03)**

Apply all recommended changes automatically without per-change review.

**Applying changes (both paths converge here):**

For each accepted change, Claude modifies the actual planning artifacts:

**1. For existing phase updates:**
- Read the target section of `.planning-pm/ROADMAP.md`
- Add new requirements to the phase's **Requirements** line
- Add new success criteria to the phase's **Success Criteria** section
- Update the phase goal if recommended
- If requirements are added, also add them to `.planning-pm/REQUIREMENTS.md`:
  - Add new requirement entries under the appropriate section (create a new section if needed)
  - Add entries to the Traceability table at the bottom

**2. For new phase creation:**
- Add a new phase entry to `.planning-pm/ROADMAP.md` following the existing format:
  ```
  ### Phase {N}: {Name}

  **Goal**: {goal}

  **Depends on**: {dependency}

  **Requirements**: {comma-separated IDs}

  **Success Criteria** (what must be TRUE):
    1. {criterion}

  **Plans**: 0 plans (not started)

  Plans:
  - [ ] {N}-01-PLAN.md — TBD
  ```
- Add new requirements to `.planning-pm/REQUIREMENTS.md`
- Add to the Progress table in ROADMAP.md
- Create the phase directory: `.planning-pm/phases/{N}-{slug}/`

**3. Commit all changes:**
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js commit "docs(16): incorporate comment feedback into planning artifacts" --files .planning-pm/ROADMAP.md .planning-pm/REQUIREMENTS.md
```

**4. Present result:**
```
## Changes Applied

| Change | Type | Artifact Modified |
|--------|------|-------------------|
| {title} | Update Phase {N} | ROADMAP.md, REQUIREMENTS.md |
| {title} | New Phase {N} | ROADMAP.md, REQUIREMENTS.md |

Planning artifacts updated. Run `/gsd-pm:plan-phase` to plan any new phases.
```

If no changes were accepted (all skipped in discuss mode):
```
No changes applied. All recommendations were skipped.
```

</step>

</process>

<success_criteria>
- [ ] Comments fetched from all synced Notion pages
- [ ] Comments interpreted with plain-language understanding
- [ ] Each comment analyzed against current ROADMAP.md and mapped to existing phase update or new phase creation
- [ ] User prompted with "Discuss changes" or "Let Claude decide" choice
- [ ] If discussing: each change individually reviewed with accept/modify/skip
- [ ] If auto: all recommended changes applied automatically
- [ ] Accepted changes applied to ROADMAP.md (phase updates or new phases)
- [ ] New requirements added to REQUIREMENTS.md with traceability
- [ ] Changes committed to git
</success_criteria>
