/**
 * Jira Issue Creator
 *
 * Orchestrates epic and ticket creation for Jira sync.
 * Builds previews and prepares creation instructions for MCP tool calls.
 */

const fs = require('fs');
const path = require('path');

/**
 * Resolve the path to a planning file for the active project.
 * For multi-project layouts (.active-project exists), returns
 * .planning-pm/<slug>/v{N}/<filename>. Otherwise .planning-pm/<filename>.
 *
 * @param {string} cwd - Current working directory (project root)
 * @param {string} filename - Name of the planning file (e.g., 'config.json')
 * @returns {string} Absolute path to the planning file
 */
function resolvePlanningPath(cwd, filename) {
  const planningRoot = path.join(cwd, '.planning-pm');
  const activeProjectPath = path.join(planningRoot, '.active-project');

  try {
    if (fs.existsSync(activeProjectPath)) {
      const slug = fs.readFileSync(activeProjectPath, 'utf8').trim();
      if (slug) {
        // Try to resolve version from STATE.md
        const statePath = path.join(planningRoot, 'STATE.md');
        let version = null;
        if (fs.existsSync(statePath)) {
          const stateContent = fs.readFileSync(statePath, 'utf8');
          const versionMatch = stateContent.match(/current_version:\s*(.+)/);
          if (versionMatch) {
            version = versionMatch[1].trim();
          }
        }

        if (version) {
          // Versioned project folder: .planning-pm/{slug}/{version}/
          const versionedDir = path.join(planningRoot, slug, version);
          if (fs.existsSync(versionedDir)) {
            return path.join(versionedDir, filename);
          }
        }

        // Fall back to project root: .planning-pm/{slug}/
        const nested = path.join(planningRoot, slug);
        if (fs.existsSync(nested)) {
          return path.join(nested, filename);
        }
      }
    }
  } catch (e) {
    // Fall through to default
  }

  return path.join(planningRoot, filename);
}

/**
 * Load notion-sync.json and extract Notion page IDs.
 * Gracefully handles missing file or multi-project layouts.
 *
 * @param {string} cwd - Current working directory (project root)
 * @returns {object} Map of file paths to Notion page IDs
 */
function loadNotionLinks(cwd) {
  const planningRoot = path.join(cwd, '.planning-pm');
  const activeProjectPath = path.join(planningRoot, '.active-project');
  let syncPath;

  try {
    if (fs.existsSync(activeProjectPath)) {
      const slug = fs.readFileSync(activeProjectPath, 'utf8').trim();
      if (slug && fs.existsSync(path.join(planningRoot, slug))) {
        syncPath = path.join(planningRoot, slug, 'notion-sync.json');
      }
    }
  } catch (e) {
    // Fall through to default
  }

  if (!syncPath) {
    syncPath = path.join(planningRoot, 'notion-sync.json');
  }

  if (!fs.existsSync(syncPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(syncPath, 'utf8');
    const state = JSON.parse(content);
    const notionLinks = {};

    // Extract doc_pages from all projects
    if (state.projects) {
      for (const projectSlug in state.projects) {
        const project = state.projects[projectSlug];
        if (project.doc_pages) {
          for (const filePath in project.doc_pages) {
            const value = project.doc_pages[filePath];
            // Handle both string and object formats
            const pageId = typeof value === 'string' ? value : (value.page_id || null);
            if (pageId) {
              notionLinks[filePath] = pageId;
            }
          }
        }
      }
    }

    return notionLinks;
  } catch (e) {
    return {};
  }
}

/**
 * Build a Notion URL from a page ID.
 * Converts page ID to URL format by removing dashes.
 *
 * @param {string|null} pageId - Notion page ID (with or without dashes)
 * @returns {string|null} Notion URL or null if no page ID
 */
function buildNotionUrl(pageId) {
  if (!pageId) {
    return null;
  }
  return `https://www.notion.so/${pageId.replace(/-/g, '')}`;
}

/**
 * Build a preview of what will be created in Jira.
 * Calls ticket-mapper to get ticket data, loads config and Notion links,
 * then builds a structured preview object.
 *
 * @param {string} cwd - Current working directory (project root)
 * @param {string} granularity - Granularity level: 'phase', 'category', or 'requirement'
 * @returns {object} Preview object with epic and tickets, or { error: '...' } on failure
 */
function buildPreview(cwd, granularity) {
  // Call ticket-mapper to get ticket data
  const ticketMapper = require('./ticket-mapper.js');
  const result = ticketMapper.mapTickets(cwd, granularity);

  // Propagate error if ticket-mapper failed
  if (result.error) {
    return { error: result.error };
  }

  // Load config to get project key
  const configPath = resolvePlanningPath(cwd, 'config.json');
  let projectKey = 'PROJ';

  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.jira && config.jira.project_key) {
        projectKey = config.jira.project_key;
      }
    }
  } catch (e) {
    // Use default project key
  }

  // Build epic
  const epic = {
    summary: `${result.milestone} — ${projectKey}`,
    description: `Epic for ${result.milestone} milestone. Contains ${result.ticket_count} tickets at ${granularity}-level granularity.`,
    issue_type: 'Epic'
  };

  // Build ticket previews with Notion links
  const tickets = result.tickets.map(t => {
    const notionLink = buildNotionUrl(t.notion_page_id);
    return {
      summary: t.title,
      description: t.description,
      issue_type: 'Task',
      notion_link: notionLink,
      parent: '[epic key — assigned after creation]'
    };
  });

  return {
    epic: epic,
    tickets: tickets,
    milestone: result.milestone,
    granularity: result.granularity,
    ticket_count: result.ticket_count
  };
}

/**
 * Format a preview object into a human-readable terminal display.
 *
 * @param {object} preview - Preview object from buildPreview
 * @returns {string} Formatted preview string
 */
function formatPreviewDisplay(preview) {
  const lines = [];

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(' JIRA SYNC PREVIEW');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(`Milestone: ${preview.milestone}`);
  lines.push(`Granularity: ${preview.granularity}-level`);
  lines.push(`Total: 1 epic + ${preview.ticket_count} tickets`);
  lines.push('');
  lines.push('EPIC');
  lines.push(`  ${preview.epic.summary}`);
  lines.push(`  ${preview.epic.description}`);
  lines.push('');
  lines.push('TICKETS');

  for (let i = 0; i < preview.tickets.length; i++) {
    const ticket = preview.tickets[i];
    const num = i + 1;

    // Truncate description to first 120 chars
    let desc = ticket.description.replace(/\n/g, ' ');
    if (desc.length > 120) {
      desc = desc.substring(0, 120) + '...';
    }

    lines.push(`  [${num}] ${ticket.summary}`);
    lines.push(`      ${desc}`);
    lines.push(`      Notion: ${ticket.notion_link || '—'}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Prepare creation instructions for epic and tickets.
 * This function does NOT call MCP directly - it returns structured instructions
 * that the workflow will use to make MCP tool calls.
 *
 * Note: In practice, the workflow (step 7) calls MCP tools directly rather than
 * using this function. This is provided as a utility for potential future use.
 *
 * @param {string} cloudId - Jira cloud ID
 * @param {string} projectKey - Jira project key
 * @param {object} preview - Preview object from buildPreview (contains epic and tickets)
 * @returns {object} { instructions: [...] } array of MCP call instructions
 */
function createEpicAndTickets(cloudId, projectKey, preview) {
  const instructions = [];

  // Epic creation instruction
  instructions.push({
    step: 'create_epic',
    tool: 'mcp__jira__createJiraIssue',
    params: {
      cloudId: cloudId,
      projectKey: projectKey,
      issueTypeName: 'Epic',
      summary: preview.epic.summary,
      description: preview.epic.description
    }
  });

  // Ticket creation instructions
  for (let i = 0; i < preview.tickets.length; i++) {
    const ticket = preview.tickets[i];

    // Embed Notion link in description if available
    let description = ticket.description;
    if (ticket.notion_link) {
      description = `**📎 Notion Page:** [View in Notion](${ticket.notion_link})\n\n${description}`;
    }

    instructions.push({
      step: 'create_ticket',
      index: i,
      tool: 'mcp__jira__createJiraIssue',
      params: {
        cloudId: cloudId,
        projectKey: projectKey,
        issueTypeName: 'Task',
        summary: ticket.summary,
        description: description,
        parent: null  // Will be set to epic key after epic creation
      }
    });
  }

  return {
    instructions: instructions
  };
}

module.exports = {
  buildPreview,
  formatPreviewDisplay,
  createEpicAndTickets
};
