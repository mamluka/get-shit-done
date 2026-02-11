/**
 * Notion Change Detector Module
 *
 * Provides SHA-256 file hashing and change detection for incremental sync.
 * Compares current file content hashes against stored hashes in sync state
 * to determine whether files need syncing to Notion.
 */

const crypto = require('crypto');
const fs = require('fs');

/**
 * Compute SHA-256 hash of file contents using streaming.
 * Memory-efficient for large files.
 *
 * @param {string} filePath - Path to file to hash
 * @returns {Promise<string>} Hex-encoded SHA-256 hash (64 characters)
 */
function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Determine if a file needs syncing by comparing current hash to stored hash.
 * Checks syncState.projects[projectSlug].doc_pages[filePath] for existing
 * mapping and hash.
 *
 * @param {string} filePath - Path to file to check
 * @param {object} syncState - Sync state object from notion-sync.json
 * @param {string} projectSlug - Project slug identifier
 * @returns {Promise<object>} Sync decision with reason
 *   - { needsSync: true, reason: 'unmapped', hash: string } - No page_id mapping exists
 *   - { needsSync: true, reason: 'no_hash', hash: string } - Mapping exists but no hash (first sync after upgrade)
 *   - { needsSync: true, reason: 'changed', hash: string } - Hash differs from stored
 *   - { needsSync: false, reason: 'unchanged', hash: string } - Hash matches stored
 */
async function needsSync(filePath, syncState, projectSlug) {
  const currentHash = await hashFile(filePath);

  // Check if project exists in sync state
  const project = syncState.projects?.[projectSlug];
  if (!project) {
    return { needsSync: true, reason: 'unmapped', hash: currentHash };
  }

  // Check if file has a doc_pages entry
  const docEntry = project.doc_pages?.[filePath];
  if (!docEntry) {
    return { needsSync: true, reason: 'unmapped', hash: currentHash };
  }

  // doc_pages entries can be either:
  // - Old format: string (just page_id)
  // - New format: object with { page_id, hash, syncedAt }
  let storedHash;
  if (typeof docEntry === 'string') {
    // Old format - no hash stored
    return { needsSync: true, reason: 'no_hash', hash: currentHash };
  } else if (typeof docEntry === 'object') {
    // New format - extract hash
    storedHash = docEntry.hash;
    if (!storedHash) {
      return { needsSync: true, reason: 'no_hash', hash: currentHash };
    }
  } else {
    // Unknown format
    return { needsSync: true, reason: 'unmapped', hash: currentHash };
  }

  // Compare hashes
  if (storedHash !== currentHash) {
    return { needsSync: true, reason: 'changed', hash: currentHash };
  }

  return { needsSync: false, reason: 'unchanged', hash: currentHash };
}

module.exports = {
  hashFile,
  needsSync
};
