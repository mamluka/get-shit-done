/**
 * Notion Page Hierarchy Builder
 *
 * Builds a parent/child tree structure from .planning/ directory that maps
 * to Notion page hierarchy. PROJECT.md becomes root, priority files are
 * direct children, phase folders become intermediate grouping pages.
 */

const fs = require('fs');
const path = require('path');

/**
 * Build hierarchy tree from planning directory structure.
 * Produces tree where PROJECT.md is root, priority files (ROADMAP, etc.) are
 * direct children, phase folders become intermediate "virtual" pages, and
 * phase .md files are leaves.
 *
 * @param {string} planningDir - Path to .planning/ directory
 * @returns {object} Hierarchy tree structure
 *   - root: { file: '/abs/path/PROJECT.md', title: 'PROJECT', children: [...] }
 *   - children: Array of file nodes or folder nodes
 *     - File node: { file: '/abs/path/FILE.md', title: 'FILE', children: [] }
 *     - Folder node: { folder: '/abs/path/phases/08-name', title: 'Phase 08 - Name', children: [...] }
 */
function buildHierarchy(planningDir) {
  const absPath = path.resolve(planningDir);

  // Root must be PROJECT.md
  const rootFile = path.join(absPath, 'PROJECT.md');
  if (!fs.existsSync(rootFile)) {
    throw new Error(`PROJECT.md not found in ${planningDir}`);
  }

  const root = {
    file: rootFile,
    title: 'PROJECT',
    children: []
  };

  // Priority files at root level (direct children of PROJECT.md)
  const priorityFiles = ['ROADMAP.md', 'REQUIREMENTS.md', 'STATE.md'];
  for (const fileName of priorityFiles) {
    const filePath = path.join(absPath, fileName);
    if (fs.existsSync(filePath)) {
      root.children.push({
        file: filePath,
        title: path.basename(fileName, '.md'),
        children: []
      });
    }
  }

  // Phase folders - become intermediate grouping nodes
  const phasesDir = path.join(absPath, 'phases');
  if (fs.existsSync(phasesDir)) {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });

    // Filter for directories, skip hidden/underscore prefixed
    const phaseFolders = entries
      .filter(entry => entry.isDirectory())
      .filter(entry => !entry.name.startsWith('.') && !entry.name.startsWith('_'))
      .map(entry => entry.name)
      .sort();

    for (const folderName of phaseFolders) {
      const folderPath = path.join(phasesDir, folderName);
      const phaseTitle = formatPhaseTitle(folderName);

      // Get all .md files in phase folder
      const phaseFiles = fs.readdirSync(folderPath, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
        .map(entry => entry.name)
        .sort();

      const phaseNode = {
        folder: folderPath,
        title: phaseTitle,
        children: phaseFiles.map(fileName => ({
          file: path.join(folderPath, fileName),
          title: path.basename(fileName, '.md'),
          children: []
        }))
      };

      root.children.push(phaseNode);
    }
  }

  // Any other .md files in .planning/ root (after phases, alphabetically)
  const rootEntries = fs.readdirSync(absPath, { withFileTypes: true });
  const otherMdFiles = rootEntries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .filter(entry => {
      // Exclude PROJECT.md and priority files already processed
      const name = entry.name;
      return name !== 'PROJECT.md' && !priorityFiles.includes(name);
    })
    .map(entry => entry.name)
    .sort();

  for (const fileName of otherMdFiles) {
    root.children.push({
      file: path.join(absPath, fileName),
      title: path.basename(fileName, '.md'),
      children: []
    });
  }

  return { root };
}

/**
 * Format phase folder name to human-readable title.
 * Transform "08-page-hierarchy-incremental-sync" to "Phase 08 - Page Hierarchy Incremental Sync"
 *
 * @param {string} folderName - Raw folder name (e.g., "08-page-hierarchy-incremental-sync")
 * @returns {string} Formatted title (e.g., "Phase 08 - Page Hierarchy Incremental Sync")
 */
function formatPhaseTitle(folderName) {
  // Extract phase number (first 2 digits)
  const match = folderName.match(/^(\d{2})-(.+)$/);
  if (!match) {
    // Fallback if format doesn't match
    return capitalizeWords(folderName.replace(/-/g, ' '));
  }

  const [, phaseNum, remainder] = match;

  // Convert remainder: replace hyphens with spaces, capitalize first letter of each word
  const words = remainder.split('-').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return `Phase ${phaseNum} - ${words.join(' ')}`;
}

/**
 * Capitalize first letter of each word in a string.
 *
 * @param {string} str - Input string
 * @returns {string} Capitalized string
 */
function capitalizeWords(str) {
  return str.split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

module.exports = {
  buildHierarchy
};
