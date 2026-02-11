/**
 * Notion Image Uploader Module
 *
 * Extracts local image references from markdown, resolves paths, validates files,
 * uploads to Notion via File Upload API with SHA-256 deduplication, and injects
 * image blocks into Notion block arrays.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

/**
 * Extract local image references from markdown.
 * Filters out external URLs (http/https).
 *
 * @param {string} markdown - Markdown content
 * @param {string} markdownFilePath - Path to markdown file (for path resolution)
 * @returns {Array<object>} Array of local images with { original, altText, relativePath, absolutePath }
 */
function extractLocalImages(markdown, markdownFilePath) {
  const images = [];
  // Match ![alt](path) where path does NOT start with http:// or https://
  const regex = /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g;
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    const altText = match[1];
    const relativePath = match[2];
    const absolutePath = resolveImagePath(markdownFilePath, relativePath);

    images.push({
      original: match[0],
      altText,
      relativePath,
      absolutePath
    });
  }

  return images;
}

/**
 * Resolve image path relative to markdown file.
 *
 * @param {string} markdownFilePath - Absolute path to markdown file
 * @param {string} imagePathInMarkdown - Relative path from markdown (e.g., ./images/arch.png)
 * @returns {string} Absolute path to image file
 */
function resolveImagePath(markdownFilePath, imagePathInMarkdown) {
  const markdownDir = path.dirname(markdownFilePath);
  return path.resolve(markdownDir, imagePathInMarkdown);
}

/**
 * Validate image file exists, has supported format, and is under 20 MB.
 *
 * Supported formats: .bmp, .gif, .heic, .jpeg, .jpg, .png, .svg, .tif, .tiff
 *
 * @param {string} absolutePath - Absolute path to image file
 * @returns {object} Validation result
 *   - { valid: true } if all checks pass
 *   - { valid: false, reason: 'not_found' | 'unsupported_format' | 'too_large' }
 */
function validateImageFile(absolutePath) {
  // Check file exists
  if (!fs.existsSync(absolutePath)) {
    return { valid: false, reason: 'not_found' };
  }

  // Check format (Notion-supported image formats)
  const supportedFormats = ['.bmp', '.gif', '.heic', '.jpeg', '.jpg', '.png', '.svg', '.tif', '.tiff'];
  const ext = path.extname(absolutePath).toLowerCase();
  if (!supportedFormats.includes(ext)) {
    return { valid: false, reason: 'unsupported_format' };
  }

  // Check size (20 MB limit)
  const stats = fs.statSync(absolutePath);
  const maxSize = 20 * 1024 * 1024; // 20 MB in bytes
  if (stats.size > maxSize) {
    return { valid: false, reason: 'too_large' };
  }

  return { valid: true };
}

/**
 * Hash file content using SHA-256 streaming (memory-efficient).
 * Reuses pattern from change-detector.js.
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
 * Process local images in markdown: validate, hash, upload/dedupe, replace with markers.
 *
 * @param {string} markdown - Markdown content
 * @param {string} markdownFilePath - Path to markdown file
 * @param {object} notion - Notion client instance (@notionhq/client)
 * @param {object} syncState - Sync state object from notion-sync.json
 * @param {string} projectSlug - Project slug identifier
 * @param {object} options - Options { dryRun: boolean }
 * @returns {Promise<object>} { processedMarkdown, uploads: [...], warnings: [...] }
 */
async function processLocalImages(markdown, markdownFilePath, notion, syncState, projectSlug, options = {}) {
  const images = extractLocalImages(markdown, markdownFilePath);
  const uploads = [];
  const warnings = [];
  let processedMarkdown = markdown;

  // Ensure project exists in sync state
  if (!syncState.projects[projectSlug]) {
    syncState.projects[projectSlug] = { image_uploads: {} };
  }
  if (!syncState.projects[projectSlug].image_uploads) {
    syncState.projects[projectSlug].image_uploads = {};
  }

  const imageUploads = syncState.projects[projectSlug].image_uploads;

  for (const image of images) {
    // Validate file
    const validation = validateImageFile(image.absolutePath);
    if (!validation.valid) {
      warnings.push({
        path: image.absolutePath,
        reason: validation.reason,
        original: image.original
      });
      // Replace with fallback paragraph marker
      processedMarkdown = processedMarkdown.replace(
        image.original,
        `[Image unavailable: ${image.relativePath} - ${validation.reason}]`
      );
      continue;
    }

    // Hash file
    const hash = await hashFile(image.absolutePath);

    // Check for existing upload (deduplication)
    let fileUploadId;
    if (imageUploads[hash]) {
      // Reuse existing upload
      fileUploadId = imageUploads[hash].file_upload_id;
      uploads.push({
        path: image.absolutePath,
        hash,
        fileUploadId,
        reused: true
      });
    } else if (!options.dryRun) {
      // Upload new file
      const filename = path.basename(image.absolutePath);
      const contentType = mime.lookup(image.absolutePath) || 'application/octet-stream';
      const fileBuffer = fs.readFileSync(image.absolutePath);

      // Call Notion File Upload API
      const uploadResponse = await notion.files.createUpload({
        filename,
        content_type: contentType,
        file_contents: fileBuffer
      });

      fileUploadId = uploadResponse.file_upload.id;

      // Store in sync state
      imageUploads[hash] = {
        file_upload_id: fileUploadId,
        local_path: image.absolutePath,
        uploaded_at: new Date().toISOString(),
        size_bytes: fs.statSync(image.absolutePath).size,
        mime_type: contentType
      };

      uploads.push({
        path: image.absolutePath,
        hash,
        fileUploadId,
        reused: false
      });
    } else {
      // Dry run: report what would be uploaded
      uploads.push({
        path: image.absolutePath,
        hash,
        fileUploadId: null,
        reused: false,
        dryRun: true
      });
      fileUploadId = 'dry-run-upload-id';
    }

    // Replace markdown image with marker
    processedMarkdown = processedMarkdown.replace(
      image.original,
      `[[IMAGE_UPLOAD:${fileUploadId}:${image.altText}]]`
    );
  }

  return { processedMarkdown, uploads, warnings };
}

/**
 * Inject image blocks into Notion blocks array by replacing marker paragraphs.
 *
 * Marker format: [[IMAGE_UPLOAD:upload-id:alt text]]
 *
 * @param {Array<object>} blocks - Notion blocks array
 * @returns {Array<object>} Modified blocks with image blocks injected
 */
function injectImageBlocks(blocks) {
  return blocks.flatMap(block => {
    // Only process paragraph blocks
    if (block.type !== 'paragraph') {
      return [block];
    }

    // Check if paragraph contains image upload marker
    const richText = block.paragraph.rich_text;
    if (!richText || richText.length === 0) {
      return [block];
    }

    const content = richText[0]?.text?.content || '';
    const markerRegex = /\[\[IMAGE_UPLOAD:([^:]+):([^\]]*)\]\]/;
    const match = content.match(markerRegex);

    if (!match) {
      return [block];
    }

    // Extract upload ID from marker
    const uploadId = match[1];

    // Replace with image block
    return [{
      type: 'image',
      image: {
        type: 'file_upload',
        file_upload: {
          id: uploadId
        }
      }
    }];
  });
}

module.exports = {
  extractLocalImages,
  resolveImagePath,
  validateImageFile,
  hashFile,
  processLocalImages,
  injectImageBlocks
};
