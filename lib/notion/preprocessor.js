/**
 * Preprocessor for GSD-specific markdown patterns.
 * Transforms custom XML tags, details/summary, and unsupported HTML
 * into standard markdown that @tryfabric/martian can convert.
 */

/**
 * Preprocess markdown to handle GSD-specific patterns.
 * @param {string} markdown - Raw markdown content
 * @returns {string} - Preprocessed markdown ready for Martian
 */
function preprocessMarkdown(markdown) {
  let processed = markdown;

  // Step 1: Transform custom XML tags to GFM alerts (case-sensitive uppercase)
  processed = transformCustomTags(processed);

  // Step 2: Transform details/summary to blockquote structure
  processed = transformDetailsSummary(processed);

  // Step 3: Wrap unsupported HTML in code blocks
  processed = wrapUnsupportedHtml(processed);

  return processed;
}

/**
 * Transform GSD custom XML tags to GFM alert syntax.
 * Maps: domain→NOTE, decisions→IMPORTANT, specifics→TIP, deferred→CAUTION
 */
function transformCustomTags(markdown) {
  const tagMapping = {
    domain: { alert: 'NOTE', label: 'Domain' },
    decisions: { alert: 'IMPORTANT', label: 'Decisions' },
    specifics: { alert: 'TIP', label: 'Specifics' },
    deferred: { alert: 'CAUTION', label: 'Deferred' }
  };

  let processed = markdown;

  for (const [tag, config] of Object.entries(tagMapping)) {
    // Pattern: <tag>\n...content...\n</tag> (multiline, dotall)
    // Made more flexible to handle empty content
    const regex = new RegExp(`<${tag}>\\s*([\\s\\S]*?)</${tag}>`, 'g');

    processed = processed.replace(regex, (match, content) => {
      // Trim content
      const trimmedContent = content.trim();

      // Create GFM alert blockquote
      // Format: > [!ALERT]\n> **Label**\n>\n> content lines
      if (!trimmedContent) {
        // Empty tag - just create alert with label
        return `> [!${config.alert}]\n> **${config.label}**`;
      }

      const lines = trimmedContent.split('\n');
      const quotedLines = lines.map(line => line ? `> ${line}` : '>');

      return `> [!${config.alert}]\n> **${config.label}**\n>\n${quotedLines.join('\n')}`;
    });
  }

  return processed;
}

/**
 * Transform <details><summary>...</summary>content</details> to blockquote.
 * Martian will convert to quote block; post-processor (Plan 03) converts to toggle.
 */
function transformDetailsSummary(markdown) {
  // Pattern: <details>\n<summary>Title</summary>\ncontent\n</details>
  // Handle whitespace variations and multiline content
  const regex = /<details>\s*<summary>([^<]+)<\/summary>\s*([\s\S]*?)<\/details>/g;

  return markdown.replace(regex, (match, summary, content) => {
    // Trim summary and content
    const trimmedSummary = summary.trim();
    const trimmedContent = content.trim();

    // Create blockquote structure
    // Format: > **Summary**\n>\n> content lines
    const lines = trimmedContent.split('\n');
    const quotedLines = lines.map(line => line ? `> ${line}` : '>');

    return `> **${trimmedSummary}**\n>\n${quotedLines.join('\n')}`;
  });
}

/**
 * Wrap unsupported HTML elements in fenced code blocks.
 * Excludes standard markdown-compatible tags: br, img, a, em, strong, code, pre
 */
function wrapUnsupportedHtml(markdown) {
  // Define supported HTML tags (markdown-compatible)
  const supportedTags = [
    'br', 'img', 'a', 'em', 'strong', 'code', 'pre',
    'b', 'i', 'u', 's', 'del', 'ins', 'sup', 'sub',
    'hr', 'span', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote'
  ];

  // Pattern: Match HTML tags that are NOT in supported list
  // This is a simplified approach - matches opening/closing tags
  const htmlTagPattern = /<(\/?)([\w-]+)(?:\s[^>]*)?>/g;

  let result = markdown;
  const unsupportedBlocks = [];

  // Find unsupported HTML blocks
  let match;
  while ((match = htmlTagPattern.exec(markdown)) !== null) {
    const [fullMatch, closingSlash, tagName] = match;

    // Skip if it's a supported tag
    if (supportedTags.includes(tagName.toLowerCase())) {
      continue;
    }

    // Check if this is an opening tag for an unsupported element
    if (!closingSlash) {
      // Find the corresponding closing tag
      const closingPattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
      const blockMatch = markdown.slice(match.index).match(closingPattern);

      if (blockMatch) {
        unsupportedBlocks.push({
          full: blockMatch[0],
          index: match.index,
          length: blockMatch[0].length
        });
      }
    }
  }

  // Replace unsupported blocks with code-fenced versions (in reverse order to maintain indices)
  for (let i = unsupportedBlocks.length - 1; i >= 0; i--) {
    const block = unsupportedBlocks[i];
    const before = result.substring(0, block.index);
    const after = result.substring(block.index + block.length);

    result = `${before}\`\`\`html\n${block.full}\n\`\`\`${after}`;
  }

  return result;
}

module.exports = {
  preprocessMarkdown
};
