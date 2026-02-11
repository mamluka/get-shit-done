/**
 * Notion Converter Orchestrator Module
 *
 * Main conversion pipeline that chains preprocessing, Martian conversion,
 * text splitting, nesting flattening, toggle conversion, and chunking.
 *
 * Exports clean API for Phase 8 sync integration.
 */

const fs = require('fs');
const path = require('path');
const { markdownToBlocks } = require('@tryfabric/martian');
const { preprocessMarkdown } = require('./preprocessor.js');
const { splitRichText } = require('./text-splitter.js');
const { flattenDeepNesting, convertQuotesToToggles } = require('./block-utils.js');
const { chunkBlocks } = require('./chunker.js');
const { loadSyncState, saveSyncState } = require('./sync-state.js');
const { injectImageBlocks } = require('./image-uploader.js');

/**
 * Convert markdown string to Notion block arrays.
 * Pure function - no side effects.
 *
 * @param {string} markdown - Raw markdown content
 * @param {object} options - Conversion options
 *   - imageUploadMap: Map<string, string> (optional) - Map of original markdown syntax to upload IDs
 * @returns {object} - { blocks: Block[][], warnings: string[] }
 */
function convertMarkdown(markdown, options = {}) {
  const warnings = [];
  const { imageUploadMap } = options;

  try {
    // Step 1: Preprocess markdown for GSD patterns
    let preprocessed = preprocessMarkdown(markdown);

    // Step 1.5: Replace local image references with markers if imageUploadMap provided
    if (imageUploadMap && imageUploadMap.size > 0) {
      for (const [original, uploadId] of imageUploadMap.entries()) {
        // Extract alt text from original markdown syntax
        const altMatch = original.match(/!\[([^\]]*)\]/);
        const altText = altMatch ? altMatch[1] : '';

        // Replace with marker that will pass through Martian
        const marker = `[[IMAGE_UPLOAD:${uploadId}:${altText}]]`;
        preprocessed = preprocessed.replace(original, marker);
      }
    }

    // Step 2: Convert to Notion blocks using Martian
    const martianOptions = {
      notionLimits: {
        truncate: false, // Never silently truncate per user decision
        onError: (error) => {
          warnings.push({
            type: 'martian_limit',
            message: error.message,
            timestamp: new Date().toISOString()
          });
        }
      },
      strictImageUrls: false // Per research: invalid images become text
    };

    let blocks = markdownToBlocks(preprocessed, martianOptions);

    // Step 3: Split rich text for 2000-char limit
    // Walk all blocks and apply splitRichText where needed
    blocks = processBlocksForTextSplitting(blocks);

    // Step 4: Flatten deep nesting (3+ levels to 2)
    blocks = flattenDeepNesting(blocks);

    // Step 5: Convert details/summary blockquotes to toggles
    blocks = convertQuotesToToggles(blocks);

    // Step 6: Chunk blocks for API-sized batches
    let chunkedBlocks = chunkBlocks(blocks);

    // Step 7: Inject image blocks (replace marker paragraphs with image blocks)
    if (imageUploadMap && imageUploadMap.size > 0) {
      chunkedBlocks = chunkedBlocks.map(chunk => injectImageBlocks(chunk));
    }

    return {
      blocks: chunkedBlocks,
      warnings
    };

  } catch (error) {
    // Fallback: wrap original markdown in code block to prevent content loss
    warnings.push({
      type: 'conversion_error',
      message: `Martian conversion failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });

    // Create fallback code block
    const fallbackBlock = {
      type: 'code',
      code: {
        rich_text: [{
          type: 'text',
          text: { content: markdown.slice(0, 2000) },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default'
          }
        }],
        language: 'markdown'
      }
    };

    return {
      blocks: [[fallbackBlock]],
      warnings
    };
  }
}

/**
 * Process blocks recursively to split long rich_text arrays.
 * Handles blocks with children (nested structures).
 *
 * @param {Array} blocks - Array of Notion blocks
 * @returns {Array} - Processed blocks with split text
 */
function processBlocksForTextSplitting(blocks) {
  const result = [];

  for (const block of blocks) {
    const blockType = block.type;
    const blockContent = block[blockType];

    // Process rich_text if present
    if (blockContent.rich_text && blockContent.rich_text.length > 0) {
      const originalLength = blockContent.rich_text.length;
      blockContent.rich_text = splitRichText(blockContent.rich_text);

      // If rich_text was split into more segments, we might need to split the block itself
      // For paragraph blocks, if text was significantly split, create multiple paragraph blocks
      if (blockType === 'paragraph' && blockContent.rich_text.length > originalLength * 2) {
        // Split into multiple paragraphs if needed
        const splitBlocks = splitBlockByRichText(block);
        result.push(...splitBlocks);
        continue;
      }
    }

    // Recursively process children
    if (blockContent.children && blockContent.children.length > 0) {
      blockContent.children = processBlocksForTextSplitting(blockContent.children);
    }

    result.push(block);
  }

  return result;
}

/**
 * Split a block into multiple blocks when rich_text is too fragmented.
 * Only applies to paragraph blocks.
 *
 * @param {object} block - Notion block
 * @returns {Array} - Array of blocks (may be split)
 */
function splitBlockByRichText(block) {
  const blockType = block.type;
  const blockContent = block[blockType];

  // Only split paragraphs
  if (blockType !== 'paragraph') {
    return [block];
  }

  const richTextArray = blockContent.rich_text;
  const maxRichTextPerBlock = 100; // Notion API supports 100 rich_text objects per block

  if (richTextArray.length <= maxRichTextPerBlock) {
    return [block];
  }

  // Split into multiple paragraph blocks
  const blocks = [];
  for (let i = 0; i < richTextArray.length; i += maxRichTextPerBlock) {
    const chunk = richTextArray.slice(i, i + maxRichTextPerBlock);
    blocks.push({
      type: 'paragraph',
      paragraph: {
        rich_text: chunk,
        color: blockContent.color || 'default'
      }
    });
  }

  return blocks;
}

/**
 * Convert markdown file to Notion blocks.
 * Reads from disk and returns conversion result.
 *
 * @param {string} filePath - Path to markdown file
 * @param {object} options - Conversion options
 *   - imageUploadMap: Map<string, string> (optional) - Map of original markdown syntax to upload IDs
 * @returns {object} - { fileName, blocks, chunks, warnings, blockCount }
 */
function convertFile(filePath, options = {}) {
  try {
    // Read file
    const markdown = fs.readFileSync(filePath, 'utf8');

    // Convert (passing through imageUploadMap if provided)
    const result = convertMarkdown(markdown, options);

    // Calculate stats
    const flatBlocks = result.blocks.flat();
    const blockCount = flatBlocks.length;
    const fileName = path.basename(filePath);

    return {
      fileName,
      blocks: flatBlocks,
      chunks: result.blocks,
      warnings: result.warnings,
      blockCount
    };

  } catch (error) {
    // File read error
    return {
      fileName: path.basename(filePath),
      blocks: [],
      chunks: [],
      warnings: [{
        type: 'file_error',
        message: `Failed to read file: ${error.message}`,
        timestamp: new Date().toISOString()
      }],
      blockCount: 0
    };
  }
}

/**
 * Convert all markdown files in a directory.
 * Processes files in deterministic order with progress callbacks.
 *
 * @param {string} dirPath - Path to directory
 * @param {object} options - Conversion options
 *   - dryRun: boolean - Skip side effects
 *   - onProgress: (fileName, index, total) => void - Progress callback
 *   - logPath: string - Path for JSON Lines log file
 *   - cwd: string - Working directory for sync-state
 *   - projectSlug: string - Project slug for state tracking
 * @returns {object} - { files: ConversionResult[], totalBlocks, totalWarnings }
 */
function convertDirectory(dirPath, options = {}) {
  const {
    dryRun = false,
    onProgress = null,
    logPath = null,
    cwd = process.cwd(),
    projectSlug = null
  } = options;

  // Discover all .md files recursively
  const mdFiles = findMarkdownFiles(dirPath);

  // Sort files for deterministic order
  const sortedFiles = sortFiles(mdFiles);

  const results = [];
  let totalBlocks = 0;
  let totalWarnings = 0;

  // Load sync state if projectSlug provided (for incremental tracking)
  let syncState = null;
  if (projectSlug && !dryRun) {
    syncState = loadSyncState(cwd);
  }

  // Process each file
  for (let i = 0; i < sortedFiles.length; i++) {
    const filePath = sortedFiles[i];
    const fileName = path.basename(filePath);

    // Progress callback
    if (onProgress) {
      onProgress(fileName, i, sortedFiles.length);
    }

    // Convert file
    const result = convertFile(filePath, options);
    results.push(result);

    totalBlocks += result.blockCount;
    totalWarnings += result.warnings.length;

    // Write warnings to log file
    if (result.warnings.length > 0 && logPath && !dryRun) {
      writeWarningsToLog(logPath, fileName, result.warnings);
    }

    // Update sync state after successful conversion
    if (syncState && projectSlug && result.blockCount > 0 && !dryRun) {
      updateConversionState(syncState, projectSlug, filePath, result);
      saveSyncState(cwd, syncState);
    }
  }

  return {
    files: results,
    totalBlocks,
    totalWarnings
  };
}

/**
 * Find all markdown files in directory recursively.
 *
 * @param {string} dirPath - Directory path
 * @returns {Array} - Array of file paths
 */
function findMarkdownFiles(dirPath) {
  const files = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walk(dirPath);
  return files;
}

/**
 * Sort files in deterministic order.
 * Priority: PROJECT.md, ROADMAP.md, STATE.md, then phases in order, then alphabetical.
 *
 * @param {Array} files - Array of file paths
 * @returns {Array} - Sorted array
 */
function sortFiles(files) {
  const priority = {
    'PROJECT.md': 1,
    'ROADMAP.md': 2,
    'STATE.md': 3
  };

  return files.sort((a, b) => {
    const aName = path.basename(a);
    const bName = path.basename(b);

    // Check priority files
    const aPriority = priority[aName] || 999;
    const bPriority = priority[bName] || 999;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Both are phase files or other files - sort alphabetically by path
    return a.localeCompare(b);
  });
}

/**
 * Write warnings to JSON Lines log file.
 *
 * @param {string} logPath - Path to log file
 * @param {string} fileName - File name for context
 * @param {Array} warnings - Array of warning objects
 */
function writeWarningsToLog(logPath, fileName, warnings) {
  try {
    // Ensure log directory exists
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Append warnings as JSON Lines
    for (const warning of warnings) {
      const logEntry = {
        timestamp: warning.timestamp || new Date().toISOString(),
        file: fileName,
        type: warning.type,
        message: warning.message
      };

      fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    }
  } catch (error) {
    // Log write errors are non-fatal
    console.error(`Warning: Could not write to log file: ${error.message}`);
  }
}

/**
 * Update conversion state in notion-sync.json.
 *
 * @param {object} state - Sync state object
 * @param {string} projectSlug - Project slug
 * @param {string} filePath - File path
 * @param {object} result - Conversion result
 */
function updateConversionState(state, projectSlug, filePath, result) {
  if (!state.projects[projectSlug]) {
    state.projects[projectSlug] = {
      root_page_id: null,
      phase_pages: {},
      doc_pages: {},
      conversions: {}
    };
  }

  if (!state.projects[projectSlug].conversions) {
    state.projects[projectSlug].conversions = {};
  }

  state.projects[projectSlug].conversions[filePath] = {
    convertedAt: new Date().toISOString(),
    blockCount: result.blockCount,
    chunks: result.chunks.length
  };
}

module.exports = {
  convertMarkdown,
  convertFile,
  convertDirectory
};
