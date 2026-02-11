const { describe, it } = require('node:test');
const assert = require('node:assert');
const { preprocessMarkdown } = require('../../lib/notion/preprocessor.js');

describe('preprocessMarkdown', () => {
  describe('Custom XML tag conversion', () => {
    it('converts <domain> tag to GFM alert with uppercase NOTE', () => {
      const input = `<domain>
## Test Domain
Some content here
</domain>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('> [!NOTE]'), 'Should contain GFM alert header');
      assert.ok(output.includes('Domain'), 'Should include label');
      assert.ok(!output.includes('<domain>'), 'Should not contain original tag');
    });

    it('converts <decisions> tag to GFM alert with uppercase IMPORTANT', () => {
      const input = `<decisions>
## Key Decisions
Decision content
</decisions>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('> [!IMPORTANT]'), 'Should contain IMPORTANT alert');
      assert.ok(output.includes('Decisions'), 'Should include label');
    });

    it('converts <specifics> tag to GFM alert with uppercase TIP', () => {
      const input = `<specifics>
## Specific Details
Specific content
</specifics>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('> [!TIP]'), 'Should contain TIP alert');
      assert.ok(output.includes('Specifics'), 'Should include label');
    });

    it('converts <deferred> tag to GFM alert with uppercase CAUTION', () => {
      const input = `<deferred>
## Deferred Items
Deferred content
</deferred>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('> [!CAUTION]'), 'Should contain CAUTION alert');
      assert.ok(output.includes('Deferred'), 'Should include label');
    });

    it('preserves nested formatting inside custom tags', () => {
      const input = `<domain>
## Heading
- List item 1
- List item 2

\`\`\`javascript
const code = 'test';
\`\`\`
</domain>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('List item 1'), 'Should preserve lists');
      assert.ok(output.includes('```javascript'), 'Should preserve code blocks');
      assert.ok(output.includes("const code = 'test'"), 'Should preserve code content');
    });

    it('handles multiple custom tags in same document', () => {
      const input = `<domain>
Domain content
</domain>

Some text between

<decisions>
Decision content
</decisions>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('[!NOTE]'), 'Should have domain alert');
      assert.ok(output.includes('[!IMPORTANT]'), 'Should have decisions alert');
      assert.ok(output.includes('Some text between'), 'Should preserve content between tags');
    });

    it('handles empty content in tags gracefully', () => {
      const input = `<domain>
</domain>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('[!NOTE]'), 'Should still create alert for empty tag');
    });

    it('handles tags without headings', () => {
      const input = `<domain>
Just some plain content without a heading.
</domain>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('[!NOTE]'), 'Should create alert');
      assert.ok(output.includes('Domain'), 'Should use tag name as label');
      assert.ok(output.includes('Just some plain content'), 'Should include content');
    });
  });

  describe('Details/summary conversion', () => {
    it('converts details/summary with simple text content', () => {
      const input = `<details>
<summary>Click to expand</summary>
Hidden content here
</details>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('> **Click to expand**'), 'Should convert summary to bold blockquote');
      assert.ok(output.includes('> Hidden content here'), 'Should blockquote content');
      assert.ok(!output.includes('<details>'), 'Should not contain original tags');
    });

    it('converts details/summary with complex nested content', () => {
      const input = `<details>
<summary>Complex Content</summary>

## Nested heading

- List item 1
- List item 2

\`\`\`javascript
const test = true;
\`\`\`
</details>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('**Complex Content**'), 'Should convert summary');
      assert.ok(output.includes('## Nested heading'), 'Should preserve nested heading');
      assert.ok(output.includes('- List item'), 'Should preserve lists');
      assert.ok(output.includes('```javascript'), 'Should preserve code blocks');
    });

    it('handles multiple details/summary blocks', () => {
      const input = `<details>
<summary>First</summary>
Content 1
</details>

<details>
<summary>Second</summary>
Content 2
</details>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('**First**'), 'Should have first summary');
      assert.ok(output.includes('**Second**'), 'Should have second summary');
      assert.ok(output.includes('Content 1'), 'Should have first content');
      assert.ok(output.includes('Content 2'), 'Should have second content');
    });
  });

  describe('Unsupported HTML fallback', () => {
    it('wraps unsupported HTML in code block', () => {
      const input = `Some text

<custom-element>Unsupported</custom-element>

More text`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('```html'), 'Should wrap in HTML code block');
      assert.ok(output.includes('<custom-element>'), 'Should preserve HTML');
      assert.ok(output.includes('```'), 'Should close code block');
    });

    it('does not wrap standard markdown-compatible HTML', () => {
      const input = `Text with <br> and <img src="test.png"> and <a href="url">link</a>`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('<br>'), 'Should preserve <br>');
      assert.ok(output.includes('<img'), 'Should preserve <img>');
      assert.ok(output.includes('<a href'), 'Should preserve <a>');
      assert.ok(!output.includes('```html'), 'Should not wrap standard tags');
    });
  });

  describe('Pass-through elements', () => {
    it('passes through horizontal rules unchanged', () => {
      const input = `Text above

---

Text below`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('---'), 'Should preserve horizontal rule');
    });

    it('passes through checkboxes unchanged', () => {
      const input = `- [x] Completed task
- [ ] Incomplete task`;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('- [x]'), 'Should preserve checked checkbox');
      assert.ok(output.includes('- [ ]'), 'Should preserve unchecked checkbox');
    });

    it('passes through standard markdown unchanged', () => {
      const input = `# Heading 1
## Heading 2

**Bold** and *italic* and \`code\`

- List item 1
- List item 2

| Table | Header |
|-------|--------|
| Cell  | Data   |

\`\`\`javascript
const code = 'block';
\`\`\``;

      const output = preprocessMarkdown(input);

      assert.ok(output.includes('# Heading 1'), 'Should preserve H1');
      assert.ok(output.includes('## Heading 2'), 'Should preserve H2');
      assert.ok(output.includes('**Bold**'), 'Should preserve bold');
      assert.ok(output.includes('*italic*'), 'Should preserve italic');
      assert.ok(output.includes('`code`'), 'Should preserve inline code');
      assert.ok(output.includes('| Table'), 'Should preserve tables');
      assert.ok(output.includes('```javascript'), 'Should preserve code blocks');
    });
  });
});
