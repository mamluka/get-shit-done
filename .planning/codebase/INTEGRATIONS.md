# External Integrations

**Analysis Date:** 2026-02-10

## APIs & External Services

**Web Search:**
- Brave Search API - Enables research agents to search web during planning phases
  - SDK/Client: Native `fetch()` API
  - Auth: `X-Subscription-Token` header
  - Env var: `BRAVE_API_KEY`
  - Fallback storage: `~/.gsd/brave_api_key` file
  - Optional: Falls back to agent's built-in WebSearch if not configured
  - Endpoint: `https://api.search.brave.com/res/v1/web/search`
  - Parameters: query, limit, country, search_lang, text_decorations, freshness

**IDE/Editor Runtimes:**
- Claude Code - Primary target runtime
  - Integration: Slash commands installed to `~/.claude/commands/gsd/`
  - Metadata: `.claude/settings.json` for permissions and hooks
  - Hooks: `gsd-statusline.js`, `gsd-check-update.js`
- OpenCode - Community port support
  - Integration: Slash commands installed to `~/.config/opencode/commands/`
  - XDG compliance: Respects `XDG_CONFIG_HOME`, `OPENCODE_CONFIG_DIR`
  - Detection: Environment variables for config path discovery
- Gemini CLI - Google's CLI
  - Integration: Slash commands installed to `~/.gemini/commands/gsd/`
  - Config detection: Via `GEMINI_CONFIG_DIR` env var

## Version Control

**Git Integration:**
- Direct system commands via `child_process.execSync()`
- No npm packages (not git2, simple-git, etc.)
- Operations:
  - `git status` - Check working tree state
  - `git add` - Stage planning docs and code changes
  - `git commit` - Atomic commits per task with templated messages
  - `git log` - Extract commit history for context
  - `git diff` - Analyze changes for verification
  - `git tag` - Release tagging for milestones

## Authentication & Identity

**No User Auth:**
- GSD is a local CLI tool with no authentication
- Operates with user's local git config (author name/email from `git config`)

**IDE-Level Permissions:**
- Claude Code permissions matrix defined in `.claude/settings.json`
- Controls which operations (read, write, execute) are allowed per tool
- Protects against accidental dangerous operations

## File Storage

**Local Filesystem Only:**
- All project state stored in `.planning/` directory
- No cloud storage, no database required
- Files committed to git repository

**Planning Documents Structure:**
- `.planning/config.json` - Project configuration
- `.planning/research/` - Research findings from agents
- `.planning/phases/` - Phase plans, execution summaries, verification
- `.planning/quick/` - Ad-hoc task tracking
- `.planning/codebase/` - Architecture and code analysis (from map-codebase)

## Monitoring & Observability

**Error Tracking:**
- None integrated
- Errors output to stdout/stderr

**Logs:**
- Console output via `console.log()`, `console.error()`
- No persistent logging framework
- Git commit history serves as audit trail

**Update Checking:**
- `gsd-check-update.js` hook - Periodically checks npm registry for newer versions
- Calls `npm view get-shit-done-cc version` to compare
- No telemetry

## CI/CD & Deployment

**Hosting:**
- Distributed via npm registry (npmjs.com)
- Installed globally or locally via `npx get-shit-done-cc@latest`

**Supported Platforms:**
- Mac, Windows, Linux (via Node.js cross-platform support)

**Installation Methods:**
- Interactive: `npx get-shit-done-cc` (prompts for runtime and location)
- Non-interactive: `npx get-shit-done-cc --claude --global --all`
- Docker/CI compatible with `--local` or `CLAUDE_CONFIG_DIR` env var
- Development: `git clone` + `node bin/install.js --claude --local`

**Build Process:**
- `npm run build:hooks` - Copies hook files to `hooks/dist/`
- `npm run prepublishOnly` - Automatically runs before `npm publish`
- esbuild not actually used for bundling (just file copy, future-proofing)

## Environment Configuration

**Installation Environment Variables:**
- `CLAUDE_CONFIG_DIR` - Override ~/.claude for global install
- `OPENCODE_CONFIG_DIR` - Override OpenCode config location
- `GEMINI_CONFIG_DIR` - Override ~/.gemini for global install
- `XDG_CONFIG_HOME` - XDG Base Directory Specification (OpenCode only)

**Runtime Environment Variables:**
- `BRAVE_API_KEY` - Optional Brave Search API key for research phases
- Checked first before `.gsd/brave_api_key` file fallback

**Secrets Location:**
- Environment variables: `BRAVE_API_KEY` (if providing API key)
- NO .env file support in GSD itself
- Projects using GSD can use their own .env for application code

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

**IDE Hooks:**
- `gsd-statusline.js` - Periodically displays progress indicator in IDE
- `gsd-check-update.js` - Background check for GSD updates
- Both runs as Node.js child processes via IDE hook system
- Registered in `.claude/settings.json` (or equivalent for other IDEs)

## Data Flow: External Integrations

**Research Phase:**
1. Research agent receives phase context from `.planning/`
2. If Brave API configured (BRAVE_API_KEY set), agent requests web search
3. GSD tools `websearch` command calls `https://api.search.brave.com/res/v1/web/search`
4. Results parsed and formatted back to agent
5. Agent synthesizes findings into `RESEARCH.md`

**Execution Phase:**
1. Executor reads plans from `.planning/phases/{n}/`
2. Implements code changes to project filesystem
3. Stages changes via `git add`
4. Commits via `git commit` with GSD-formatted message
5. Executor verifies via `git diff` against expected changes

**Verification Phase:**
1. Verifier agent checks committed code against requirements
2. May use git history to trace implementation
3. Documents findings in `VERIFICATION.md`
4. Reports to user for manual acceptance testing

## Brave Search API Details

**When Available:**
- Only activated if `BRAVE_API_KEY` environment variable is set
- Silently skips if key not available (agent falls back to built-in search)
- Key storage fallback: `~/.gsd/brave_api_key` file (checked if env var absent)

**Request Format:**
```
GET https://api.search.brave.com/res/v1/web/search
Headers:
  Accept: application/json
  X-Subscription-Token: {BRAVE_API_KEY}
Query Params:
  q: {search_query}
  count: {limit} (default 10)
  country: us
  search_lang: en
  text_decorations: false
  freshness: {day|week|month} (optional)
```

**Response Mapping:**
- GSD extracts: `title`, `url`, `description`, `age` from each result
- Returns array of web search results to agent

---

*Integration audit: 2026-02-10*
