const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  extractLocalImages,
  resolveImagePath,
  validateImageFile,
  injectImageBlocks
} = require('../lib/notion/image-uploader.js');

describe('image-uploader', () => {
  let tempDir;
  let testImagePath;
  let largeFilePath;

  before(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-uploader-test-'));

    // Create a small test image (1x1 PNG)
    testImagePath = path.join(tempDir, 'test.png');
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testImagePath, pngBuffer);

    // Create a "large" file for size testing (mock via stat)
    largeFilePath = path.join(tempDir, 'large.png');
    fs.writeFileSync(largeFilePath, 'mock large file');
  });

  after(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('extractLocalImages', () => {
    it('should extract local image with alt text and relative path', () => {
      const markdown = '![diagram](./images/diagram.png)';
      const markdownPath = '/project/docs/README.md';
      const result = extractLocalImages(markdown, markdownPath);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].altText, 'diagram');
      assert.strictEqual(result[0].relativePath, './images/diagram.png');
      assert.strictEqual(result[0].absolutePath, '/project/docs/images/diagram.png');
    });

    it('should extract image with no alt text and parent-relative path', () => {
      const markdown = '![](../shared/logo.png)';
      const markdownPath = '/project/docs/guide/INSTALL.md';
      const result = extractLocalImages(markdown, markdownPath);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].altText, '');
      assert.strictEqual(result[0].relativePath, '../shared/logo.png');
      assert.strictEqual(result[0].absolutePath, '/project/docs/shared/logo.png');
    });

    it('should extract image with no ./ prefix', () => {
      const markdown = '![photo](images/photo.jpg)';
      const markdownPath = '/project/docs/README.md';
      const result = extractLocalImages(markdown, markdownPath);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].altText, 'photo');
      assert.strictEqual(result[0].relativePath, 'images/photo.jpg');
      assert.strictEqual(result[0].absolutePath, '/project/docs/images/photo.jpg');
    });

    it('should NOT extract external https URL', () => {
      const markdown = '![external](https://example.com/image.png)';
      const markdownPath = '/project/docs/README.md';
      const result = extractLocalImages(markdown, markdownPath);

      assert.strictEqual(result.length, 0);
    });

    it('should NOT extract external http URL', () => {
      const markdown = '![external](http://example.com/image.png)';
      const markdownPath = '/project/docs/README.md';
      const result = extractLocalImages(markdown, markdownPath);

      assert.strictEqual(result.length, 0);
    });

    it('should return empty array for markdown with no images', () => {
      const markdown = 'Just some text with no images.';
      const markdownPath = '/project/docs/README.md';
      const result = extractLocalImages(markdown, markdownPath);

      assert.strictEqual(result.length, 0);
    });

    it('should handle multiple images in same markdown', () => {
      const markdown = `
# Title
![first](./img1.png)
Some text
![second](./img2.jpg)
![third](../img3.gif)
      `;
      const markdownPath = '/project/docs/README.md';
      const result = extractLocalImages(markdown, markdownPath);

      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].altText, 'first');
      assert.strictEqual(result[1].altText, 'second');
      assert.strictEqual(result[2].altText, 'third');
    });

    it('should handle image inside link', () => {
      const markdown = '[![alt text](./path/to/image.png)](https://example.com)';
      const markdownPath = '/project/docs/README.md';
      const result = extractLocalImages(markdown, markdownPath);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].altText, 'alt text');
      assert.strictEqual(result[0].relativePath, './path/to/image.png');
    });
  });

  describe('resolveImagePath', () => {
    it('should resolve ./ relative path correctly', () => {
      const markdownPath = '/project/.planning/ROADMAP.md';
      const imagePath = './images/arch.png';
      const result = resolveImagePath(markdownPath, imagePath);

      assert.strictEqual(result, '/project/.planning/images/arch.png');
    });

    it('should resolve ../ parent-relative path correctly', () => {
      const markdownPath = '/project/.planning/phases/08-sync/08-PLAN.md';
      const imagePath = '../diagrams/flow.png';
      const result = resolveImagePath(markdownPath, imagePath);

      assert.strictEqual(result, '/project/.planning/phases/diagrams/flow.png');
    });

    it('should resolve bare path (no prefix) correctly', () => {
      const markdownPath = '/project/.planning/PROJECT.md';
      const imagePath = 'logo.png';
      const result = resolveImagePath(markdownPath, imagePath);

      assert.strictEqual(result, '/project/.planning/logo.png');
    });
  });

  describe('validateImageFile', () => {
    it('should return valid:true for existing .png file', () => {
      const result = validateImageFile(testImagePath);

      assert.strictEqual(result.valid, true);
    });

    it('should return valid:false with not_found reason for non-existent path', () => {
      const result = validateImageFile('/nonexistent/path/image.png');

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.reason, 'not_found');
    });

    it('should return valid:false with unsupported_format for .pdf', () => {
      const pdfPath = path.join(tempDir, 'doc.pdf');
      fs.writeFileSync(pdfPath, 'fake pdf content');
      const result = validateImageFile(pdfPath);

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.reason, 'unsupported_format');
    });

    it('should return valid:false with unsupported_format for .docx', () => {
      const docxPath = path.join(tempDir, 'doc.docx');
      fs.writeFileSync(docxPath, 'fake docx content');
      const result = validateImageFile(docxPath);

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.reason, 'unsupported_format');
    });

    it('should return valid:false with unsupported_format for .mp4', () => {
      const mp4Path = path.join(tempDir, 'video.mp4');
      fs.writeFileSync(mp4Path, 'fake video content');
      const result = validateImageFile(mp4Path);

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.reason, 'unsupported_format');
    });

    it('should return valid:false with too_large reason for file > 20 MB', () => {
      // Mock fs.statSync to return large size
      const originalStatSync = fs.statSync;
      fs.statSync = (filePath, ...args) => {
        if (filePath === largeFilePath) {
          return { size: 21 * 1024 * 1024 }; // 21 MB
        }
        return originalStatSync(filePath, ...args);
      };

      const result = validateImageFile(largeFilePath);

      // Restore original function
      fs.statSync = originalStatSync;

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.reason, 'too_large');
    });

    it('should accept .bmp format', () => {
      const bmpPath = path.join(tempDir, 'image.bmp');
      fs.writeFileSync(bmpPath, 'fake bmp');
      const result = validateImageFile(bmpPath);

      assert.strictEqual(result.valid, true);
    });

    it('should accept .gif format', () => {
      const gifPath = path.join(tempDir, 'image.gif');
      fs.writeFileSync(gifPath, 'fake gif');
      const result = validateImageFile(gifPath);

      assert.strictEqual(result.valid, true);
    });

    it('should accept .heic format', () => {
      const heicPath = path.join(tempDir, 'image.heic');
      fs.writeFileSync(heicPath, 'fake heic');
      const result = validateImageFile(heicPath);

      assert.strictEqual(result.valid, true);
    });

    it('should accept .jpeg format', () => {
      const jpegPath = path.join(tempDir, 'image.jpeg');
      fs.writeFileSync(jpegPath, 'fake jpeg');
      const result = validateImageFile(jpegPath);

      assert.strictEqual(result.valid, true);
    });

    it('should accept .jpg format', () => {
      const jpgPath = path.join(tempDir, 'image.jpg');
      fs.writeFileSync(jpgPath, 'fake jpg');
      const result = validateImageFile(jpgPath);

      assert.strictEqual(result.valid, true);
    });

    it('should accept .svg format', () => {
      const svgPath = path.join(tempDir, 'image.svg');
      fs.writeFileSync(svgPath, 'fake svg');
      const result = validateImageFile(svgPath);

      assert.strictEqual(result.valid, true);
    });

    it('should accept .tif format', () => {
      const tifPath = path.join(tempDir, 'image.tif');
      fs.writeFileSync(tifPath, 'fake tif');
      const result = validateImageFile(tifPath);

      assert.strictEqual(result.valid, true);
    });

    it('should accept .tiff format', () => {
      const tiffPath = path.join(tempDir, 'image.tiff');
      fs.writeFileSync(tiffPath, 'fake tiff');
      const result = validateImageFile(tiffPath);

      assert.strictEqual(result.valid, true);
    });
  });

  describe('injectImageBlocks', () => {
    it('should replace paragraph containing marker with image block', () => {
      const blocks = [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              { type: 'text', text: { content: '[[IMAGE_UPLOAD:upload-id-1:alt text]]' } }
            ]
          }
        }
      ];

      const result = injectImageBlocks(blocks);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].type, 'image');
      assert.strictEqual(result[0].image.type, 'file_upload');
      assert.strictEqual(result[0].image.file_upload.id, 'upload-id-1');
    });

    it('should preserve blocks that do not contain markers', () => {
      const blocks = [
        {
          type: 'heading_1',
          heading_1: {
            rich_text: [{ type: 'text', text: { content: 'Title' } }]
          }
        },
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: 'Some text' } }]
          }
        }
      ];

      const result = injectImageBlocks(blocks);

      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].type, 'heading_1');
      assert.strictEqual(result[1].type, 'paragraph');
    });

    it('should handle multiple markers in different paragraphs', () => {
      const blocks = [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              { type: 'text', text: { content: '[[IMAGE_UPLOAD:upload-1:first]]' } }
            ]
          }
        },
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: 'Some text' } }]
          }
        },
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              { type: 'text', text: { content: '[[IMAGE_UPLOAD:upload-2:second]]' } }
            ]
          }
        }
      ];

      const result = injectImageBlocks(blocks);

      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].type, 'image');
      assert.strictEqual(result[0].image.file_upload.id, 'upload-1');
      assert.strictEqual(result[1].type, 'paragraph');
      assert.strictEqual(result[2].type, 'image');
      assert.strictEqual(result[2].image.file_upload.id, 'upload-2');
    });

    it('should handle marker with empty alt text', () => {
      const blocks = [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              { type: 'text', text: { content: '[[IMAGE_UPLOAD:upload-id-2:]]' } }
            ]
          }
        }
      ];

      const result = injectImageBlocks(blocks);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].type, 'image');
      assert.strictEqual(result[0].image.file_upload.id, 'upload-id-2');
    });
  });
});
