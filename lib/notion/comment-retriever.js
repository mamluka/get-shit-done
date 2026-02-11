/**
 * Notion Comment Retriever Module
 *
 * Fetches unresolved comments from synced Notion pages with pagination support.
 * Handles stale/deleted pages gracefully and provides source context for downstream grouping.
 */

const { loadSyncState, getProjectState, getPageId } = require('./sync-state.js');
const { validatePageExists } = require('./page-manager.js');
const { isNotionClientError, APIErrorCode } = require('@notionhq/client');

/**
 * Retrieve all unresolved comments from synced Notion pages.
 * Handles stale pages gracefully by skipping them with warnings.
 *
 * @param {Client} notion - Notion SDK client instance
 * @param {object} options - Retrieval options
 * @param {string} options.cwd - Working directory (for loading sync state)
 * @param {string} [options.projectSlug='default'] - Project slug
 * @param {Function} [options.onProgress] - Optional progress callback
 *   Callback signature: ({ pageFile, status, index, total, commentCount?, error? })
 *   - status: 'fetched' | 'skipped' | 'error'
 * @returns {Promise<object>} Result object
 *   - { comments: Array, pages: number, skipped: number, errors: Array }
 */
async function retrieveComments(notion, options) {
  const { cwd, projectSlug = 'default', onProgress } = options;

  // Load sync state
  const state = loadSyncState(cwd);
  const projectState = getProjectState(state, projectSlug);

  // Return early if no project state or doc_pages
  if (!projectState || !projectState.doc_pages) {
    return { comments: [], pages: 0, skipped: 0, errors: [] };
  }

  // Build page list from doc_pages
  const docPages = projectState.doc_pages;
  const pageList = [];

  for (const [filePath, value] of Object.entries(docPages)) {
    const pageId = getPageId(state, projectSlug, filePath);
    if (pageId) {
      pageList.push({ filePath, pageId });
    }
  }

  // Return early if no pages to process
  if (pageList.length === 0) {
    return { comments: [], pages: 0, skipped: 0, errors: [] };
  }

  // Process each page
  const allComments = [];
  const errors = [];
  let successCount = 0;
  let skipCount = 0;
  const total = pageList.length;

  for (let i = 0; i < pageList.length; i++) {
    const { filePath, pageId } = pageList[i];
    const index = i + 1;

    try {
      // Validate page exists
      const validation = await validatePageExists(notion, pageId);

      if (!validation.exists) {
        // Page is stale (deleted or unauthorized)
        skipCount++;
        const reason = validation.error === 'not_found'
          ? 'Page deleted or archived'
          : 'Page not accessible (missing permissions)';

        errors.push({ filePath, pageId, reason });

        if (onProgress) {
          onProgress({
            pageFile: filePath,
            status: 'skipped',
            index,
            total,
            error: reason
          });
        }

        continue;
      }

      // Fetch comments for this page
      const pageComments = await fetchPageComments(notion, pageId);

      // Attach source context to each comment
      const pageTitle = validation.page.properties?.title?.title?.[0]?.text?.content || null;

      for (const comment of pageComments) {
        comment.filePath = filePath;
        comment.pageTitle = pageTitle;
      }

      allComments.push(...pageComments);
      successCount++;

      if (onProgress) {
        onProgress({
          pageFile: filePath,
          status: 'fetched',
          index,
          total,
          commentCount: pageComments.length
        });
      }

    } catch (error) {
      // Handle errors during comment fetching
      errors.push({
        filePath,
        pageId,
        reason: error.message
      });

      if (onProgress) {
        onProgress({
          pageFile: filePath,
          status: 'error',
          index,
          total,
          error: error.message
        });
      }
    }
  }

  return {
    comments: allComments,
    pages: successCount,
    skipped: skipCount,
    errors
  };
}

/**
 * Fetch all comments for a Notion page using cursor-based pagination.
 * Internal helper function.
 *
 * @param {Client} notion - Notion SDK client instance
 * @param {string} pageId - Notion page ID (used as block_id for comments.list)
 * @returns {Promise<Array>} Array of comment objects from Notion API
 * @throws {Error} Network errors or API errors (403 for missing comment permissions)
 */
async function fetchPageComments(notion, pageId) {
  const comments = [];
  let cursor = undefined;

  try {
    while (true) {
      const response = await notion.comments.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100
      });

      comments.push(...response.results);

      if (!response.has_more) {
        break;
      }

      cursor = response.next_cursor;
    }
  } catch (error) {
    // Handle 403 Forbidden (missing read comment permission)
    if (isNotionClientError(error) && error.code === APIErrorCode.RestrictedResource) {
      throw new Error(
        "Missing read comment permission. Grant 'Read comments' in Notion integration settings at https://www.notion.so/my-integrations"
      );
    }

    // Re-throw other errors
    throw error;
  }

  return comments;
}

/**
 * Extract plain text from a Notion comment object.
 * Concatenates all rich_text elements into a single string.
 *
 * @param {object} comment - Notion comment object with rich_text array
 * @returns {string} Plain text content of the comment (empty string if no rich_text)
 */
function extractCommentText(comment) {
  if (!comment.rich_text || !Array.isArray(comment.rich_text)) {
    return '';
  }

  let text = '';
  for (const item of comment.rich_text) {
    // Try text.content first, fall back to plain_text
    const content = item.text?.content || item.plain_text || '';
    text += content;
  }

  return text;
}

module.exports = {
  retrieveComments,
  extractCommentText
};
