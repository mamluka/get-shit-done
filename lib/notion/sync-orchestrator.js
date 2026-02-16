/**
 * Notion Sync Orchestrator Module
 *
 * Coordinates the full sync pipeline: hierarchy building, change detection,
 * page creation/updates, and state persistence. Implements breadth-first
 * processing (parents before children) with atomic per-file state persistence
 * for resume-on-error.
 */

const fs = require('fs');
const path = require('path');
const { buildHierarchy } = require('./hierarchy.js');
const { needsSync } = require('./change-detector.js');
const { createPage, updatePage, validatePageExists } = require('./page-manager.js');
const { convertFile } = require('./converter.js');
const { loadSyncState, saveSyncState, getPageMapping, setPageMapping, setProjectState, getImageUpload, setImageUpload } = require('./sync-state.js');
const { extractLocalImages, validateImageFile, hashFile } = require('./image-uploader.js');

/**
 * Sync all .planning/ markdown files to Notion pages.
 * Processes files in breadth-first order (parents before children),
 * creates/updates pages as needed, persists state atomically after each file.
 *
 * @param {Client} notion - Notion SDK client instance (can be null for dry-run)
 * @param {object} options - Sync options
 * @param {string} options.cwd - Working directory (project root)
 * @param {string} options.projectSlug - Project slug for sync-state tracking (default: 'default')
 * @param {string} options.parentPageId - Notion parent page ID (workspace-level page)
 * @param {function} options.onProgress - Callback: (event) => void
 *   - event: { file, status, index, total, pageId?, error? }
 *   - status: 'creating' | 'updating' | 'skipped' | 'error'
 * @param {boolean} options.dryRun - If true, preview without Notion API calls (default: false)
 * @returns {Promise<object>} Sync results
 *   - { total, created, updated, skipped, errors, errorDetails: [{ file, error }] }
 */
async function syncProject(notion, options = {}) {
  const {
    cwd = process.cwd(),
    projectSlug = 'default',
    parentPageId,
    onProgress = null,
    dryRun = false
  } = options;

  if (!parentPageId) {
    throw new Error('parentPageId is required');
  }

  // Track results
  const results = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
    imagesUploaded: 0,
    imagesCached: 0,
    imagesFailed: 0,
    imageDetails: []
  };

  // Step 1: Load sync state
  const syncState = loadSyncState(cwd);

  // Initialize project in sync state if needed
  if (!syncState.projects[projectSlug]) {
    setProjectState(syncState, projectSlug, {
      root_page_id: null,
      phase_pages: {},
      doc_pages: {}
    });
  }

  // Step 2: Build hierarchy (resolve multi-project layout)
  const planningDir = resolvePlanningDir(cwd);
  const hierarchy = buildHierarchy(planningDir);

  // Step 3: Flatten to ordered list (breadth-first: parents before children)
  const orderedItems = flattenHierarchy(hierarchy, cwd);

  results.total = orderedItems.length;

  // Step 4: Process each item
  for (let i = 0; i < orderedItems.length; i++) {
    const item = orderedItems[i];
    const itemPath = item.file || item.folder;
    const relPath = path.relative(cwd, itemPath);

    try {
      // Determine parent page ID for this item
      const itemParentPageId = getItemParentPageId(item, syncState, projectSlug, parentPageId);

      if (!itemParentPageId) {
        throw new Error(`Could not determine parent page ID for ${relPath}`);
      }

      // Handle phase folder virtual pages
      if (item.type === 'phase_folder') {
        const result = await syncPhaseFolder(
          notion,
          item,
          itemParentPageId,
          syncState,
          projectSlug,
          dryRun
        );

        if (result.skipped) {
          results.skipped++;
          if (onProgress) {
            onProgress({
              file: relPath,
              status: 'skipped',
              index: i + 1,
              total: results.total
            });
          }
        } else {
          results.created++;
          if (onProgress) {
            onProgress({
              file: relPath,
              status: 'creating',
              index: i + 1,
              total: results.total,
              pageId: result.pageId
            });
          }
        }

        continue;
      }

      // Handle markdown files
      if (item.type === 'file') {
        const filePath = item.file;

        // Check if file needs syncing
        const syncCheck = await needsSync(filePath, syncState, projectSlug);

        if (!syncCheck.needsSync) {
          results.skipped++;
          if (onProgress) {
            onProgress({
              file: relPath,
              status: 'skipped',
              index: i + 1,
              total: results.total
            });
          }
          continue;
        }

        // File needs syncing - process local images first
        const markdown = fs.readFileSync(filePath, 'utf8');
        const localImages = extractLocalImages(markdown, filePath);
        const imageUploadMap = new Map();

        // Process each local image (upload just-in-time)
        for (const image of localImages) {
          // Validate image file
          const validation = validateImageFile(image.absolutePath);
          if (!validation.valid) {
            // Log warning and skip
            const warning = `Image validation failed for ${image.relativePath}: ${validation.reason}`;
            if (!dryRun) {
              console.warn(`[Warning] ${warning}`);
            }
            results.imagesFailed++;
            results.imageDetails.push({
              file: image.relativePath,
              size: 0,
              status: 'failed',
              reason: validation.reason
            });
            continue;
          }

          // Hash file for deduplication
          const hash = await hashFile(image.absolutePath);

          // Check for existing upload
          const existingUpload = getImageUpload(syncState, projectSlug, hash);

          if (existingUpload) {
            // Reuse existing upload
            imageUploadMap.set(image.original, existingUpload.file_upload_id);
            results.imagesCached++;
            results.imageDetails.push({
              file: image.relativePath,
              size: existingUpload.size_bytes,
              status: 'cached'
            });
          } else if (!dryRun) {
            // Upload new image
            try {
              const mime = require('mime-types');
              const filename = path.basename(image.absolutePath);
              const contentType = mime.lookup(image.absolutePath) || 'application/octet-stream';
              const fileBuffer = fs.readFileSync(image.absolutePath);
              const fileSize = fs.statSync(image.absolutePath).size;

              // Call Notion File Upload API
              const uploadResponse = await notion.files.createUpload({
                filename,
                content_type: contentType,
                file_contents: fileBuffer
              });

              const fileUploadId = uploadResponse.file_upload.id;

              // Store in sync state
              setImageUpload(syncState, projectSlug, hash, {
                file_upload_id: fileUploadId,
                local_path: image.absolutePath,
                uploaded_at: new Date().toISOString(),
                size_bytes: fileSize,
                mime_type: contentType
              });

              // Save state immediately (atomic per-upload persistence)
              saveSyncState(cwd, syncState);

              imageUploadMap.set(image.original, fileUploadId);
              results.imagesUploaded++;
              results.imageDetails.push({
                file: image.relativePath,
                size: fileSize,
                status: 'uploaded'
              });
            } catch (uploadError) {
              // Image upload failed - log warning and continue
              const warning = `Image upload failed for ${image.relativePath}: ${uploadError.message}`;
              console.warn(`[Warning] ${warning}`);
              results.imagesFailed++;
              results.imageDetails.push({
                file: image.relativePath,
                size: 0,
                status: 'failed',
                reason: uploadError.message
              });
            }
          } else {
            // Dry-run mode
            const fileSize = fs.statSync(image.absolutePath).size;
            results.imagesUploaded++;
            results.imageDetails.push({
              file: image.relativePath,
              size: fileSize,
              status: 'would_upload'
            });
            // Set placeholder for dry-run
            imageUploadMap.set(image.original, 'dry-run-upload-id');
          }
        }

        // File needs syncing - convert to blocks with image map
        const conversion = convertFile(filePath, { imageUploadMap });
        const blocks = conversion.blocks; // Flat array of blocks

        // Check if page exists in sync state
        const mapping = getPageMapping(syncState, projectSlug, relPath);
        let pageId = mapping?.page_id || null;
        let isUpdate = false;

        if (pageId) {
          // Validate page still exists
          if (!dryRun) {
            const validation = await validatePageExists(notion, pageId);
            if (!validation.exists) {
              // Stale page ID - remove mapping and create new page
              delete syncState.projects[projectSlug].doc_pages[relPath];
              pageId = null;
            } else {
              isUpdate = true;
            }
          } else {
            // In dry-run, assume page still exists if mapped
            isUpdate = true;
          }
        }

        if (dryRun) {
          // Dry-run: count what would happen
          if (isUpdate) {
            results.updated++;
            if (onProgress) {
              onProgress({
                file: relPath,
                status: 'updating',
                index: i + 1,
                total: results.total
              });
            }
          } else {
            results.created++;
            if (onProgress) {
              onProgress({
                file: relPath,
                status: 'creating',
                index: i + 1,
                total: results.total
              });
            }

            // In dry-run, simulate state updates for root page so children can continue
            if (item.isRoot) {
              syncState.projects[projectSlug].root_page_id = 'dry-run-root-page-id';
            }
          }
        } else {
          // Real sync: create or update page
          if (isUpdate) {
            try {
              pageId = await updatePage(notion, {
                pageId,
                title: item.title,
                blocks
              });

              results.updated++;
              if (onProgress) {
                onProgress({
                  file: relPath,
                  status: 'updating',
                  index: i + 1,
                  total: results.total,
                  pageId
                });
              }
            } catch (updateError) {
              // Page or ancestor archived — drop stale mapping and create fresh
              if (updateError.message && updateError.message.includes('archived ancestor')) {
                delete syncState.projects[projectSlug].doc_pages[relPath];
                isUpdate = false;
                pageId = null;
              } else {
                throw updateError;
              }
            }
          }

          if (!isUpdate) {
            pageId = await createPage(notion, {
              parentPageId: itemParentPageId,
              title: item.title,
              blocks
            });

            results.created++;
            if (onProgress) {
              onProgress({
                file: relPath,
                status: 'creating',
                index: i + 1,
                total: results.total,
                pageId
              });
            }
          }

          // Update sync state with new mapping (atomic per-file persistence)
          setPageMapping(syncState, projectSlug, relPath, {
            page_id: pageId,
            hash: syncCheck.hash,
            syncedAt: new Date().toISOString()
          });

          // Special handling for root page (PROJECT.md)
          if (item.isRoot) {
            syncState.projects[projectSlug].root_page_id = pageId;
          }

          saveSyncState(cwd, syncState);
        }
      }

    } catch (error) {
      // Log error and continue to next file
      results.errors++;
      results.errorDetails.push({
        file: relPath,
        error: error.message
      });

      if (onProgress) {
        onProgress({
          file: relPath,
          status: 'error',
          index: i + 1,
          total: results.total,
          error: error.message
        });
      }
    }
  }

  return results;
}

/**
 * Flatten hierarchy tree to ordered list (breadth-first).
 * Parents come before children.
 *
 * @param {object} hierarchy - Hierarchy tree from buildHierarchy
 * @param {string} cwd - Working directory for relative path calculation
 * @returns {Array} - Ordered array of items to sync
 *   - Item: { type: 'file'|'phase_folder', file?, folder?, title, isRoot?, parentKey? }
 */
function flattenHierarchy(hierarchy, cwd) {
  const items = [];
  const { root } = hierarchy;
  const planningDir = path.dirname(root.file);

  // Root file first
  items.push({
    type: 'file',
    file: root.file,
    title: root.title,
    isRoot: true,
    parentKey: 'workspace' // Parent is workspace page
  });

  // Recursively flatten children (breadth-first per level)
  flattenChildren(root.children, 'root', items, planningDir);

  return items;
}

/**
 * Recursively flatten child nodes breadth-first.
 * Folder nodes become phase_folder items; their children are processed next.
 *
 * @param {Array} children - Child nodes to flatten
 * @param {string} parentKey - Parent key for these children
 * @param {Array} items - Output array to push items into
 * @param {string} planningDir - Planning directory root for generating unique folder keys
 */
function flattenChildren(children, parentKey, items, planningDir) {
  for (const child of children) {
    if (child.file) {
      items.push({
        type: 'file',
        file: child.file,
        title: child.title,
        parentKey
      });
    } else if (child.folder) {
      // Use relative path from planning dir as unique key (handles nested folders)
      const folderName = path.relative(planningDir, child.folder);
      items.push({
        type: 'phase_folder',
        folder: child.folder,
        title: child.title,
        folderName,
        parentKey
      });

      // Recurse into folder's children
      flattenChildren(child.children, `phase:${folderName}`, items, planningDir);
    }
  }
}

/**
 * Get parent page ID for an item based on its parentKey.
 *
 * @param {object} item - Item from flattenHierarchy
 * @param {object} syncState - Sync state
 * @param {string} projectSlug - Project slug
 * @param {string} workspacePageId - Workspace parent page ID
 * @returns {string|null} Parent page ID
 */
function getItemParentPageId(item, syncState, projectSlug, workspacePageId) {
  const { parentKey } = item;

  if (parentKey === 'workspace') {
    return workspacePageId;
  }

  if (parentKey === 'root') {
    return syncState.projects[projectSlug]?.root_page_id || null;
  }

  if (parentKey.startsWith('phase:')) {
    const folderName = parentKey.replace('phase:', '');
    return syncState.projects[projectSlug]?.phase_pages?.[folderName] || null;
  }

  return null;
}

/**
 * Sync a phase folder virtual page (no content, just a grouping page).
 *
 * @param {Client} notion - Notion client
 * @param {object} item - Phase folder item
 * @param {string} parentPageId - Parent page ID
 * @param {object} syncState - Sync state
 * @param {string} projectSlug - Project slug
 * @param {boolean} dryRun - Dry-run mode
 * @returns {Promise<object>} - { pageId, skipped: boolean }
 */
async function syncPhaseFolder(notion, item, parentPageId, syncState, projectSlug, dryRun) {
  const { folderName, title } = item;

  // Check if phase page already exists
  const existingPageId = syncState.projects[projectSlug]?.phase_pages?.[folderName];

  if (existingPageId) {
    // Validate page still exists
    if (!dryRun) {
      const validation = await validatePageExists(notion, existingPageId);
      if (validation.exists) {
        return { pageId: existingPageId, skipped: true };
      }
      // Page no longer exists - fall through to create new one
    } else {
      // In dry-run, assume it exists
      return { pageId: existingPageId, skipped: true };
    }
  }

  if (dryRun) {
    // In dry-run, simulate state update so children can continue
    if (!syncState.projects[projectSlug].phase_pages) {
      syncState.projects[projectSlug].phase_pages = {};
    }
    syncState.projects[projectSlug].phase_pages[folderName] = 'dry-run-phase-page';
    return { pageId: 'dry-run-phase-page', skipped: false };
  }

  // Create phase folder page (empty content)
  const pageId = await createPage(notion, {
    parentPageId,
    title,
    blocks: [] // No content blocks
  });

  // Update sync state
  if (!syncState.projects[projectSlug].phase_pages) {
    syncState.projects[projectSlug].phase_pages = {};
  }
  syncState.projects[projectSlug].phase_pages[folderName] = pageId;

  return { pageId, skipped: false };
}

/**
 * Resolve the planning directory, supporting multi-project layouts.
 * If .planning/.active-project exists, uses .planning/<slug>/.
 * Otherwise falls back to .planning/ (flat layout).
 *
 * @param {string} cwd - Working directory
 * @returns {string} Resolved planning directory path
 */
function resolvePlanningDir(cwd) {
  const planningRoot = path.join(cwd, '.planning');
  const activeProjectPath = path.join(planningRoot, '.active-project');

  try {
    if (fs.existsSync(activeProjectPath)) {
      const slug = fs.readFileSync(activeProjectPath, 'utf8').trim();
      if (slug) {
        const nested = path.join(planningRoot, slug);
        if (fs.existsSync(path.join(nested, 'PROJECT.md'))) {
          return nested;
        }
      }
    }
  } catch (e) {
    // Fall through to default
  }

  return planningRoot;
}

module.exports = {
  syncProject
};
