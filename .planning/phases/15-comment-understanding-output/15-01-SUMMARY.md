---
phase: 15-comment-understanding-output
plan: 01
subsystem: notion-integration
tags: [workflow, comment-interpretation, output-routing]
dependencies:
  requires:
    - phase: 10
      plan: 02
      reason: Comment retrieval infrastructure (comment-retriever.js, JSON format)
  provides:
    - interpret_comments step in notion-comments workflow
    - Smart output routing (inline vs file based on token count)
  affects:
    - workflows: notion-comments.md
tech-stack:
  added: []
  patterns:
    - Token estimation heuristic (chars/4)
    - Conditional output routing based on content length
    - Grouped interpretation by source page
key-files:
  created: []
  modified:
    - get-shit-done/workflows/notion-comments.md: "Added interpret_comments step with grouping, interpretation, and output routing"
decisions:
  - choice: "Use 1500 token threshold for output routing"
    rationale: "Balances conversation readability with overflow prevention"
    alternatives: ["1000 tokens (too restrictive)", "2000 tokens (conversation too long)"]
    outcome: "good"
  - choice: "Characters ÷ 4 for token estimation"
    rationale: "Standard approximation, simple to calculate inline"
    alternatives: ["Actual token counting (too complex)", "Word count (less accurate)"]
    outcome: "good"
  - choice: "Group by source_page_title with source_file fallback"
    rationale: "Page title is more user-friendly than file path"
    alternatives: ["Always use source_file", "Group by phase instead"]
    outcome: "good"
metrics:
  duration_seconds: 67
  duration_minutes: 1
  tasks_completed: 2
  commits: 1
  files_modified: 1
  completed_at: "2026-02-12T16:07:39Z"
---

# Phase 15 Plan 01: Comment Understanding & Output Summary

**One-liner:** Added interpret_comments step to notion-comments workflow that groups comments by Notion page and provides plain-language interpretations with smart output routing (inline for short, file for long).

## Objective

Transform raw Notion comment JSON into plain-language interpretations that users can immediately understand, grouped by source file, with automatic output routing based on content length.

## What Was Built

### interpret_comments Step

A new workflow step inserted between `fetch_comments` and `cluster_themes` that:

1. **Groups comments by source page** using `source_page_title` field (falls back to `source_file` path if null)
2. **Generates plain-language interpretations** for each comment showing:
   - Original comment text in blockquote
   - Commenter name and date
   - Claude's understanding of the comment's intent
3. **Routes output smartly** based on token count:
   - **< 1500 tokens:** Presents inline in conversation
   - **>= 1500 tokens:** Saves to `.planning/notion-comments-{YYYY-MM-DD}.md` and shows brief summary

### Output Format

**Inline presentation:**
```markdown
## Comment Interpretation

Found {N} comments across {M} pages.

### {Page Title}

> "{comment text}" — Author, 2026-02-12
>
> **Intent:** The commenter is asking for...
```

**File format (when saved):**
```markdown
# Notion Comment Interpretation — {YYYY-MM-DD}

**Source:** {N} comments from {M} pages
**Generated:** {YYYY-MM-DD}

## {Page Title}
...
```

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Add interpret_comments step with source-file grouping | 5e499f3 | ✅ Complete |
| 2 | Add smart output routing (inline vs file) | 5e499f3 | ✅ Complete |

**Note:** Tasks 1 and 2 were completed together in a single implementation as they naturally form a cohesive feature.

## Key Changes

### Modified Files

**get-shit-done/workflows/notion-comments.md:**
- Inserted `<step name="interpret_comments">` between `fetch_comments` and `cluster_themes`
- Added grouping logic by `source_page_title` (with `source_file` fallback)
- Added interpretation format with original text, commenter, and intent
- Added token estimation (characters ÷ 4)
- Added output routing at 1500 token threshold
- Added file format specification for long outputs
- Noted separation between interpretation file and triage results file

### Workflow Flow

```
fetch_comments
    ↓
interpret_comments  ← NEW STEP
    ↓
cluster_themes
    ↓
triage_discussion
    ↓
save_results
```

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

### 1. Token Threshold: 1500 tokens

**Rationale:** Provides balance between conversation readability and preventing overflow. Based on typical comment volume, most sessions with <10 comments will present inline, while larger triage sessions (20+ comments) will route to file.

**Alternatives considered:**
- 1000 tokens: Too restrictive, would trigger file save for moderate comment counts
- 2000 tokens: Conversation becomes unwieldy with long inline output

### 2. Token Estimation: Characters ÷ 4

**Rationale:** Standard approximation (1 token ≈ 4 characters) that's simple to calculate inline without external dependencies.

**Alternatives considered:**
- Actual token counting: Requires tokenizer library, adds complexity
- Word count: Less accurate for code snippets and technical terms

### 3. Grouping by source_page_title (with fallback)

**Rationale:** Page title is more user-friendly and matches how users think about their Notion content.

**Alternatives considered:**
- Always use source_file: Less readable (shows file paths instead of page names)
- Group by phase: Doesn't match comment organization in Notion

## Verification Results

All success criteria met:

- ✅ Workflow has exactly 5 steps in order: fetch_comments, interpret_comments, cluster_themes, triage_discussion, save_results
- ✅ interpret_comments step groups by `source_page_title` (with `source_file` fallback)
- ✅ Each interpretation includes: original comment text, commenter name, date, and intent
- ✅ Output routing includes token estimation (chars/4) and 1500 threshold
- ✅ File output path is `.planning/notion-comments-{YYYY-MM-DD}.md` with counter for duplicates
- ✅ All original steps (fetch_comments, cluster_themes, triage_discussion, save_results) unchanged

## Self-Check

### Created Files

N/A - No new files created (only modified existing workflow file).

### Modified Files

- ✅ FOUND: get-shit-done/workflows/notion-comments.md (modified with interpret_comments step)

### Commits

- ✅ FOUND: 5e499f3 (feat(15-01): add interpret_comments step to notion-comments workflow)

## Self-Check: PASSED

All files modified and commits verified.

## Impact

### User Experience

- **Before:** Users saw raw JSON comment data, had to parse it manually to understand feedback
- **After:** Users see plain-language interpretations grouped by source page, immediately understand what commenters want

### Workflow Integration

- **Seamless:** New step fits naturally between fetch and cluster steps
- **Non-breaking:** Existing cluster_themes, triage_discussion, and save_results steps unchanged
- **Smart routing:** Prevents conversation overflow with automatic file save for large comment volumes

### Next Steps

Phase 16 (Phase Integration & User Control) will extend this foundation to:
- Let users incorporate comment feedback into existing phase plans
- Update ROADMAP.md with new requirements discovered from comments
- Provide user control over planning changes (discuss vs auto-incorporate)

## Related

- **Depends on:** Phase 10 Plan 02 (comment retrieval infrastructure)
- **Enables:** Phase 16 (incorporating comment feedback into planning)
- **Workflow:** get-shit-done/workflows/notion-comments.md

---

*Completed: 2026-02-12 in 1 minute*
