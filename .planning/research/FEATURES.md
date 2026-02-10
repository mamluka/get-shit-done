# Feature Research

**Domain:** PM Planning Tool (AI-assisted, markdown-based)
**Researched:** 2026-02-10
**Confidence:** MEDIUM (WebSearch verified with multiple sources, patterns confirmed across PM tools and AI workflows)

## Feature Landscape

### Table Stakes (Users Expect These)

Features PMs assume exist. Missing these = product feels incomplete or PMs leave.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Project structure visualization | PMs need to see phases, milestones, dependencies at a glance | LOW | Already exists via ROADMAP.md - just needs folder-per-project |
| Edit existing plans | Plans change constantly - inability to edit is a dealbreaker | MEDIUM | Core differentiator from current GSD. Needs phase-level edit, not just append |
| Git integration | PMs expect version control for planning docs, branching for scenarios | LOW | Already exists - ensure commit_docs: true |
| Markdown-native format | PMs using Claude expect markdown; visual tools add friction | LOW | Already native - competitive advantage |
| Phase dependencies | "Phase 3 requires Phase 1 complete" - table stakes for sequencing | MEDIUM | Implicit in current roadmap; may need explicit dependency field |
| Progress tracking | "Where are we?" is asked daily | LOW | Already exists via STATE.md and /gsd:progress |
| Task breakdown | High-level phases → atomic tasks PMs can assign to eng teams | LOW | Already exists via plan creation |
| Requirements traceability | "Which requirement does Phase 5 address?" must be answerable | LOW | Already exists via phase-requirement mapping |
| Multiple concurrent projects | PMs manage 3-5 initiatives; switching context must be painless | HIGH | **Critical gap** - current GSD assumes single project per repo |
| Search/filter capabilities | "Show me all auth-related phases" or "What's in v2 scope?" | MEDIUM | Missing - grows important as projects scale |
| Jira integration check | PMs live in Jira; validation that specs match tickets is essential | MEDIUM | Mentioned in context - MCP integration likely exists |
| Export functionality | Stakeholders want PDF/slides; PMs need formatted output | LOW | Markdown → PDF is standard; may need template |

### Differentiators (Competitive Advantage)

Features that set an AI-assisted PM planning tool apart. Not expected, but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-powered phase generation | PM describes goal → AI generates realistic phase breakdown | LOW | Already exists via /gsd:new-project - core value prop |
| Automatic research synthesis | AI researches domain, identifies pitfalls, recommends stack | MEDIUM | Already exists via research agents - huge time saver |
| Context-aware questioning | AI asks smart follow-ups based on project type (vs generic form) | LOW | Already exists - quality of questions is differentiator |
| Phase-specific context capture | Capture implementation preferences *before* planning (discuss-phase) | LOW | Already exists - prevents "build wrong thing" waste |
| Consistency validation | Check new phases against existing project decisions/conventions | MEDIUM | Plan-checker does some of this; expand to PM-level concerns |
| Requirements gap detection | "Your roadmap doesn't address requirement #3" | MEDIUM | Audit-milestone does this; surface earlier in flow |
| Scenario branching | "What if we prioritize mobile-first?" → fork planning branch | MEDIUM | Git branching exists; needs PM-friendly UX |
| Auto-advancing phase flow | Complete Phase 1 → auto-surfaces Phase 2 - no "what next?" | LOW | Mentioned in context - reduces cognitive load |
| Complexity estimation | AI flags "Phase 3 looks ambitious - consider splitting" | MEDIUM | Currently implicit; explicit scoring would help prioritization |
| Assumption surfacing | "This plan assumes authentication exists" - catch early | LOW | /gsd:list-phase-assumptions exists - underutilized gem |
| Cross-project learning | "We solved similar auth flows in Project X" | HIGH | Requires multi-project awareness + pattern matching |
| Stakeholder view generation | Auto-generate exec summary from technical roadmap | LOW | Templates + Claude = easy win for PM communication |
| Real-time collaboration hints | "Sarah edited Phase 3 context 2min ago" | MEDIUM | Git-based; needs file watching + notification layer |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Deliberately NOT build.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time collaborative editing | "Like Google Docs for planning" | Markdown + Git = conflict hell; AI regeneration breaks sync | Git branching for scenarios; async review via PRs |
| Gantt chart visualization | PMs trained on MS Project want visual timelines | Adds UI complexity; phase durations are estimates anyway; visual tools exist | Export markdown to tools that do this (Linear, Jira) |
| Time tracking per phase | "How long did research take?" | GSD is AI-orchestrated - times aren't meaningful for humans; adds noise | Git commit timestamps if truly needed |
| Approval workflows | "Manager must approve Phase 3 before planning" | Slows AI-assisted flow; PMs want speed over governance theater | PR review if needed; trust-based model default |
| Story points estimation | "Assign points to phases" | Story points are for sprint planning, not product roadmaps; false precision | Complexity flags (LOW/MEDIUM/HIGH) sufficient |
| Drag-and-drop phase reordering | Visual UX for sequencing | Markdown is source of truth; GUI adds sync complexity | Edit ROADMAP.md directly; decimal phase insertion exists |
| Built-in communication (chat/comments) | "Discuss within the tool" | Reinventing Slack; context scattered; PMs have comms tools | Link to Slack/Discord threads in STATE.md |
| Custom field proliferation | "Add Priority, Owner, Tags, Status, Risk..." | Each field = decision fatigue; markdown loses readability | Use consistent YAML frontmatter; keep minimal |
| Automated Jira ticket creation | "Generate Jira tickets from phases" | One-way sync creates divergence; Jira is eng's territory | Manual copy when ready; MCP integration for validation only |
| Multi-user permissions | "Only PMs can edit roadmap, eng read-only" | Git handles this; adds auth complexity; trust-based better | Use Git branch permissions if truly needed |
| Historical "what-if" analysis | "Show me what the roadmap looked like 2 weeks ago" | Git history does this; building UI redundant | `git log`, `git diff` - teach PMs git basics |

## Feature Dependencies

```
Multiple concurrent projects (folder-per-project)
    └──requires──> Project switching mechanism
                       └──requires──> Project state isolation

Edit capability
    └──requires──> Phase state validation (can't edit executed phases)
                       └──requires──> State machine per phase

Jira MCP integration
    └──enhances──> Requirements traceability
    └──enhances──> Export functionality

Auto-advancing phase flow
    └──requires──> Phase completion detection
    └──conflicts──> Manual phase-jumping (decide: linear vs random access)

Scenario branching (git branches)
    └──enhances──> Requirements gap detection (compare branches)
    └──conflicts──> Real-time collaboration (merge conflicts)

Complexity estimation
    └──requires──> Phase size heuristics (files, scope, dependencies)
    └──enhances──> Phase breakdown recommendations

Search/filter capabilities
    └──requires──> Structured metadata in planning files
    └──enhances──> Multi-project navigation
```

### Dependency Notes

- **Folder-per-project is foundational:** Current GSD assumes `.planning/` at repo root. PMs need `projects/{name}/.planning/`. This unblocks multi-project support, search, and cross-project learning.
- **Edit capability requires state tracking:** Can't edit Phase 3 if execution already started. Need clear phase lifecycle (draft → planned → executing → complete).
- **Auto-advancing conflicts with flexibility:** If flow auto-advances Phase 1 → Phase 2, does PM lose ability to jump to Phase 5? Decide: guided rail vs open exploration.
- **Git branching enables scenarios:** "What if we build iOS-first?" → branch, replan, compare. Powerful for PMs exploring options.

## MVP Definition

### Launch With (v1 - Planning Tool for PMs)

Minimum viable product — what PMs need to validate GSD as a planning-only tool.

- [ ] **Folder-per-project structure** — PMs manage multiple initiatives; switching must be seamless
- [ ] **Edit phase capability** — Plans change; inability to revise = dealbreaker
- [ ] **Git branching for scenarios** — "Explore mobile-first approach" without destroying current plan
- [ ] **Auto-advancing phase flow** — Reduce "what next?" cognitive load
- [ ] **Jira MCP validation** — Check if planning aligns with existing tickets (validation only, not creation)
- [ ] **Disable code execution** — Planning tool shouldn't run `/gsd:execute-phase`; clarify with warnings
- [ ] **Stakeholder export template** — Generate exec-friendly summary from ROADMAP.md + REQUIREMENTS.md

### Add After Validation (v1.x)

Features to add once PMs are actively using it and provide feedback.

- [ ] **Complexity estimation** — AI flags "Phase 4 looks too big" during roadmap creation
- [ ] **Cross-project search** — "Show me all phases related to authentication" across projects
- [ ] **Assumption surfacing UI** — Make `/gsd:list-phase-assumptions` more prominent in flow
- [ ] **Requirements gap early warning** — Surface audit-milestone logic during roadmap creation
- [ ] **Phase dependency visualization** — See which phases block others (DOT graph export?)

### Future Consideration (v2+)

Features to defer until product-market fit with PM teams is established.

- [ ] **Cross-project learning** — "We solved similar SSO in Project X; review that research?"
- [ ] **Real-time collaboration hints** — File watching + notifications when team edits planning docs
- [ ] **Custom report templates** — Beyond exec summary; board decks, sprint handoffs, etc.
- [ ] **Integration with PM tools** — Linear, Asana, Monday.com (beyond Jira)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Folder-per-project structure | HIGH | HIGH | P1 |
| Edit phase capability | HIGH | MEDIUM | P1 |
| Git branching for scenarios | MEDIUM | LOW | P1 |
| Auto-advancing phase flow | MEDIUM | LOW | P1 |
| Jira MCP validation | HIGH | MEDIUM | P1 |
| Disable code execution | HIGH | LOW | P1 |
| Stakeholder export | MEDIUM | LOW | P1 |
| Complexity estimation | MEDIUM | MEDIUM | P2 |
| Cross-project search | MEDIUM | MEDIUM | P2 |
| Requirements gap early warning | MEDIUM | LOW | P2 |
| Phase dependency visualization | LOW | MEDIUM | P2 |
| Cross-project learning | MEDIUM | HIGH | P3 |
| Real-time collaboration hints | LOW | MEDIUM | P3 |
| Custom report templates | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for PM planning tool launch
- P2: Should have, add when PMs validate core workflow
- P3: Nice to have, future consideration after adoption

## Competitor Feature Analysis

| Feature | Jira/Linear (PM SaaS) | GitHub Issues (Git-native) | Our Approach (AI + Markdown + Git) |
|---------|----------------------|---------------------------|-------------------------------------|
| Project structure | Custom fields, boards, swimlanes | Labels, milestones, projects | Folder-per-project + phase-based roadmap |
| Planning workflow | Manual ticket creation → manual sequencing | Manual issue creation → manual milestones | AI-generated phase breakdown from description |
| Research | None (PMs research externally) | None | AI researchers investigate domain automatically |
| Context capture | Comments, descriptions (unstructured) | Issue descriptions, PR reviews | Structured CONTEXT.md per phase before planning |
| Change management | Edit tickets freely, history tracked | Edit issues freely, history tracked | Edit phases (draft/planned only); git tracks changes |
| Collaboration | Real-time comments, @mentions | Async comments, PR reviews | Git-native; PRs for scenario branches |
| Traceability | Custom linking, automation rules | References in markdown, project views | Phase-requirement mapping + Jira validation |
| Export | PDF, CSV, API, integrations | Markdown export, API | Markdown native; templates for stakeholder formats |
| Complexity | High learning curve; power = complexity | Medium; git familiarity required | Low for PMs (natural language input); git optional |
| AI assistance | Add-ons (ChatGPT plugins) | Copilot suggestions (code-focused) | Native; AI orchestrates entire planning flow |

**Key differentiation:**
- **Jira/Linear:** Powerful but manual. PMs spend hours sequencing, writing specs, updating fields. No AI planning assistance.
- **GitHub Issues:** Developer-centric. PMs feel lost without boards/sprints. Better than Jira for eng, worse for PM planning.
- **GSD for PMs:** AI does research + phase generation + task breakdown. PMs guide via natural language. Markdown native (no UI lock-in). Git branching for scenarios (explore without destroying).

## Sources

### General PM Planning Tools
- [Best 21 Project Management Software to Compare in 2026](https://www.wrike.com/project-management-guide/faq/what-are-project-management-tools/)
- [40 Best Project Management Software Picked For 2026](https://thedigitalprojectmanager.com/tools/best-project-management-software/)
- [Essential project management software features in 2026](https://www.goodday.work/blog/project-management-software-features/)
- [Ultimate guide to project management software in 2026 | Teamwork.com](https://www.teamwork.com/blog/project-management-software-buyers-guide/)

### AI-Assisted Project Planning
- [The 10 Best AI Project Management Tools for 2026 by Forecast](https://www.forecast.app/blog/10-best-ai-project-management-software)
- [The 6 best AI project management tools in 2026](https://zapier.com/blog/best-ai-project-management-tools/)
- [10 Best AI Project Management Tools & Software in 2026](https://clickup.com/blog/ai-project-management-tools/)
- [How AI is transforming project management in 2026 | TechTarget](https://www.techtarget.com/searchenterpriseai/feature/How-AI-is-transforming-project-management)

### Product Manager Workflows
- [Product management trends 2026: 10 future predictions - Airtable](https://www.airtable.com/articles/product-management-trends)
- [The AI Product Management Workflows Every PM Needs In 2026 | Productside](https://productside.com/the-ai-product-management-workflows-2026/)
- [What Every Product Manager Should Prepare for in 2026 | by Enrique Somoza | Bootcamp | Medium](https://medium.com/design-bootcamp/what-every-product-manager-should-prepare-for-in-2026-ec810c33c675)

### Markdown/Git-Based Planning
- [GitHub - MrLesk/Backlog.md: A tool for managing project collaboration between humans and AI Agents](https://github.com/MrLesk/Backlog.md)
- [Markdown Projects – File based project management for AI agents](https://www.markdownprojects.com/)
- [Show HN: Markdown Projects – File based project management for AI agents | Hacker News](https://news.ycombinator.com/item?id=46943135)
- [GitHub - BaldissaraMatheus/Tasks.md: A self-hosted, Markdown file based task management board](https://github.com/BaldissaraMatheus/Tasks.md)
- [Managing IT Projects in a Text Mode | by Pixers | Medium](https://medium.com/pixers-stories/managing-it-projects-in-a-text-mode-and-more-374cd497309d)

### Jira Integration
- [23 Best Jira-Integrated Project Management Software 2026](https://thedigitalprojectmanager.com/tools/best-project-management-software-jira-integration/)
- [How to connect Jira MCP and Claude Code for effortless project management - Composio](https://composio.dev/blog/jira-mcp-server)
- [Claude AI Jira integration](https://www.eesel.ai/blog/claude-ai-jira-integration)

### Git-Based Project Planning
- [GitHub Issues · Project planning for developers](https://github.com/features/issues)
- [Can GitHub Be Used for Project Management?](https://www.dartai.com/blog/can-github-be-used-for-project-management)
- [The Planning Repo Pattern | by jason poley | Medium](https://medium.com/@jbpoley/the-planning-repo-pattern-160ee57adcaf)

### Hybrid Planning Approaches
- [Hybrid Project Management: Blend Agile And Waterfall Effectively](https://monday.com/blog/project-management/hybrid-project-management/)
- [What Is Hybrid Project Management? | TeamGantt](https://www.teamgantt.com/waterfall-agile-guide/hybrid-approach)
- [Hybrid Project Management: The Ultimate Guide | SixSigma.us](https://www.6sigma.us/project-management/hybrid-project-management/)

### AI Project Planning Pitfalls
- [Why Most AI Projects Fail: 10 Mistakes to Avoid | PMI Blog](https://www.pmi.org/blog/why-most-ai-projects-fail)
- [Why AI Projects Fail Due To Unstructured Execution](https://smartdev.com/why-ai-projects-fail-to-scale-and-how-to-fix-execution-before-its-too-late/)
- [Why Most AI Projects Fail: The Real Challenges Behind Implementation - Scalo](https://www.scalosoft.com/blog/why-most-ai-projects-fail-the-real-challenges-behind-implementation/)

---
*Feature research for: AI-assisted, markdown-based PM planning tool (GSD framework adaptation)*
*Researched: 2026-02-10*
*Confidence: MEDIUM - patterns confirmed across 25+ sources covering PM tools, AI workflows, markdown planning, and git-based collaboration*
