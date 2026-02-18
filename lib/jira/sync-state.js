/**
 * Jira Sync State Manager
 *
 * Manages the jira-sync.json state file for tracking synced Jira tickets.
 * Provides read, write, and diff operations to enable incremental sync
 * where re-runs update existing tickets instead of creating duplicates.
 */

const fs = require('fs');
const path = require('path');

/**
 * Resolve the path to a planning file for the active project.
 * For multi-project layouts (.active-project exists), returns
 * .planning/<slug>/<filename>. Otherwise .planning/<filename>.
 *
 * @param {string} cwd - Current working directory (project root)
 * @param {string} filename - Name of the planning file (e.g., 'jira-sync.json')
 * @returns {string} Absolute path to the planning file
 */
function resolvePlanningPath(cwd, filename) {
  const planningRoot = path.join(cwd, '.planning');
  const activeProjectPath = path.join(planningRoot, '.active-project');

  try {
    if (fs.existsSync(activeProjectPath)) {
      const slug = fs.readFileSync(activeProjectPath, 'utf8').trim();
      if (slug) {
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
 * Load the jira-sync.json state file.
 * Returns the parsed state object, null if file doesn't exist, or an error object.
 *
 * Expected state schema:
 * {
 *   milestone: string,
 *   granularity: string,
 *   project_key: string,
 *   cloud_id: string,
 *   epic: { key: string, summary: string, assignee?: { accountId, displayName } },
 *   tickets: [{ key: string, summary: string, phase?: string, category?: string, requirement_id?: string, assignee?: {...} }],
 *   synced_at: ISO string,
 *   failed_count: number
 * }
 *
 * @param {string} cwd - Current working directory (project root)
 * @returns {object|null} Parsed state object, null if file doesn't exist, or { error: '...' } on failure
 */
function loadSyncState(cwd) {
  const syncPath = resolvePlanningPath(cwd, 'jira-sync.json');

  // If file doesn't exist, this is a first run
  if (!fs.existsSync(syncPath)) {
    return null;
  }

  // Try to read and parse the file
  try {
    const content = fs.readFileSync(syncPath, 'utf8');
    const state = JSON.parse(content);
    return state;
  } catch (e) {
    return { error: `Failed to read or parse jira-sync.json: ${e.message}` };
  }
}

/**
 * Save sync state to jira-sync.json.
 *
 * @param {string} cwd - Current working directory (project root)
 * @param {object} syncData - State object to save
 * @returns {object} { success: true } or { error: '...' } on failure
 */
function saveSyncState(cwd, syncData) {
  const syncPath = resolvePlanningPath(cwd, 'jira-sync.json');

  try {
    const content = JSON.stringify(syncData, null, 2) + '\n';
    fs.writeFileSync(syncPath, content, 'utf8');
    return { success: true };
  } catch (e) {
    return { error: `Failed to write jira-sync.json: ${e.message}` };
  }
}

/**
 * Diff current tickets against existing sync state to determine creates vs updates.
 *
 * Matching logic depends on granularity:
 * - phase: match on phase_number
 * - category: match on category
 * - requirement: match on requirement_id
 *
 * @param {object|null} existingState - Loaded state from loadSyncState (or null for first run)
 * @param {array} currentTickets - Ticket array from ticket-mapper's mapTickets().tickets
 * @param {string} granularity - Granularity level: 'phase', 'category', or 'requirement'
 * @returns {object} { toCreate: [], toUpdate: [], unchanged: [], epicExists: boolean, existingEpicKey: string|null }
 */
function diffTickets(existingState, currentTickets, granularity) {
  const result = {
    toCreate: [],
    toUpdate: [],
    unchanged: [],
    epicExists: false,
    existingEpicKey: null
  };

  // If no existing state, all tickets go to toCreate
  if (!existingState || existingState.error) {
    result.toCreate = currentTickets.slice();
    return result;
  }

  // Epic exists if we have existing state
  result.epicExists = true;
  result.existingEpicKey = existingState.epic ? existingState.epic.key : null;

  // Build a lookup map of existing tickets based on granularity
  const existingMap = {};
  if (existingState.tickets) {
    for (const ticket of existingState.tickets) {
      let matchKey;
      if (granularity === 'phase') {
        matchKey = ticket.phase;
      } else if (granularity === 'category') {
        matchKey = ticket.category;
      } else if (granularity === 'requirement') {
        matchKey = ticket.requirement_id;
      }

      if (matchKey) {
        existingMap[matchKey] = ticket;
      }
    }
  }

  // For each current ticket, determine if it's a create or update
  for (const currentTicket of currentTickets) {
    let matchKey;
    if (granularity === 'phase') {
      matchKey = currentTicket.phase_number;
    } else if (granularity === 'category') {
      matchKey = currentTicket.category;
    } else if (granularity === 'requirement') {
      matchKey = currentTicket.requirement_id;
    }

    const existingTicket = existingMap[matchKey];

    if (existingTicket) {
      // Matched ticket - this is an update
      // Attach the existing Jira key so caller can use editJiraIssue
      result.toUpdate.push({
        ...currentTicket,
        jira_key: existingTicket.key
      });
    } else {
      // No match - this is a new ticket
      result.toCreate.push(currentTicket);
    }
  }

  // Note: unchanged is always empty for v1 - we treat all matches as updates
  // since content comparison is complex and updates are idempotent anyway

  return result;
}

module.exports = {
  loadSyncState,
  saveSyncState,
  diffTickets
};
