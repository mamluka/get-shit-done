const { test, describe } = require('node:test');
const assert = require('node:assert');
const { flattenDeepNesting, convertQuotesToToggles } = require('../../lib/notion/block-utils.js');

describe('flattenDeepNesting', () => {
  test('2-level nesting passes through unchanged', () => {
    const blocks = [
      {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Parent' } }],
          children: [
            {
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{ type: 'text', text: { content: 'Child' } }],
                children: []
              }
            }
          ]
        }
      }
    ];

    const result = flattenDeepNesting(blocks, 2);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].bulleted_list_item.children.length, 1);
    assert.strictEqual(result[0].bulleted_list_item.children[0].bulleted_list_item.rich_text[0].text.content, 'Child');
  });

  test('3-level nesting flattens third level to second with └ marker', () => {
    const blocks = [
      {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Parent' } }],
          children: [
            {
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{ type: 'text', text: { content: 'Child' } }],
                children: [
                  {
                    type: 'bulleted_list_item',
                    bulleted_list_item: {
                      rich_text: [{ type: 'text', text: { content: 'Grandchild' } }],
                      children: []
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ];

    const result = flattenDeepNesting(blocks, 2);

    // Parent should have 2 children after flattening
    assert.strictEqual(result[0].bulleted_list_item.children.length, 2);

    // First child should be original Child (no marker)
    const firstChild = result[0].bulleted_list_item.children[0];
    assert.strictEqual(firstChild.bulleted_list_item.rich_text[0].text.content, 'Child');

    // Grandchild should be promoted to sibling of Child with └ marker
    const secondChild = result[0].bulleted_list_item.children[1];
    assert.strictEqual(secondChild.bulleted_list_item.rich_text[0].text.content, '└ Grandchild');
  });

  test('4-level nesting recursively flattens to 2 levels', () => {
    const blocks = [
      {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'L1' } }],
          children: [
            {
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{ type: 'text', text: { content: 'L2' } }],
                children: [
                  {
                    type: 'bulleted_list_item',
                    bulleted_list_item: {
                      rich_text: [{ type: 'text', text: { content: 'L3' } }],
                      children: [
                        {
                          type: 'bulleted_list_item',
                          bulleted_list_item: {
                            rich_text: [{ type: 'text', text: { content: 'L4' } }],
                            children: []
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ];

    const result = flattenDeepNesting(blocks, 2);

    assert.strictEqual(result[0].bulleted_list_item.children.length, 3);
    assert.strictEqual(result[0].bulleted_list_item.children[0].bulleted_list_item.rich_text[0].text.content, 'L2');
    assert.strictEqual(result[0].bulleted_list_item.children[1].bulleted_list_item.rich_text[0].text.content, '└ L3');
    assert.strictEqual(result[0].bulleted_list_item.children[2].bulleted_list_item.rich_text[0].text.content, '└ L4');
  });

  test('mixed block types (bulleted + numbered + to_do) all flatten correctly', () => {
    const blocks = [
      {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Bullet' } }],
          children: [
            {
              type: 'numbered_list_item',
              numbered_list_item: {
                rich_text: [{ type: 'text', text: { content: 'Number' } }],
                children: [
                  {
                    type: 'to_do',
                    to_do: {
                      rich_text: [{ type: 'text', text: { content: 'Todo' } }],
                      checked: false,
                      children: []
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ];

    const result = flattenDeepNesting(blocks, 2);

    assert.strictEqual(result[0].bulleted_list_item.children.length, 2);
    assert.strictEqual(result[0].bulleted_list_item.children[1].to_do.rich_text[0].text.content, '└ Todo');
  });

  test('blocks without children pass through unchanged', () => {
    const blocks = [
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'Simple paragraph' } }]
        }
      },
      {
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: 'Heading' } }]
        }
      }
    ];

    const result = flattenDeepNesting(blocks, 2);

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].paragraph.rich_text[0].text.content, 'Simple paragraph');
    assert.strictEqual(result[1].heading_1.rich_text[0].text.content, 'Heading');
  });

  test('empty children arrays handled gracefully', () => {
    const blocks = [
      {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Parent' } }],
          children: []
        }
      }
    ];

    const result = flattenDeepNesting(blocks, 2);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].bulleted_list_item.children.length, 0);
  });

  test('└ marker prepended to existing rich_text content', () => {
    const blocks = [
      {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Parent' } }],
          children: [
            {
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{ type: 'text', text: { content: 'Child' } }],
                children: [
                  {
                    type: 'bulleted_list_item',
                    bulleted_list_item: {
                      rich_text: [
                        { type: 'text', text: { content: 'Existing content' }, annotations: { bold: true } }
                      ],
                      children: []
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ];

    const result = flattenDeepNesting(blocks, 2);

    const flattenedChild = result[0].bulleted_list_item.children[1];
    assert.strictEqual(flattenedChild.bulleted_list_item.rich_text[0].text.content, '└ Existing content');
    assert.strictEqual(flattenedChild.bulleted_list_item.rich_text[0].annotations.bold, true);
  });
});

describe('convertQuotesToToggles', () => {
  test('blockquote with bold first child converts to toggle block', () => {
    const blocks = [
      {
        type: 'quote',
        quote: {
          rich_text: [
            { type: 'text', text: { content: 'Summary Text' }, annotations: { bold: true } }
          ],
          children: [
            {
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: 'Details content' } }]
              }
            }
          ]
        }
      }
    ];

    const result = convertQuotesToToggles(blocks);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].type, 'toggle');
    assert.strictEqual(result[0].toggle.rich_text[0].text.content, 'Summary Text');
    assert.strictEqual(result[0].toggle.rich_text[0].annotations.bold, true);
    assert.strictEqual(result[0].toggle.color, 'default');
    assert.strictEqual(result[0].toggle.children.length, 1);
    assert.strictEqual(result[0].toggle.children[0].paragraph.rich_text[0].text.content, 'Details content');
  });

  test('regular blockquote (no bold first child) stays as blockquote', () => {
    const blocks = [
      {
        type: 'quote',
        quote: {
          rich_text: [
            { type: 'text', text: { content: 'Regular quote' } }
          ],
          children: []
        }
      }
    ];

    const result = convertQuotesToToggles(blocks);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].type, 'quote');
    assert.strictEqual(result[0].quote.rich_text[0].text.content, 'Regular quote');
  });

  test('toggle children preserve their content and structure', () => {
    const blocks = [
      {
        type: 'quote',
        quote: {
          rich_text: [
            { type: 'text', text: { content: 'Details' }, annotations: { bold: true } }
          ],
          children: [
            {
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: 'First para' } }]
              }
            },
            {
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{ type: 'text', text: { content: 'List item' } }],
                children: []
              }
            },
            {
              type: 'code',
              code: {
                rich_text: [{ type: 'text', text: { content: 'code()' } }],
                language: 'javascript'
              }
            }
          ]
        }
      }
    ];

    const result = convertQuotesToToggles(blocks);

    assert.strictEqual(result[0].type, 'toggle');
    assert.strictEqual(result[0].toggle.children.length, 3);
    assert.strictEqual(result[0].toggle.children[0].paragraph.rich_text[0].text.content, 'First para');
    assert.strictEqual(result[0].toggle.children[1].bulleted_list_item.rich_text[0].text.content, 'List item');
    assert.strictEqual(result[0].toggle.children[2].code.rich_text[0].text.content, 'code()');
  });

  test('blockquote without rich_text stays as blockquote', () => {
    const blocks = [
      {
        type: 'quote',
        quote: {
          rich_text: [],
          children: []
        }
      }
    ];

    const result = convertQuotesToToggles(blocks);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].type, 'quote');
  });
});
