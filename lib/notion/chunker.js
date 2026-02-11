/**
 * Section-aware block chunker for Notion API limits.
 * Splits large block arrays at heading boundaries to respect 100-block hard limit.
 */

/**
 * Chunks blocks array into smaller arrays suitable for Notion API requests.
 *
 * Strategy:
 * 1. Identify sections (groups of blocks between headings)
 * 2. Combine sections into chunks up to maxPerChunk
 * 3. Split at heading boundaries when approaching maxPerChunk
 * 4. Force-split oversized sections at logical boundaries (respecting 100-block hard limit)
 * 5. Never split tables from their rows
 *
 * @param {Array} blocks - Array of Notion blocks
 * @param {number} maxPerChunk - Soft limit for chunk size (default: 90)
 * @returns {Array<Array>} - Array of block chunks
 */
function chunkBlocks(blocks, maxPerChunk = 90) {
  if (!blocks || blocks.length === 0) {
    return [];
  }

  if (blocks.length <= maxPerChunk) {
    return [blocks];
  }

  const chunks = [];
  let currentChunk = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockType = block.type;

    // Check if this is a heading
    const isHeading = blockType === 'heading_1' || blockType === 'heading_2' || blockType === 'heading_3';

    // If this is a heading and current chunk would risk exceeding limit if we continue, split now
    // We use a threshold: if current chunk + typical section size (estimated as maxPerChunk/2) would exceed maxPerChunk, split
    if (isHeading && currentChunk.length > 0) {
      const estimatedNextSectionSize = maxPerChunk / 2;
      if (currentChunk.length + estimatedNextSectionSize > maxPerChunk) {
        chunks.push(currentChunk);
        currentChunk = [block];
        continue;
      }
    }

    // Force split if we exceed hard limit or significantly exceed soft limit without finding a heading
    // Hard limit: 100 blocks (Notion API constraint)
    // Soft limit overage: if no heading found and we're at 1.5x maxPerChunk, force split
    if (currentChunk.length >= 100 || (currentChunk.length >= Math.floor(maxPerChunk * 1.5) && !isHeading)) {
      chunks.push(currentChunk);
      currentChunk = [block];
      continue;
    }

    // Handle tables - count table + rows as single unit
    if (blockType === 'table') {
      const tableWithRows = block.table.children ? block.table.children.length + 1 : 1;

      // If adding this table would exceed hard limit, start new chunk
      if (currentChunk.length + tableWithRows > 100) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
        }
      }

      currentChunk.push(block);
      continue;
    }

    // Normal block - add if it doesn't exceed hard limit
    if (currentChunk.length + 1 > 100) {
      chunks.push(currentChunk);
      currentChunk = [block];
    } else {
      currentChunk.push(block);
    }
  }

  // Add remaining blocks
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

module.exports = {
  chunkBlocks
};
