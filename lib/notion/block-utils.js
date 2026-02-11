/**
 * Notion block post-processing utilities.
 * Handles nesting flattening and toggle block conversion for Notion API compliance.
 */

/**
 * Flattens deeply nested block structures to respect Notion's 2-level nesting limit.
 *
 * When blocks exceed maxDepth, children are promoted to siblings with └ indent markers.
 *
 * @param {Array} blocks - Array of Notion blocks
 * @param {number} maxDepth - Maximum allowed nesting depth (default: 2)
 * @returns {Array} - Flattened blocks with same structure
 */
function flattenDeepNesting(blocks, maxDepth = 2) {
  return blocks.map(block => flattenBlock(block, 1, maxDepth));
}

/**
 * Recursively flattens a single block and its children.
 *
 * @param {Object} block - Notion block object
 * @param {number} currentDepth - Current depth in the tree
 * @param {number} maxDepth - Maximum allowed depth
 * @returns {Object} - Flattened block
 */
function flattenBlock(block, currentDepth, maxDepth) {
  const blockType = block.type;
  const blockContent = block[blockType];

  // Block types that can have children
  const childSupportingTypes = [
    'bulleted_list_item',
    'numbered_list_item',
    'to_do',
    'toggle',
    'callout',
    'quote'
  ];

  if (!childSupportingTypes.includes(blockType) || !blockContent.children || blockContent.children.length === 0) {
    return block;
  }

  // Process children and potentially flatten them
  const newChildren = [];

  for (const child of blockContent.children) {
    const childType = child.type;
    const childContent = child[childType];

    // Recurse into this child first
    const processedChild = flattenBlock(child, currentDepth + 1, maxDepth);

    // Add the processed child
    newChildren.push(processedChild);

    // If we're at maxDepth - 1, children of this child need to be promoted to siblings
    if (currentDepth === maxDepth - 1 && childContent.children && childContent.children.length > 0) {
      // Extract all descendants and add them as siblings
      const descendants = extractAllDescendants(childContent.children);
      newChildren.push(...descendants);
      // Clear the child's children since they've been promoted
      childContent.children = [];
    }
  }

  blockContent.children = newChildren;
  return block;
}

/**
 * Extracts all descendants from a children array, adding └ markers and removing nesting.
 *
 * @param {Array} children - Array of child blocks
 * @returns {Array} - Flattened array of all descendants with └ markers
 */
function extractAllDescendants(children) {
  const result = [];

  for (const child of children) {
    const childType = child.type;
    const childContent = child[childType];

    // Add └ marker if this child has rich_text
    if (childContent.rich_text && childContent.rich_text.length > 0) {
      childContent.rich_text[0].text.content = '└ ' + childContent.rich_text[0].text.content;
    }

    // Extract grandchildren before adding this child
    const grandchildren = childContent.children || [];
    childContent.children = [];

    // Add this child to result
    result.push(child);

    // Recursively extract all grandchildren
    if (grandchildren.length > 0) {
      result.push(...extractAllDescendants(grandchildren));
    }
  }

  return result;
}

/**
 * Converts blockquote blocks with bold first child to toggle blocks.
 *
 * Detects the details/summary pattern (bold first text in quote) and converts
 * to Notion toggle block structure. Regular blockquotes remain unchanged.
 *
 * @param {Array} blocks - Array of Notion blocks
 * @returns {Array} - Blocks with quotes converted to toggles where appropriate
 */
function convertQuotesToToggles(blocks) {
  return blocks.map(block => {
    if (block.type !== 'quote') {
      return block;
    }

    const quoteContent = block.quote;

    // Check if this is a details/summary pattern: bold first rich_text element
    if (!quoteContent.rich_text ||
        quoteContent.rich_text.length === 0 ||
        !quoteContent.rich_text[0].annotations ||
        !quoteContent.rich_text[0].annotations.bold) {
      return block;
    }

    // Convert to toggle block
    return {
      type: 'toggle',
      toggle: {
        rich_text: quoteContent.rich_text,
        color: 'default',
        children: quoteContent.children || []
      }
    };
  });
}

module.exports = {
  flattenDeepNesting,
  convertQuotesToToggles
};
