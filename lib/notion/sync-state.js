/**
 * Notion Sync State Manager
 *
 * Manages .planning/notion-sync.json for tracking Notion page IDs per project.
 * Schema tracks workspace pages, project root pages, phase pages, and doc-to-page mappings.
 */

const fs = require('fs');
const path = require('path');

/**
 * Resolve the path to notion-sync.json for the active project.
 * For multi-project layouts (.active-project exists), returns
 * .planning/<slug>/notion-sync.json. Otherwise .planning/notion-sync.json.
 *
 * @param {string} cwd - Current working directory (project root)
 * @returns {string} Absolute path to notion-sync.json
 */
function resolveSyncStatePath(cwd) {
  const planningRoot = path.join(cwd, '.planning');
  const activeProjectPath = path.join(planningRoot, '.active-project');

  try {
    if (fs.existsSync(activeProjectPath)) {
      const slug = fs.readFileSync(activeProjectPath, 'utf8').trim();
      if (slug) {
        const nested = path.join(planningRoot, slug);
        if (fs.existsSync(nested)) {
          return path.join(nested, 'notion-sync.json');
        }
      }
    }
  } catch (e) {
    // Fall through to default
  }

  return path.join(planningRoot, 'notion-sync.json');
}

/**
 * Initialize a fresh notion-sync.json with default schema
 *
 * @param {string} cwd - Current working directory (project root)
 * @returns {object} The created state object
 */
function initSyncState(cwd) {
  const syncPath = resolveSyncStatePath(cwd);

  // Don't overwrite if file exists
  if (fs.existsSync(syncPath)) {
    return loadSyncState(cwd);
  }

  const state = {
    version: 1,
    workspace_page_id: null,
    projects: {}
  };

  // Ensure parent directory exists
  const dir = path.dirname(syncPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
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
  const syncPath = resolveSyncStatePath(cwd);

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

  const syncPath = resolveSyncStatePath(cwd);

  // Ensure parent directory exists
  const dir = path.dirname(syncPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
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
  // Ensure image_uploads field exists in project state
  if (!projectState.image_uploads) {
    projectState.image_uploads = {};
  }
  state.projects[projectSlug] = projectState;
  return state;
}

/**
 * Get image upload metadata for a specific file hash.
 *
 * @param {object} state - The sync state object
 * @param {string} projectSlug - Project slug identifier
 * @param {string} hash - SHA-256 hash of the image file
 * @returns {object|null} Image upload object or null if not found
 *   - { file_upload_id, local_path, uploaded_at, size_bytes, mime_type }
 */
function getImageUpload(state, projectSlug, hash) {
  const projectState = getProjectState(state, projectSlug);
  if (!projectState || !projectState.image_uploads) {
    return null;
  }

  return projectState.image_uploads[hash] || null;
}

/**
 * Set image upload metadata for a specific file hash.
 * Creates intermediate objects if needed (projects[slug], image_uploads).
 *
 * @param {object} state - The sync state object
 * @param {string} projectSlug - Project slug identifier
 * @param {string} hash - SHA-256 hash of the image file
 * @param {object} uploadInfo - Upload metadata
 *   - { file_upload_id, local_path, uploaded_at, size_bytes, mime_type }
 * @returns {object} The modified state
 */
function setImageUpload(state, projectSlug, hash, uploadInfo) {
  if (!state.projects) {
    state.projects = {};
  }

  if (!state.projects[projectSlug]) {
    state.projects[projectSlug] = {
      root_page_id: null,
      phase_pages: {},
      doc_pages: {},
      image_uploads: {}
    };
  }

  if (!state.projects[projectSlug].image_uploads) {
    state.projects[projectSlug].image_uploads = {};
  }

  state.projects[projectSlug].image_uploads[hash] = uploadInfo;
  return state;
}

/**
 * Get Notion page ID for a specific file.
 * Handles both legacy string format and new object format.
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

  const value = projectState.doc_pages[filePath];
  if (!value) {
    return null;
  }

  // Handle legacy string format
  if (typeof value === 'string') {
    return value;
  }

  // Handle new object format
  if (typeof value === 'object' && value.page_id) {
    return value.page_id;
  }

  return null;
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
      doc_pages: {},
      image_uploads: {}
    };
  }

  if (!state.projects[projectSlug].doc_pages) {
    state.projects[projectSlug].doc_pages = {};
  }

  state.projects[projectSlug].doc_pages[filePath] = pageId;
  return state;
}

/**
 * Get full page mapping object for a specific file.
 * Returns object with page_id, hash, and syncedAt.
 * Handles both legacy string format and new object format.
 *
 * @param {object} state - The sync state object
 * @param {string} projectSlug - Project slug identifier
 * @param {string} filePath - Relative file path
 * @returns {object|null} Mapping object { page_id, hash, syncedAt } or null if not found
 */
function getPageMapping(state, projectSlug, filePath) {
  const projectState = getProjectState(state, projectSlug);
  if (!projectState || !projectState.doc_pages) {
    return null;
  }

  const value = projectState.doc_pages[filePath];
  if (!value) {
    return null;
  }

  // Handle legacy string format (just page_id)
  if (typeof value === 'string') {
    return {
      page_id: value,
      hash: null,
      syncedAt: null
    };
  }

  // Handle new object format
  if (typeof value === 'object') {
    return {
      page_id: value.page_id || null,
      hash: value.hash || null,
      syncedAt: value.syncedAt || null
    };
  }

  return null;
}

/**
 * Set full page mapping object for a specific file.
 * Creates intermediate objects if needed (projects[slug], doc_pages).
 *
 * @param {object} state - The sync state object
 * @param {string} projectSlug - Project slug identifier
 * @param {string} filePath - Relative file path
 * @param {object} mapping - Mapping object { page_id, hash, syncedAt }
 * @returns {object} The modified state
 */
function setPageMapping(state, projectSlug, filePath, mapping) {
  if (!state.projects) {
    state.projects = {};
  }

  if (!state.projects[projectSlug]) {
    state.projects[projectSlug] = {
      root_page_id: null,
      phase_pages: {},
      doc_pages: {},
      image_uploads: {}
    };
  }

  if (!state.projects[projectSlug].doc_pages) {
    state.projects[projectSlug].doc_pages = {};
  }

  state.projects[projectSlug].doc_pages[filePath] = {
    page_id: mapping.page_id,
    hash: mapping.hash,
    syncedAt: mapping.syncedAt
  };

  return state;
}

module.exports = {
  initSyncState,
  loadSyncState,
  saveSyncState,
  getProjectState,
  setProjectState,
  getPageId,
  setPageId,
  getPageMapping,
  setPageMapping,
  getImageUpload,
  setImageUpload
};
