# Stack Research

**Domain:** AI-assisted PM planning tools with markdown-native project management
**Researched:** 2026-02-10
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | >=16.7.0 | Runtime environment | Already in use by GSD; native fs/path APIs eliminate external dependencies; excellent for CLI tools with fast startup |
| JSON-RPC 2.0 | 2.0 | MCP communication protocol | Official MCP specification standard as of 2025-11-25; required for all MCP server/client interactions |
| YAML Frontmatter | - | Planning artifact metadata | Industry standard for markdown-based documentation systems (89% of technical writers report improved discoverability); enables structured metadata without external databases |
| Git | >=2.0 | Version control and artifact history | Native version tracking for planning documents; enables diff/merge workflows; branch-per-project isolation strategy |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **AVOID DEPENDENCIES** | - | Zero-dependency philosophy | GSD's existing architecture has zero external dependencies; maintain this for reliability and security |
| Native `fs` module | Built-in | File operations for `.planning/` folders | Always use for reading/writing markdown artifacts |
| Native `path` module | Built-in | Path resolution across platforms | Always use for folder structure manipulation |
| Native `child_process` module | Built-in | Git command execution | Always use for git operations (branch creation, status checks) |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| esbuild | Build tool for git hooks | Already in devDependencies; use for pre-commit hook bundling only |
| Node.js `--test` | Test runner | Native test framework (Node 16.7+); no external test framework needed |

## Installation

```bash
# Core - NO ADDITIONAL DEPENDENCIES
# GSD already has everything needed

# Dev dependencies (already present)
npm install -D esbuild@^0.24.0

# MCP Prerequisites (external, not npm packages)
# Users must have these available:
# - Jira MCP server (configured separately)
# - Claude with MCP support
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Zero dependencies | Popular CLI frameworks (Commander.js, Oclif) | Only if building a new CLI from scratch; GSD already has working CLI architecture |
| Native Node.js modules | Utility libraries (lodash, ramda) | Never for this project; maintain zero-dependency philosophy |
| YAML frontmatter | JSON frontmatter | When interoperating with JSON-heavy systems; YAML is more human-readable for PM audiences |
| Git branches per project | Git tags per project | When projects are truly immutable; branches allow ongoing edits to plans |
| Folder-per-version (`.planning/{name}/v1/`) | Flat structure (`.planning/{name}.md`) | When projects never need versioning; folder structure future-proofs for v2, v3 iterations |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Database (SQLite, PostgreSQL) | Adds complexity; planning artifacts are human-readable markdown that should live in git | Git-backed markdown files in `.planning/` folders |
| npm packages for simple utilities | Increases dependency surface; slower installs; security risks | Native Node.js APIs (fs, path, child_process) |
| Server-Sent Events (SSE) for MCP | Deprecated in MCP spec; replaced by Streamable HTTP (03-26-2025) | Streamable HTTP with chunked transfer encoding |
| Embedding MCP servers | Coupling violation; Jira MCP server is external service | Prerequisite check for external MCP server availability |
| Markdown parsers (marked, markdown-it) | Unnecessary for frontmatter extraction; adds dependencies | Simple regex/string manipulation for frontmatter |

## Stack Patterns by Variant

**For PM planning workflow (target use case):**
- Folder structure: `.planning/{project-name}/v{N}/` for version history
- Git branching: `project/{project-name}` branches isolated from main
- Frontmatter: YAML with fields: `phase`, `status`, `created`, `updated`, `assignee`
- MCP integration: Pre-flight check for Jira MCP server; fail gracefully with instructions

**For existing GSD development workflow (preserve):**
- DO NOT change: `.claude/` folder structure, zero-dependency philosophy, git integration patterns
- Reason: GSD's development orchestration is production-ready; PM planning is additive feature

**If future requirement for multi-project history visualization:**
- Consider: Read-only git log parsing for folder contents
- Store: Planning artifacts remain in git; no external database
- Visualize: CLI summary commands (e.g., `/gsd:planning-history`)

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Node.js >=16.7.0 | MCP Specification 2025-11-25 | JSON-RPC 2.0 available in all modern Node versions |
| Git >=2.0 | Branch-per-project pattern | Older git versions support branches; 2.0+ recommended for performance |
| YAML Frontmatter | All markdown processors | Universal standard; no processor-specific extensions needed |

## MCP Integration Architecture

### Discovery Pattern (RECOMMENDED)
```javascript
// Pre-flight check before PM planning commands
async function checkJiraMcpServer() {
  // 1. Check Claude configuration for registered MCP servers
  // 2. Look for 'jira' or 'atlassian' in server list
  // 3. Validate server responds to health check
  // 4. If missing: show setup instructions with links
  return { available: boolean, message: string };
}
```

### Health Check Pattern (RECOMMENDED)
```javascript
// Validate MCP server is responsive
async function validateMcpHealth(serverName) {
  // Use JSON-RPC 2.0 ping request
  // Expected response within 5-10 seconds
  // Comprehensive check validates tool availability
  return { healthy: boolean, tools: string[] };
}
```

### Jira MCP Integration Pattern (2025 STANDARD)
- **Authentication:** OAuth via Atlassian Remote MCP Server (hosted by Atlassian)
- **Transport:** Streamable HTTP with chunked transfer encoding (MCP spec 2025-11-25)
- **Tools:** `jira.createIssue`, `jira.listIssues`, `jira.updateIssue` (validate via health check)
- **Permissions:** Respects existing Jira user permissions; no elevation
- **Configuration:** User must configure in Claude settings; not embedded in GSD

### Error Handling Pattern
```javascript
// Graceful degradation if MCP unavailable
if (!jiraMcpAvailable) {
  console.log("⚠️  Jira MCP server not found.");
  console.log("PM planning commands require Jira integration.");
  console.log("Setup instructions: https://www.atlassian.com/blog/announcements/remote-mcp-server");
  process.exit(1);
}
```

## Folder Structure Pattern

### Planning Artifacts Layout
```
.planning/
├── {project-name}/          # One folder per project
│   ├── v1/                  # Version 1 of the plan
│   │   ├── ROADMAP.md       # Phase-based roadmap
│   │   ├── CONTEXT.md       # Project context and goals
│   │   ├── REQUIREMENTS.md  # Requirements specification
│   │   └── research/        # Optional research artifacts
│   │       ├── STACK.md
│   │       ├── FEATURES.md
│   │       └── PITFALLS.md
│   └── v2/                  # Version 2 (if plan revised)
│       └── ...              # Same structure as v1
└── research/                # Cross-project research (this file)
    └── STACK.md
```

### Git Branch Strategy
```
main                         # Production code (existing GSD)
├── project/project-name     # PM planning artifacts only
│   └── Commits:
│       - "plan: Initialize project-name v1"
│       - "plan: Update phase 3 requirements"
│       - "plan: Complete v1 roadmap"
└── feature/dev-branch       # Development branches (existing pattern)
```

**Rationale:**
- `project/*` branches never merge to `main` (planning ≠ code)
- Folder versioning (`v1/`, `v2/`) tracks plan iterations
- Git history provides audit trail for PM decisions
- Branch-per-project enables parallel planning work

## Markdown Conventions for PM Artifacts

### Frontmatter Standard
```yaml
---
phase: 1
status: planning | in-progress | blocked | complete
created: 2026-02-10
updated: 2026-02-10
assignee: pm-name
project: project-name
version: 1
tags: [backend, api, auth]
---
```

### File Naming
- Roadmaps: `ROADMAP.md` (uppercase, no version suffix)
- Research: `STACK.md`, `FEATURES.md`, `PITFALLS.md` (template-based names)
- Context: `CONTEXT.md`, `REQUIREMENTS.md` (specification documents)
- Phases: `phase-1.md`, `phase-2.1.md` (lowercase, decimal numbering for sub-phases)

### Content Structure
```markdown
# [Document Title]

[Frontmatter]

## Summary
[One-paragraph overview]

## [Section]
[Content with checkboxes for actionable items]
- [ ] Task or requirement
- [x] Completed item

## Sources
- [Link to reference]
```

## What NOT to Change in Existing Stack

| Component | Reason to Preserve | Risk if Changed |
|-----------|-------------------|----------------|
| `.claude/` folder structure | Agents, commands, and templates are stable | Break existing GSD workflows for dev teams |
| Zero external dependencies | Security, reliability, fast installs | Maintenance burden, supply chain attacks |
| Git integration patterns | Git hooks and planning commits work | Complex rewrite; no user benefit |
| Node.js native APIs | Cross-platform, stable, fast | External libs add weight for marginal DX improvement |
| Decimal phase calculation | Established convention in codebase | Confusion for users with existing projects |

**Key principle:** PM planning is an ADDITIVE feature. Existing GSD development orchestration remains untouched.

## Sources

### HIGH Confidence (Official Documentation)
- [Model Context Protocol Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) — MCP protocol requirements, JSON-RPC, transport mechanisms
- [Atlassian Remote MCP Server](https://www.atlassian.com/blog/announcements/remote-mcp-server) — Jira MCP integration patterns, OAuth authentication
- [Backlog.md GitHub Repository](https://github.com/MrLesk/Backlog.md) — Markdown-native folder structure, versioning patterns
- [Semantic Versioning 2.0.0](https://semver.org/) — Versioning principles for planning artifacts

### MEDIUM Confidence (Industry Best Practices)
- [MCP Best Practices: Architecture & Implementation Guide](https://modelcontextprotocol.info/docs/best-practices/) — Server health checks, discovery patterns
- [Build Health Check Endpoints for MCP Servers - MCPcat](https://mcpcat.io/guides/building-health-check-endpoint-mcp-server/) — Health check implementation patterns
- [Node.js CLI Apps Best Practices - GitHub](https://github.com/lirantal/nodejs-cli-apps-best-practices) — Zero-dependency philosophy, user experience patterns
- [SSW Rules: Best Practices for Frontmatter in Markdown](https://www.ssw.com.au/rules/best-practices-for-frontmatter-in-markdown) — YAML frontmatter standards

### MEDIUM Confidence (2025/2026 Market Research)
- [Transform Project Management with Git and AI: backlog.md - DEV Community](https://dev.to/thedavestack/transform-project-management-with-git-and-ai-backlogmd-28d0) — Markdown-based PM patterns
- [Git Branching Strategy: A Complete Guide - DataCamp](https://www.datacamp.com/tutorial/git-branching-strategy-guide) — Branch-per-project strategies
- [The 10 Best AI Project Management Tools for 2026 - Forecast](https://www.forecast.app/blog/10-best-ai-project-management-software) — AI-assisted planning trends
- [2026: The Year for Enterprise-Ready MCP Adoption - CData](https://www.cdata.com/blog/2026-year-enterprise-ready-mcp-adoption) — MCP enterprise patterns

### LOW Confidence (Trends, Not Technical Specifications)
- [Agile Git Branching Strategies in 2026 - Java Code Geeks](https://www.javacodegeeks.com/2025/11/agile-git-branching-strategies-in-2026.html) — Branching strategy trends (not GSD-specific)
- [Project management automation - Wrike](https://www.wrike.com/blog/project-management-automation/) — Phase-based workflow patterns (general PM tools)

---
*Stack research for: AI-assisted PM planning tool modifications to GSD framework*
*Researched: 2026-02-10*
*Confidence: HIGH (MCP/Node.js/Git verified with official sources)*
