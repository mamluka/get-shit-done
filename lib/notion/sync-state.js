/**
 * Notion Sync State Manager
 *
 * Manages .planning/notion-sync.json for tracking Notion page IDs per project.
 * Schema tracks workspace pages, project root pages, phase pages, and doc-to-page mappings.
 */

const fs = require('fs');
const path = require('path');

/**
 * Initialize a fresh notion-sync.json with default schema
 *
 * @param {string} cwd - Current working directory (project root)
 * @returns {object} The created state object
 */
function initSyncState(cwd) {
  const syncPath = path.join(cwd, '.planning', 'notion-sync.json');

  // Don't overwrite if file exists
  if (fs.existsSync(syncPath)) {
    return loadSyncState(cwd);
  }

  const state = {
    version: 1,
    workspace_page_id: null,
    projects: {}
  };

  // Ensure .planning directory exists
  const planningDir = path.join(cwd, '.planning');
  if (!fs.existsSync(planningDir)) {
    fs.mkdirSync(planningDir, { recursive: true });
  }

  fs.writeFileSync(syncPath, JSON.stringify(state, null, 2));
  return state;
}

/**
 * Load notion-sync.json from disk
 *
 * @param {string} cwd - Current working directory (project root)
 * @returns {object} The sync state object
 */
function loadSyncState(cwd) {
  const syncPath = path.join(cwd, '.planning', 'notion-sync.json');

  // Initialize if doesn't exist
  if (!fs.existsSync(syncPath)) {
    return initSyncState(cwd);
  }

  try {
    const content = fs.readFileSync(syncPath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`Failed to parse notion-sync.json: ${e.message}`);
  }
}

/**
 * Save state to notion-sync.json with schema validation
 *
 * @param {string} cwd - Current working directory (project root)
 * @param {object} state - The state object to save
 */
function saveSyncState(cwd, state) {
  // Validate top-level schema
  if (typeof state !== 'object' || state === null) {
    throw new Error('State must be an object');
  }
  if (!('version' in state) || !('workspace_page_id' in state) || !('projects' in state)) {
    throw new Error('State missing required keys: version, workspace_page_id, projects');
  }

  const syncPath = path.join(cwd, '.planning', 'notion-sync.json');

  // Ensure .planning directory exists
  const planningDir = path.join(cwd, '.planning');
  if (!fs.existsSync(planningDir)) {
    fs.mkdirSync(planningDir, { recursive: true });
  }

  fs.writeFileSync(syncPath, JSON.stringify(state, null, 2));
}

/**
 * Get project state entry from sync state
 *
 * @param {object} state - The sync state object
 * @param {string} projectSlug - Project slug identifier
 * @returns {object|null} The project state or null if not found
 */
function getProjectState(state, projectSlug) {
  if (!state.projects || !state.projects[projectSlug]) {
    return null;
  }
  return state.projects[projectSlug];
}

/**
 * Set project state entry in sync state
 *
 * @param {object} state - The sync state object
 * @param {string} projectSlug - Project slug identifier
 * @param {object} projectState - The project state to set
 * @returns {object} The modified state
 */
function setProjectState(state, projectSlug, projectState) {
  if (!state.projects) {
    state.projects = {};
  }
  state.projects[projectSlug] = projectState;
  return state;
}

/**
 * Get Notion page ID for a specific file
 *
 * @param {object} state - The sync state object
 * @param {string} projectSlug - Project slug identifier
 * @param {string} filePath - Relative file path (e.g., ".planning/phases/06-foundation-sdk-setup/06-RESEARCH.md")
 * @returns {string|null} The Notion page ID or null if not found
 */
function getPageId(state, projectSlug, filePath) {
  const projectState = getProjectState(state, projectSlug);
  if (!projectState || !projectState.doc_pages) {
    return null;
  }
  return projectState.doc_pages[filePath] || null;
}

/**
 * Set Notion page ID for a specific file
 * Creates intermediate objects if needed (projects[slug], doc_pages)
 *
 * @param {object} state - The sync state object
 * @param {string} projectSlug - Project slug identifier
 * @param {string} filePath - Relative file path
 * @param {string} pageId - The Notion page ID
 * @returns {object} The modified state
 */
function setPageId(state, projectSlug, filePath, pageId) {
  if (!state.projects) {
    state.projects = {};
  }

  if (!state.projects[projectSlug]) {
    state.projects[projectSlug] = {
      root_page_id: null,
      phase_pages: {},
      doc_pages: {}
    };
  }

  if (!state.projects[projectSlug].doc_pages) {
    state.projects[projectSlug].doc_pages = {};
  }

  state.projects[projectSlug].doc_pages[filePath] = pageId;
  return state;
}

module.exports = {
  initSyncState,
  loadSyncState,
  saveSyncState,
  getProjectState,
  setProjectState,
  getPageId,
  setPageId
};
