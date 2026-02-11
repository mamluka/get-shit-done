---
phase: 09-image-handling
plan: 01
subsystem: notion-integration
tags: [tdd, image-handling, file-upload, deduplication, markdown-conversion]

dependency_graph:
  requires:
    - lib/notion/sync-state.js (image_uploads tracking)
    - lib/notion/change-detector.js (SHA-256 hashing pattern)
  provides:
    - Image extraction from markdown
    - Path resolution for relative image references
    - File validation (format, size, existence)
    - SHA-256 deduplication tracking
    - Notion File Upload API integration
    - Block post-processing for image injection
  affects:
    - Plan 02 (converter pipeline integration)

tech_stack:
  added:
    - mime-types (content-type detection for uploads)
  patterns:
    - Streaming SHA-256 hash computation (from change-detector.js)
    - Marker-based block post-processing
    - Content-addressable deduplication via hash

key_files:
  created:
    - lib/notion/image-uploader.js (main module, 6 exports)
    - test/image-uploader.test.js (comprehensive TDD test suite)
  modified:
    - package.json (mime-types dependency)
    - package-lock.json (lockfile update)

decisions: []

metrics:
  duration_seconds: 150
  completed_at: "2026-02-11"
---

# Phase 09 Plan 01: Image Uploader Module Summary

**One-liner:** Built TDD image uploader with local file extraction, relative path resolution, SHA-256 deduplication, and Notion File Upload API integration.

## Objective

Build the image uploader module with TDD: extract local image references from markdown, resolve relative paths, deduplicate via SHA-256 hashing, upload via Notion File Upload API, and inject image blocks into converted output.

Purpose: Core business logic for IMG-02 (local file upload) and IMG-03 (deduplication tracking). External URLs (IMG-01) already work via Martian with no changes.

## Tasks Completed

### Task 1: RED - Write failing tests for image uploader module
**Commit:** 4d0fbee
**Files:** test/image-uploader.test.js

Created comprehensive test suite using Node.js built-in test runner (`node:test` + `node:assert`), matching Phase 7 TDD pattern.

Test coverage:
- **extractLocalImages:** 8 tests covering local vs external URLs, multiple images, alt text handling, image inside link
- **resolveImagePath:** 3 tests for relative (./), parent-relative (../), and bare path resolution
- **validateImageFile:** 11 tests for existence, format allowlist (9 Notion-supported formats), 20MB size limit
- **injectImageBlocks:** 4 tests for marker replacement with Notion image blocks

All tests failed with MODULE_NOT_FOUND as expected (RED phase ✓).

### Task 2: GREEN - Implement image uploader module to pass all tests
**Commit:** deb3ab6
**Files:** lib/notion/image-uploader.js, package.json, package-lock.json

Implemented module with 6 exported functions:

1. **extractLocalImages(markdown, markdownFilePath)**
   - Regex-based extraction: `/!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g`
   - Filters out external URLs (http/https)
   - Resolves relative paths to absolute via `resolveImagePath`

2. **resolveImagePath(markdownFilePath, imagePathInMarkdown)**
   - Uses `path.resolve(path.dirname(markdownFilePath), imagePathInMarkdown)`
   - Handles all relative forms: ./, ../, bare

3. **validateImageFile(absolutePath)**
   - Checks existence via `fs.existsSync`
   - Format allowlist: .bmp, .gif, .heic, .jpeg, .jpg, .png, .svg, .tif, .tiff
   - 20 MB size limit (20 * 1024 * 1024 bytes)

4. **hashFile(filePath)**
   - Streaming SHA-256 hash (reused from `change-detector.js`)
   - Memory-efficient for large files

5. **processLocalImages(markdown, markdownFilePath, notion, syncState, projectSlug, options)**
   - Extract → validate → hash → upload/dedupe → replace with marker
   - Deduplication: checks `syncState.projects[projectSlug].image_uploads[hash]`
   - Uploads via `notion.files.createUpload({ filename, content_type, file_contents })`
   - Stores upload metadata: `{ file_upload_id, local_path, uploaded_at, size_bytes, mime_type }`
   - Marker format: `[[IMAGE_UPLOAD:upload-id:alt-text]]`
   - Supports dry-run mode

6. **injectImageBlocks(blocks, imageUploadMap)**
   - Replaces paragraph blocks containing markers with Notion image blocks
   - Schema: `{ type: 'image', image: { type: 'file_upload', file_upload: { id } } }`

Installed `mime-types` dependency for content-type detection (fallback: 'application/octet-stream').

All tests pass (GREEN phase ✓).

## Verification Results

1. ✓ `node --test test/image-uploader.test.js` — all tests pass
2. ✓ Module loads without error
3. ✓ All 6 functions exported correctly
4. ✓ `extractLocalImages` returns correct extraction result
5. ✓ `resolveImagePath` resolves paths correctly
6. ✓ `mime-types` dependency present in package.json

## Deviations from Plan

None - plan executed exactly as written.

## Outputs

**Module ready for Plan 02 integration:**
- `lib/notion/image-uploader.js` exports all functions needed by converter pipeline
- Pure functions fully tested (processLocalImages integration testing deferred to Plan 02)
- SHA-256 deduplication pattern matches Phase 8 change detection

**Test coverage:**
- 26 test cases across 4 describe blocks
- Edge cases: missing files, unsupported formats, size limits, multiple images, mixed markers

## Next Steps

**Plan 02:** Integrate image uploader into converter pipeline
- Call `processLocalImages` before Martian conversion
- Pass markers through Martian (treated as text)
- Call `injectImageBlocks` after Martian conversion
- Update sync state with image_uploads field
- Add CLI flags for dry-run and image upload control

## Self-Check

Verifying all claims from summary.

**Created files:**
- ✓ FOUND: lib/notion/image-uploader.js
- ✓ FOUND: test/image-uploader.test.js

**Commits:**
- ✓ FOUND: 4d0fbee (RED phase commit)
- ✓ FOUND: deb3ab6 (GREEN phase commit)

**Self-Check: PASSED**
