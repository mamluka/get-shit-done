# Feature Research

**Domain:** CLI workflow optimization (project initialization and phase planning)
**Researched:** 2026-02-12
**Confidence:** HIGH

## Feature Landscape

This research covers v1.2 features for streamlining the new-project-to-Notion workflow in an existing CLI tool (GSD for PMs). All features extend existing workflows rather than create new ones.

### Table Stakes (Users Expect These)

Features users expect when optimizing CLI setup and workflow flows.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Default/Recommended Settings Shortcut | CLI tools universally provide `-y`/`--yes` flags to accept defaults (npm, apt, yarn) | LOW | Existing: 8-question new-project wizard. Change: add "Apply recommended?" option before questions |
| Validation Feedback During Input | Users expect immediate feedback when entering config values to avoid re-doing entire process | LOW | Existing: Notion API key prompt in install.js validates format. Change: add similar validation to parent page URL |
| Post-Workflow Optional Actions | CLIs prompt for related actions after completing workflows (git commit → push, npm install → npm start) | MEDIUM | Existing: complete-milestone shows "Next up" suggestions. Change: add optional Notion sync prompt |
| URL Format Flexibility | Tools accept various URL formats and extract IDs automatically (GitHub CLI accepts full URLs or repo slugs) | LOW | Notion URLs: `notion.so/{slug}-{32-char-id}` or `notion.so/{workspace}/{slug}-{32-char-id}`. Extract last 32 chars |

### Differentiators (Competitive Advantage)

Features that set GSD apart from standard CLI tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Discussion-Before-Planning Loop | Conversational context gathering before formal planning reduces errors and improves plan quality | MEDIUM | Insert `/gsd:discuss-phase` into auto-advance loop before planning each phase. Research shows interactive planning receives feedback to alter steps |
| Context-Aware Workflow Chaining | Auto-advance through discuss → plan → complete → next phase without manual commands reduces cognitive load for PMs | MEDIUM | Existing: plan-phase auto-completes and advances. Change: add discuss step before planning, maintain loop state across phases |
| Smart Setting Recommendations | Curated recommendations based on user type (PM vs Dev) vs generic defaults improves first-run experience | LOW | Existing: 8 settings questions with "(Recommended)" labels. Change: bundle into preset with single accept/customize choice |
| Rich Interactive Prompts | Structured prompts with descriptions vs raw Y/N questions improves decision quality | LOW | Existing: AskUserQuestion tool with headers, multi-select. Already implemented well in new-project workflow |

### Anti-Features (Commonly Requested, Often Problematic)

Features to explicitly NOT build.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Auto-Sync on Every File Change | Real-time updates feel modern and automated | Notion rate limit (3 req/sec), excessive API calls during drafts, users lose control of what's published | Post-milestone prompt: user controls when to sync |
| Skip All Settings (Pure Auto Mode) | Fastest possible setup | Different user types need different configs (YOLO for experienced PMs, Interactive for beginners). No single "best" | Recommended preset covers 90%, user can customize if needed |
| Pre-Discussion for Every Phase | Maximum context for all phases | Some phases are self-explanatory (foundation setup), discussion adds overhead. Not all phases need it | Selective: auto-trigger discuss only for complex phases (determined by requirement count or planner request) |
| Multi-Step Notion Parent Selection | Visual tree picker for workspace → database → page | Requires Notion workspace introspection API, complex UI in CLI, fragile (breaks if workspace structure changes) | Simple URL paste: user navigates Notion web UI (familiar), copies URL, pastes. Robust and familiar |

## Feature Dependencies

```
Quick Settings Shortcut (no dependencies)

Auto-Discuss Before Planning
    └──requires──> plan-phase auto-advance (existing v1.0)
    └──requires──> discuss-phase command (existing v1.0)

Notion Sync Prompt
    └──requires──> complete-milestone workflow (existing v1.1)
    └──requires──> sync-notion command (existing v1.1)

Notion Parent Page URL Collection
    └──requires──> install.js prompts (existing v1.0)
    └──requires──> config.json notion section (existing v1.1)
```

### Dependency Notes

- **Quick Settings Shortcut requires no dependencies**: Standalone feature, modifies new-project Step 6 only
- **Auto-Discuss requires plan-phase auto-advance**: Inserts discuss step into existing loop (plan → complete → advance → **discuss** → plan)
- **Notion Sync Prompt requires complete-milestone**: Adds prompt after milestone marked complete, before final message
- **Notion Parent Page URL Collection requires install.js prompts**: Adds to existing Notion API key prompt flow

## MVP Definition

### Launch With (v1.2)

Minimum viable improvements to streamline workflows.

- [x] Quick Settings Shortcut — Reduces decision fatigue during project setup, addresses user feedback about "too many questions"
- [x] Auto-Discuss Before Planning — Improves plan quality by gathering context, addresses feedback about "plans miss important details"
- [x] Notion Sync Prompt After Milestone — Closes the loop on Notion integration, addresses "I forget to sync after planning"
- [x] Notion Parent Page URL Collection — Completes Notion setup during install, addresses "where do pages go when I sync?"

### Add After Validation (v1.x)

Features to add once core workflow improvements validated.

- [ ] Selective Auto-Discuss (Only Complex Phases) — Trigger: Users report overhead for simple phases (e.g., "Phase 1: Foundation doesn't need discussion")
- [ ] Recommended Settings Profiles by Role — Trigger: Different user types emerge (e.g., technical PMs vs non-technical PMs need different defaults)
- [ ] Phase-Specific Sync (Sync Individual Phases, Not Whole Milestone) — Trigger: Users want to share work-in-progress with stakeholders mid-milestone

### Future Consideration (v2+)

Features to defer until v1.2 usage patterns observed.

- [ ] Notion Workspace Introspection (Browse Databases/Pages in CLI) — Why defer: Requires Notion Search API, complex UX, unclear value vs URL paste
- [ ] Multi-Level Discussion (Discuss → Plan → Discuss Gaps → Replan) — Why defer: Adds significant complexity, unclear if single discussion pass insufficient
- [ ] Auto-Trigger Discuss Based on Phase Complexity — Why defer: Need data on which phase characteristics predict "needs discussion" (requirement count? novelty? user uncertainty?)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Quick Settings Shortcut | HIGH | LOW | P1 |
| Auto-Discuss Before Planning | HIGH | MEDIUM | P1 |
| Notion Sync Prompt | MEDIUM | LOW | P1 |
| Notion Parent Page URL | MEDIUM | LOW | P1 |
| Selective Auto-Discuss | MEDIUM | MEDIUM | P2 |
| Settings Profiles by Role | MEDIUM | MEDIUM | P2 |
| Phase-Specific Sync | LOW | MEDIUM | P3 |
| Workspace Introspection | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (all v1.2 features)
- P2: Should have, add when usage data validates need
- P3: Nice to have, future consideration

## Implementation Patterns Analysis

### Quick Settings Pattern

**Pattern: Preset Override**

Common in CLIs with complex configuration:
- npm init -y (accepts all defaults)
- Azure CLI: `az init` offers "interaction" or "automation" presets
- AWS CLI: profiles with default settings

**GSD Application:**
```
Before (8 questions):
→ Mode? (YOLO/Interactive)
→ Depth? (Quick/Standard/Comprehensive)
→ Plan Processing? (Parallel/Sequential)
→ Git Tracking? (Yes/No)
→ Research? (Yes/No)
→ Plan Check? (Yes/No)
→ Verifier? (Yes/No)
→ Model Profile? (Quality/Balanced/Budget)

After (1 question):
→ "Apply recommended settings for PMs? (YOLO mode, Standard depth, Parallel processing, Git tracking, all agents enabled, Balanced models)"
  → Yes (skip remaining questions)
  → No, customize (show original 8-question flow)
```

**Confidence:** HIGH — npm -y pattern universally understood

### Auto-Discuss Pattern

**Pattern: Conversational Planning**

Research findings:
- Interactive planning systems receive natural language feedback from users (arXiv: Conversational Planning for Personal Plans)
- AI agents conduct structured information gathering through conversation (A Workflow Analysis of Context-driven Conversational Recommendation)
- Adding context to conversations distributes cognitive tasks between users and AI (Agentic Workflows for Conversational Human-AI Interaction Design)

**GSD Application:**
```
Current Flow (plan-phase auto-advance):
plan phase 1 → complete → advance → plan phase 2 → complete → advance → ...

New Flow (with auto-discuss):
plan phase 1 → complete → advance → **discuss phase 2** → plan phase 2 → complete → advance → ...
```

**Confidence:** HIGH — Established pattern in conversational AI design

### Post-Workflow Prompt Pattern

**Pattern: Suggested Next Action**

Common in version control and deployment CLIs:
- git commit success → "Use 'git push' to publish your changes"
- npm install success → "Run 'npm start' to launch"
- docker build success → "Run 'docker run <image>' to start container"

**GSD Application:**
```
Current (complete-milestone):
✓ Milestone complete
---
Files: .planning/...
Next: /gsd:new-milestone

New (with Notion prompt):
✓ Milestone complete
---
Would you like to sync planning docs to Notion? [y/N]
→ Yes: triggers /gsd:sync-notion automatically
→ No: shows "Run /gsd:sync-notion later to sync"
```

**Confidence:** HIGH — Universal CLI pattern

### Notion Parent Page Pattern

**Pattern: ID Extraction from URL**

Common in SaaS integration CLIs:
- GitHub CLI: accepts full URLs, extracts repo ID
- Jira CLI: accepts issue URLs, extracts issue key
- Notion SDK: accepts page URLs, extracts page ID

**URL Format:**
```
Format 1: https://www.notion.so/{slug}-{32-char-id}
Format 2: https://www.notion.so/{workspace}/{slug}-{32-char-id}
Format 3 (with query params): ...?v={view-id}&p={page-id}

Extraction Strategy:
1. Remove query params (split on ?)
2. Extract last 32 hex characters from path
3. Insert hyphens in 8-4-4-4-12 pattern
4. Result: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (UUID v4 format)
```

**Confidence:** HIGH — Notion API documentation confirms format

## Complexity Assessment

| Feature | Technical Complexity | UX Complexity | Overall |
|---------|---------------------|---------------|---------|
| Quick Settings | LOW — Bundle existing questions into preset | LOW — Binary choice familiar to users | LOW |
| Auto-Discuss | MEDIUM — Insert discuss step into plan-phase loop, maintain state | LOW — Transparent to user (loop just includes more steps) | MEDIUM |
| Notion Sync Prompt | LOW — Add Y/N prompt after complete-milestone | LOW — Optional action, common pattern | LOW |
| Notion Parent URL | LOW — Regex extraction, format validation | LOW — URL paste familiar, validation provides feedback | LOW |

## Sources

### CLI UX Patterns
- [UX patterns for CLI tools](https://www.lucasfcosta.com/blog/ux-patterns-cli-tools)
- [Command Line Interface Guidelines](https://clig.dev/)
- [10 design principles for delightful CLIs - Atlassian](https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis)

### Recommended Settings Pattern
- [npm-init | npm Docs](https://docs.npmjs.com/cli/v10/commands/npm-init/)
- [Azure CLI configuration options | Microsoft Learn](https://learn.microsoft.com/en-us/cli/azure/azure-cli-configuration?view=azure-cli-latest)
- [AWS CLI configuration | AWS Documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)
- [Quickly accepting defaults of npm init](https://paulsalaets.com/posts/quickly-accepting-defaults-of-npm-init-and-bower-init/)

### Workflow Chaining & Auto-Advance
- [Beyond the Editor: Continue CLI Automation](https://blog.continue.dev/beyond-the-editor-how-im-using-continue-cli-to-automate-everything/)
- [Working with OpenAI's Codex CLI: Advanced Workflows](https://www.anothercodingblog.com/p/working-with-openais-codex-cli-commands)
- [12 CLI Tools That Are Redefining Developer Workflows](https://www.qodo.ai/blog/best-cli-tools/)

### Conversational Planning
- [Conversational Planning for Personal Plans - arXiv](https://arxiv.org/html/2502.19500v1)
- [A Workflow Analysis of Context-driven Conversational Recommendation](https://dl.acm.org/doi/pdf/10.1145/3442381.3450123)
- [Agentic Workflows for Conversational Human-AI Interaction Design - arXiv](https://arxiv.org/html/2501.18002v1)

### Notion API
- [Working with databases - Notion Docs](https://developers.notion.com/guides/data-apis/working-with-databases)
- [How to Get Your Root Notion Page ID](https://docs.engine.so/root-notion-page-id)
- [How To Use The Notion API For A Low-Code CMS](https://www.rowy.io/blog/notion-api)

---
*Feature research for: v1.2 Streamlined Workflow*
*Researched: 2026-02-12*
