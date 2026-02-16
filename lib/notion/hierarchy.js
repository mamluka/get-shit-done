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

  // Extract project name from first H1 heading in PROJECT.md
  const projectContent = fs.readFileSync(rootFile, 'utf8');
  const h1Match = projectContent.match(/^#\s+(.+)$/m);
  const projectName = h1Match ? h1Match[1].trim() : 'PROJECT';

  const root = {
    file: rootFile,
    title: projectName,
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

  // Scan subdirectories and loose .md files, adding them as children
  scanDirectoryChildren(absPath, root.children, ['PROJECT.md', ...priorityFiles]);

  return { root };
}

/**
 * Recursively scan a directory and append children (folder nodes + file nodes).
 * - `phases/` dirs get special treatment (each subfolder is a phase grouping page)
 * - Other dirs become grouping pages; their own subdirs are scanned recursively
 * - .md files become file nodes
 *
 * @param {string} dirPath - Absolute path to directory to scan
 * @param {Array} children - Array to push child nodes into
 * @param {string[]} excludeFiles - Filenames to skip (e.g., ['PROJECT.md', 'ROADMAP.md'])
 */
function scanDirectoryChildren(dirPath, children, excludeFiles = []) {
  const skipDirs = new Set(['codebase']);
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  // 1. Process subdirectories first
  const subdirs = entries
    .filter(entry => entry.isDirectory())
    .filter(entry => !entry.name.startsWith('.') && !entry.name.startsWith('_'))
    .filter(entry => !skipDirs.has(entry.name))
    .map(entry => entry.name)
    .sort();

  for (const name of subdirs) {
    const subPath = path.join(dirPath, name);

    if (name === 'phases') {
      // Phase folders have numbered subdirectories (e.g., phases/01-foundation/)
      const phaseEntries = fs.readdirSync(subPath, { withFileTypes: true });
      const phaseFolders = phaseEntries
        .filter(entry => entry.isDirectory())
        .filter(entry => !entry.name.startsWith('.') && !entry.name.startsWith('_'))
        .map(entry => entry.name)
        .sort();

      for (const folderName of phaseFolders) {
        const folderPath = path.join(subPath, folderName);
        const phaseTitle = formatPhaseTitle(folderName);

        const phaseFiles = fs.readdirSync(folderPath, { withFileTypes: true })
          .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
          .map(entry => entry.name)
          .sort();

        children.push({
          folder: folderPath,
          title: phaseTitle,
          children: phaseFiles.map(fileName => ({
            file: path.join(folderPath, fileName),
            title: path.basename(fileName, '.md'),
            children: []
          }))
        });
      }
    } else {
      // Generic subdirectory - create folder node and recurse
      const folderNode = {
        folder: subPath,
        title: capitalizeWords(name.replace(/-/g, ' ')),
        children: []
      };

      // Recurse into this directory (no files to exclude inside subdirs)
      scanDirectoryChildren(subPath, folderNode.children, []);

      // Only add folder node if it has any content
      if (folderNode.children.length > 0) {
        children.push(folderNode);
      }
    }
  }

  // 2. Process .md files (after subdirs)
  const mdFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .filter(entry => !excludeFiles.includes(entry.name))
    .map(entry => entry.name)
    .sort();

  for (const fileName of mdFiles) {
    children.push({
      file: path.join(dirPath, fileName),
      title: path.basename(fileName, '.md'),
      children: []
    });
  }
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
