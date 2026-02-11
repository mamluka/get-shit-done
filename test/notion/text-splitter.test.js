const { describe, it } = require('node:test');
const assert = require('node:assert');
const { splitTextAtSentences, splitRichText } = require('../../lib/notion/text-splitter.js');

describe('splitTextAtSentences', () => {
  it('returns single-element array for text under maxLength', () => {
    const text = 'This is a short text.';
    const result = splitTextAtSentences(text, 2000);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0], text);
  });

  it('splits long text at sentence boundaries', () => {
    const text = 'First sentence here. Second sentence here. Third sentence here.';
    const result = splitTextAtSentences(text, 30);

    assert.ok(result.length > 1, 'Should split into multiple chunks');
    assert.ok(result.every(chunk => chunk.length <= 30), 'All chunks should be under maxLength');
    assert.ok(result.join(' ').includes('First sentence'), 'Should preserve content');
  });

  it('handles abbreviations correctly (does not split at Dr., Mrs., Inc.)', () => {
    const text = 'Dr. Smith works at ABC Inc. He is a specialist. Mrs. Johnson agrees.';
    const result = splitTextAtSentences(text, 35);

    // Should not split "Dr. Smith" or "ABC Inc."
    assert.ok(result.some(chunk => chunk.includes('Dr. Smith')), 'Dr. should stay with Smith');
    assert.ok(result.some(chunk => chunk.includes('ABC Inc.')), 'Inc. should stay with ABC');
  });

  it('handles decimals correctly (does not split at decimal point)', () => {
    const text = 'The value is 3.14 exactly. Another value is 99.99 percent.';
    const result = splitTextAtSentences(text, 35);

    assert.ok(result.some(chunk => chunk.includes('3.14')), 'Decimal should not be split');
    assert.ok(result.some(chunk => chunk.includes('99.99')), 'Decimal should not be split');
  });

  it('falls back to word-boundary splitting for single oversized sentence', () => {
    // Create a single sentence longer than maxLength with no sentence breaks
    const longSentence = 'This is a very long sentence without any periods that exceeds the maximum length limit';
    const result = splitTextAtSentences(longSentence, 40);

    assert.ok(result.length > 1, 'Should split long sentence');
    assert.ok(result.every(chunk => chunk.length <= 40), 'All chunks should be under maxLength');
    // Should split at word boundaries - chunks should end with complete words, not cut mid-word
    const combined = result.join(' ');
    assert.ok(combined.includes('This is a very long sentence'), 'Should preserve original text');
    // Verify no partial words by checking we can find all original words in result
    const originalWords = longSentence.split(' ');
    const resultWords = combined.split(' ');
    assert.ok(originalWords.every(word => resultWords.includes(word)), 'Should not cut words in half');
  });

  it('returns empty array for empty string', () => {
    const result = splitTextAtSentences('', 2000);

    assert.strictEqual(result.length, 0);
  });

  it('trims whitespace from chunks', () => {
    const text = 'First sentence.   Second sentence.   Third sentence.';
    const result = splitTextAtSentences(text, 25);

    assert.ok(result.every(chunk => chunk === chunk.trim()), 'All chunks should be trimmed');
    assert.ok(result.every(chunk => !chunk.includes('  ')), 'Should not have excessive whitespace');
  });

  it('handles text exactly at maxLength boundary', () => {
    const text = 'X'.repeat(2000); // Exactly 2000 chars
    const result = splitTextAtSentences(text, 2000);

    assert.strictEqual(result.length, 1, 'Should not split text at exact limit');
    assert.strictEqual(result[0].length, 2000);
  });

  it('handles ellipsis correctly', () => {
    const text = 'The story continues... And then something happened. The end.';
    const result = splitTextAtSentences(text, 35);

    // Should not split at ellipsis
    assert.ok(result.some(chunk => chunk.includes('continues...')), 'Ellipsis should not cause split');
  });

  it('preserves internal whitespace in sentences', () => {
    const text = 'First sentence  with  multiple  spaces. Second sentence.';
    const result = splitTextAtSentences(text, 100);

    // Should preserve internal spacing within sentences
    assert.ok(result[0].includes('  '), 'Should preserve internal multiple spaces');
  });
});

describe('splitRichText', () => {
  it('returns unchanged array for short text elements', () => {
    const richTextArray = [
      {
        type: 'text',
        text: { content: 'Short text', link: null },
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        plain_text: 'Short text'
      }
    ];

    const result = splitRichText(richTextArray, 2000);

    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], richTextArray[0]);
  });

  it('splits rich text object with long content', () => {
    const longContent = 'A'.repeat(3000);
    const richTextArray = [
      {
        type: 'text',
        text: { content: longContent, link: null },
        annotations: { bold: true, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        plain_text: longContent
      }
    ];

    const result = splitRichText(richTextArray, 2000);

    assert.ok(result.length > 1, 'Should split long text');
    assert.ok(result.every(rt => rt.text.content.length <= 2000), 'All chunks should be under limit');
    assert.ok(result.every(rt => rt.annotations.bold === true), 'Should preserve bold annotation');
  });

  it('preserves annotations across splits', () => {
    const longContent = 'First sentence. '.repeat(200); // Create long text
    const richTextArray = [
      {
        type: 'text',
        text: { content: longContent, link: { url: 'https://example.com' } },
        annotations: { bold: true, italic: true, strikethrough: true, underline: true, code: false, color: 'blue' },
        plain_text: longContent
      }
    ];

    const result = splitRichText(richTextArray, 2000);

    assert.ok(result.length > 1, 'Should split into multiple chunks');

    // All chunks should have same annotations
    result.forEach(rt => {
      assert.strictEqual(rt.type, 'text');
      assert.strictEqual(rt.annotations.bold, true);
      assert.strictEqual(rt.annotations.italic, true);
      assert.strictEqual(rt.annotations.strikethrough, true);
      assert.strictEqual(rt.annotations.underline, true);
      assert.deepStrictEqual(rt.text.link, { url: 'https://example.com' });
      assert.strictEqual(rt.annotations.color, 'blue');
    });
  });

  it('processes mixed array with short and long elements', () => {
    const richTextArray = [
      {
        type: 'text',
        text: { content: 'Short', link: null },
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        plain_text: 'Short'
      },
      {
        type: 'text',
        text: { content: 'X'.repeat(3000), link: null },
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        plain_text: 'X'.repeat(3000)
      },
      {
        type: 'text',
        text: { content: 'Another short', link: null },
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        plain_text: 'Another short'
      }
    ];

    const result = splitRichText(richTextArray, 2000);

    // Should have at least 4 elements (1 short + 2+ splits + 1 short)
    assert.ok(result.length >= 4, 'Should have split long element');
    assert.strictEqual(result[0].text.content, 'Short', 'First short should be unchanged');
    assert.strictEqual(result[result.length - 1].text.content, 'Another short', 'Last short should be unchanged');
  });

  it('handles text exactly at 2000 chars (boundary condition)', () => {
    const exactContent = 'X'.repeat(2000);
    const richTextArray = [
      {
        type: 'text',
        text: { content: exactContent, link: null },
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        plain_text: exactContent
      }
    ];

    const result = splitRichText(richTextArray, 2000);

    assert.strictEqual(result.length, 1, 'Should not split text at exact limit');
    assert.strictEqual(result[0].text.content.length, 2000);
  });

  it('handles empty rich text array', () => {
    const result = splitRichText([], 2000);

    assert.strictEqual(result.length, 0);
  });

  it('splits text at sentence boundaries in rich text', () => {
    const content = 'First sentence here. Second sentence here. Third sentence here. Fourth sentence.';
    const richTextArray = [
      {
        type: 'text',
        text: { content, link: null },
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        plain_text: content
      }
    ];

    const result = splitRichText(richTextArray, 50);

    assert.ok(result.length > 1, 'Should split long text');

    // Each chunk should end with a complete sentence (period + optional space)
    const combined = result.map(rt => rt.text.content).join('');
    assert.ok(combined.includes('First sentence here.'), 'Should preserve sentences');
  });

  it('only splits elements that exceed maxLength', () => {
    const richTextArray = [
      {
        type: 'text',
        text: { content: 'A'.repeat(100), link: null },
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        plain_text: 'A'.repeat(100)
      },
      {
        type: 'text',
        text: { content: 'B'.repeat(100), link: null },
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        plain_text: 'B'.repeat(100)
      }
    ];

    const result = splitRichText(richTextArray, 2000);

    // Both elements are under limit, should remain unchanged
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].text.content.length, 100);
    assert.strictEqual(result[1].text.content.length, 100);
  });
});
