/**
 * Notion Comment Retriever Module
 *
 * Fetches comments (page-level and inline block comments) from synced Notion pages.
 * Uses parallel fetching for speed: pages processed concurrently, block comment
 * queries batched in parallel within each page.
 */

const { loadSyncState, getProjectState, getPageId } = require('./sync-state.js');
const { validatePageExists } = require('./page-manager.js');
const { isNotionClientError, APIErrorCode } = require('@notionhq/client');

/** Max concurrent Notion API requests */
const CONCURRENCY = 5;

/**
 * Run async tasks with bounded concurrency.
 *
 * @param {Array} items - Items to process
 * @param {number} concurrency - Max concurrent tasks
 * @param {Function} fn - Async function (item) => result
 * @returns {Promise<Array>} Results in same order as items
 */
async function parallelMap(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Retrieve all comments (page-level + inline) from synced Notion pages.
 * Pages are processed in parallel for speed.
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

  const state = loadSyncState(cwd);
  const projectState = getProjectState(state, projectSlug);

  if (!projectState || !projectState.doc_pages) {
    return { comments: [], pages: 0, skipped: 0, errors: [] };
  }

  const docPages = projectState.doc_pages;
  const pageList = [];

  for (const [filePath] of Object.entries(docPages)) {
    const pageId = getPageId(state, projectSlug, filePath);
    if (pageId) {
      pageList.push({ filePath, pageId });
    }
  }

  if (pageList.length === 0) {
    return { comments: [], pages: 0, skipped: 0, errors: [] };
  }

  const allComments = [];
  const errors = [];
  let successCount = 0;
  let skipCount = 0;
  let progressIndex = 0;
  const total = pageList.length;

  const results = await parallelMap(pageList, CONCURRENCY, async ({ filePath, pageId }) => {
    const index = ++progressIndex;

    try {
      const validation = await validatePageExists(notion, pageId);

      if (!validation.exists) {
        skipCount++;
        const reason = validation.error === 'not_found'
          ? 'Page deleted or archived'
          : 'Page not accessible (missing permissions)';

        errors.push({ filePath, pageId, reason });

        if (onProgress) {
          onProgress({ pageFile: filePath, status: 'skipped', index, total, error: reason });
        }
        return [];
      }

      const pageComments = await fetchPageComments(notion, pageId);

      const pageTitle = validation.page.properties?.title?.title?.[0]?.text?.content || null;
      for (const comment of pageComments) {
        comment.filePath = filePath;
        comment.pageTitle = pageTitle;
      }

      successCount++;

      if (onProgress) {
        onProgress({ pageFile: filePath, status: 'fetched', index, total, commentCount: pageComments.length });
      }

      return pageComments;

    } catch (error) {
      errors.push({ filePath, pageId, reason: error.message });

      if (onProgress) {
        onProgress({ pageFile: filePath, status: 'error', index, total, error: error.message });
      }
      return [];
    }
  });

  for (const pageComments of results) {
    allComments.push(...pageComments);
  }

  return {
    comments: allComments,
    pages: successCount,
    skipped: skipCount,
    errors
  };
}

/**
 * Fetch all comments for a Notion page, including inline block comments.
 * Lists all child blocks, then queries comments on the page + every block in parallel.
 *
 * @param {Client} notion - Notion SDK client instance
 * @param {string} pageId - Notion page ID
 * @returns {Promise<Array>} Array of comment objects
 */
async function fetchPageComments(notion, pageId) {
  // Step 1: List all block IDs in the page
  const blockIds = await listAllBlockIds(notion, pageId);

  // Step 2: Fetch comments on the page itself + all blocks in parallel
  const allIds = [pageId, ...blockIds];
  const commentArrays = await parallelMap(allIds, CONCURRENCY, (id) => fetchBlockComments(notion, id));

  return commentArrays.flat();
}

/**
 * Fetch comments on a single block using cursor-based pagination.
 *
 * @param {Client} notion - Notion SDK client instance
 * @param {string} blockId - Block ID to fetch comments for
 * @returns {Promise<Array>} Array of comment objects
 */
async function fetchBlockComments(notion, blockId) {
  const comments = [];
  let cursor = undefined;

  try {
    while (true) {
      const response = await notion.comments.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100
      });

      comments.push(...response.results);

      if (!response.has_more) break;
      cursor = response.next_cursor;
    }
  } catch (error) {
    if (isNotionClientError(error) && error.code === APIErrorCode.RestrictedResource) {
      throw new Error(
        "Missing read comment permission. Grant 'Read comments' in Notion integration settings at https://www.notion.so/my-integrations"
      );
    }
    throw error;
  }

  return comments;
}

/**
 * List all child block IDs for a page (recursive, includes nested blocks).
 * Parallelizes recursive children fetching.
 *
 * @param {Client} notion - Notion SDK client instance
 * @param {string} parentId - Page or block ID to list children of
 * @returns {Promise<string[]>} Array of block IDs
 */
async function listAllBlockIds(notion, parentId) {
  const blockIds = [];
  let cursor = undefined;

  // Collect top-level blocks first
  const topBlocks = [];
  while (true) {
    const response = await notion.blocks.children.list({
      block_id: parentId,
      start_cursor: cursor,
      page_size: 100
    });

    topBlocks.push(...response.results);

    if (!response.has_more) break;
    cursor = response.next_cursor;
  }

  // Add all block IDs
  for (const block of topBlocks) {
    blockIds.push(block.id);
  }

  // Recurse into blocks with children in parallel
  const withChildren = topBlocks.filter(
    b => b.has_children && b.type !== 'child_page' && b.type !== 'child_database'
  );

  if (withChildren.length > 0) {
    const childResults = await parallelMap(withChildren, CONCURRENCY, (block) =>
      listAllBlockIds(notion, block.id)
    );
    for (const childIds of childResults) {
      blockIds.push(...childIds);
    }
  }

  return blockIds;
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
    const content = item.text?.content || item.plain_text || '';
    text += content;
  }

  return text;
}

module.exports = {
  retrieveComments,
  extractCommentText
};
