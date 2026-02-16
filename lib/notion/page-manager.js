/**
 * Notion Page Manager Module
 *
 * Provides CRUD operations for Notion pages: create with parent hierarchy,
 * update with content replacement, and page existence validation.
 * Handles block batching for API limits and stale page ID detection.
 */

const { isNotionClientError, APIErrorCode } = require('@notionhq/client');

/**
 * Validate that a Notion page exists and is accessible.
 * Checks for deleted pages and permission issues.
 *
 * @param {Client} notion - Notion SDK client instance
 * @param {string} pageId - Notion page ID to validate
 * @returns {Promise<object>} Validation result
 *   - { exists: true, page: object } - Page is accessible
 *   - { exists: false, error: 'not_found' } - Page was deleted (404)
 *   - { exists: false, error: 'unauthorized' } - Page not shared with integration (403)
 * @throws {Error} Network or unexpected errors
 */
async function validatePageExists(notion, pageId) {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    if (page.archived) {
      return { exists: false, error: 'archived' };
    }
    return { exists: true, page };
  } catch (error) {
    // Handle Notion API errors with type-safe detection
    if (isNotionClientError(error)) {
      // Page deleted or archived
      if (error.code === APIErrorCode.ObjectNotFound) {
        return { exists: false, error: 'not_found' };
      }

      // Permission denied (page not shared with integration)
      if (error.code === APIErrorCode.Unauthorized || error.code === APIErrorCode.RestrictedResource) {
        return { exists: false, error: 'unauthorized' };
      }
    }

    // Network or unexpected errors - let caller handle
    throw error;
  }
}

/**
 * Create a new Notion page with parent relationship.
 * Validates parent exists before creating. Handles block batching for >100 blocks.
 *
 * @param {Client} notion - Notion SDK client instance
 * @param {object} options - Page creation options
 * @param {string} options.parentPageId - Parent page ID (must exist)
 * @param {string} options.title - Page title
 * @param {Array} options.blocks - Array of Notion block objects
 * @returns {Promise<string>} Created page ID
 * @throws {Error} If parent page not found or creation fails
 */
async function createPage(notion, { parentPageId, title, blocks = [] }) {
  // Validate parent page exists before creating child
  const validation = await validatePageExists(notion, parentPageId);
  if (!validation.exists) {
    if (validation.error === 'not_found' || validation.error === 'archived') {
      throw new Error(`Parent page ${parentPageId} not found or archived. Cannot create child page "${title}".`);
    } else if (validation.error === 'unauthorized') {
      throw new Error(`Parent page ${parentPageId} not accessible. Ensure it's shared with the integration.`);
    }
  }

  // Create page with first 100 blocks (Notion API limit)
  const initialBlocks = blocks.slice(0, 100);
  const response = await notion.pages.create({
    parent: { page_id: parentPageId },
    properties: {
      title: {
        title: [{ text: { content: title } }]
      }
    },
    children: initialBlocks
  });

  const pageId = response.id;

  // Append remaining blocks in batches of 100
  if (blocks.length > 100) {
    for (let i = 100; i < blocks.length; i += 100) {
      const chunk = blocks.slice(i, i + 100);
      await notion.blocks.children.append({
        block_id: pageId,
        children: chunk
      });
    }
  }

  return pageId;
}

/**
 * Update an existing Notion page by replacing all content.
 * Process: update title → delete all child blocks → append new blocks.
 * Handles pagination for block deletion and batching for block appending.
 *
 * @param {Client} notion - Notion SDK client instance
 * @param {object} options - Page update options
 * @param {string} options.pageId - Page ID to update
 * @param {string} options.title - New page title
 * @param {Array} options.blocks - New array of Notion block objects
 * @returns {Promise<string>} Updated page ID (same as input)
 * @throws {Error} If page not found (404) or update fails
 */
async function updatePage(notion, { pageId, title, blocks = [] }) {
  // Step 1: Update page title
  try {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        title: {
          title: [{ text: { content: title } }]
        }
      }
    });
  } catch (error) {
    if (isNotionClientError(error) && error.code === APIErrorCode.ObjectNotFound) {
      throw new Error(`Page ${pageId} not found. It may have been deleted in Notion.`);
    }
    throw error;
  }

  // Step 2: Delete existing content - list all child blocks and archive them
  // Use pagination to handle pages with >100 blocks
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      start_cursor: startCursor
    });

    // Archive content blocks only — skip child pages/databases which are
    // separate pages managed by other sync operations
    for (const block of response.results) {
      if (block.type === 'child_page' || block.type === 'child_database') {
        continue;
      }
      await notion.blocks.update({
        block_id: block.id,
        archived: true
      });
    }

    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  // Step 3: Append new blocks in batches of 100
  for (let i = 0; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100);
    await notion.blocks.children.append({
      block_id: pageId,
      children: chunk
    });
  }

  return pageId;
}

module.exports = {
  validatePageExists,
  createPage,
  updatePage
};
