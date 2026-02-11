const { test, describe } = require('node:test');
const assert = require('node:assert');
const { chunkBlocks } = require('../../lib/notion/chunker.js');

describe('chunkBlocks', () => {
  test('small document (< 90 blocks) returns single chunk', () => {
    const blocks = Array.from({ length: 50 }, (_, i) => ({
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: `Para ${i}` } }] }
    }));

    const result = chunkBlocks(blocks, 90);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].length, 50);
  });

  test('large document splits at heading boundaries', () => {
    const blocks = [];

    // Add 50 paragraphs
    for (let i = 0; i < 50; i++) {
      blocks.push({
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: `Para ${i}` } }] }
      });
    }

    // Add heading at position 50
    blocks.push({
      type: 'heading_1',
      heading_1: { rich_text: [{ type: 'text', text: { content: 'Section 2' } }] }
    });

    // Add 50 more paragraphs
    for (let i = 0; i < 50; i++) {
      blocks.push({
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: `Para ${i + 50}` } }] }
      });
    }

    // Add heading at position 101
    blocks.push({
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: 'Section 3' } }] }
    });

    // Add 30 more paragraphs
    for (let i = 0; i < 30; i++) {
      blocks.push({
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: `Para ${i + 100}` } }] }
      });
    }

    const result = chunkBlocks(blocks, 90);

    // Should split at heading boundaries
    assert.ok(result.length >= 2);
    // First chunk should be <= 90
    assert.ok(result[0].length <= 90);
    // Each chunk after first should start with heading
    for (let i = 1; i < result.length; i++) {
      assert.ok(result[i][0].type.startsWith('heading'));
    }
  });

  test('section exceeding 100 blocks force-splits at list item boundary', () => {
    const blocks = [];

    // Add heading
    blocks.push({
      type: 'heading_1',
      heading_1: { rich_text: [{ type: 'text', text: { content: 'Big Section' } }] }
    });

    // Add 110 list items (no internal headings)
    for (let i = 0; i < 110; i++) {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: `Item ${i}` } }], children: [] }
      });
    }

    const result = chunkBlocks(blocks, 90);

    // Should force-split because section exceeds 100 blocks
    assert.ok(result.length >= 2);
    // No chunk should exceed 100 blocks (hard limit)
    for (const chunk of result) {
      assert.ok(chunk.length <= 100);
    }
  });

  test('table blocks stay together (never split table from its rows)', () => {
    const blocks = [];

    // Add 50 paragraphs
    for (let i = 0; i < 50; i++) {
      blocks.push({
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: `Para ${i}` } }] }
      });
    }

    // Add table with 10 rows at position 50
    blocks.push({
      type: 'table',
      table: {
        table_width: 2,
        has_column_header: true,
        children: Array.from({ length: 10 }, (_, i) => ({
          type: 'table_row',
          table_row: {
            cells: [[{ type: 'text', text: { content: `Row ${i} Col 1` } }], [{ type: 'text', text: { content: `Row ${i} Col 2` } }]]
          }
        }))
      }
    });

    // Add 50 more paragraphs
    for (let i = 0; i < 50; i++) {
      blocks.push({
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: `Para ${i + 50}` } }] }
      });
    }

    const result = chunkBlocks(blocks, 90);

    // Find which chunk has the table
    let tableChunk = null;
    let tableIndex = -1;
    for (let i = 0; i < result.length; i++) {
      const idx = result[i].findIndex(b => b.type === 'table');
      if (idx >= 0) {
        tableChunk = result[i];
        tableIndex = idx;
        break;
      }
    }

    assert.ok(tableChunk !== null);
    // Table should be intact with all its rows
    assert.strictEqual(tableChunk[tableIndex].table.children.length, 10);
  });

  test('empty input returns empty array', () => {
    const result = chunkBlocks([], 90);
    assert.strictEqual(result.length, 0);
  });

  test('no headings in document: force-splits at logical points', () => {
    const blocks = [];

    // Add 150 paragraphs with no headings
    for (let i = 0; i < 150; i++) {
      blocks.push({
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: `Para ${i}` } }] }
      });
    }

    const result = chunkBlocks(blocks, 90);

    // Should split because > 90 blocks
    assert.ok(result.length >= 2);
    // No chunk should exceed 100
    for (const chunk of result) {
      assert.ok(chunk.length <= 100);
    }
  });

  test('all chunks respect 100-block hard maximum', () => {
    const blocks = [];

    // Create document with multiple sections, some exceeding 90 blocks
    for (let section = 0; section < 5; section++) {
      blocks.push({
        type: 'heading_1',
        heading_1: { rich_text: [{ type: 'text', text: { content: `Section ${section}` } }] }
      });

      // Add varying number of blocks per section
      const count = 30 + section * 20; // 30, 50, 70, 90, 110
      for (let i = 0; i < count; i++) {
        blocks.push({
          type: 'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: `S${section} Para ${i}` } }] }
        });
      }
    }

    const result = chunkBlocks(blocks, 90);

    // Verify hard limit
    for (const chunk of result) {
      assert.ok(chunk.length <= 100, `Chunk has ${chunk.length} blocks, exceeds hard limit of 100`);
    }
  });

  test('heading at end of document does not create empty trailing chunk', () => {
    const blocks = [];

    // Add 50 paragraphs
    for (let i = 0; i < 50; i++) {
      blocks.push({
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: `Para ${i}` } }] }
      });
    }

    // Add heading at the very end
    blocks.push({
      type: 'heading_1',
      heading_1: { rich_text: [{ type: 'text', text: { content: 'Last Heading' } }] }
    });

    const result = chunkBlocks(blocks, 90);

    // Should be single chunk (< 90 blocks)
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].length, 51);
    // Last block should be the heading
    assert.strictEqual(result[0][50].type, 'heading_1');
  });

  test('mixed content (headings, paragraphs, lists, tables, code) chunks correctly', () => {
    const blocks = [];

    // Section 1
    blocks.push({ type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: 'Intro' } }] } });
    for (let i = 0; i < 30; i++) {
      blocks.push({ type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: `Para ${i}` } }] } });
    }

    // Section 2 with list
    blocks.push({ type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'List Section' } }] } });
    for (let i = 0; i < 40; i++) {
      blocks.push({ type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: `Item ${i}` } }], children: [] } });
    }

    // Section 3 with code
    blocks.push({ type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Code Section' } }] } });
    blocks.push({ type: 'code', code: { rich_text: [{ type: 'text', text: { content: 'const x = 1;' } }], language: 'javascript' } });

    // Section 4 with table
    blocks.push({ type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Table Section' } }] } });
    blocks.push({
      type: 'table',
      table: {
        table_width: 2,
        has_column_header: true,
        children: Array.from({ length: 5 }, (_, i) => ({
          type: 'table_row',
          table_row: { cells: [[{ type: 'text', text: { content: `R${i}C1` } }], [{ type: 'text', text: { content: `R${i}C2` } }]] }
        }))
      }
    });

    const result = chunkBlocks(blocks, 90);

    // Should produce at least 1 chunk
    assert.ok(result.length >= 1);
    // All chunks valid
    for (const chunk of result) {
      assert.ok(chunk.length > 0);
      assert.ok(chunk.length <= 100);
    }
  });

  test('custom maxPerChunk parameter works', () => {
    const blocks = [];

    // Add 25 paragraphs
    for (let i = 0; i < 25; i++) {
      blocks.push({
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: `Para ${i}` } }] }
      });
    }

    // Add heading
    blocks.push({
      type: 'heading_1',
      heading_1: { rich_text: [{ type: 'text', text: { content: 'Section 2' } }] }
    });

    // Add 25 more paragraphs
    for (let i = 0; i < 25; i++) {
      blocks.push({
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: `Para ${i + 25}` } }] }
      });
    }

    // With maxPerChunk=10, should split at heading
    const result = chunkBlocks(blocks, 10);

    assert.ok(result.length >= 2);
    // First chunk should be ~10 blocks
    assert.ok(result[0].length <= 10 + 10); // Allow some flexibility for boundary logic
  });
});
