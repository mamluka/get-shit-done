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

  // Step 1: Extract YAML front matter as collapsible toggle
  processed = transformFrontMatter(processed);

  // Step 2: Transform custom XML tags to GFM alerts (case-sensitive uppercase)
  processed = transformCustomTags(processed);

  // Step 3: Convert remaining XML tags to headings
  processed = transformXmlTagsToHeadings(processed);

  // Step 4: Transform details/summary to blockquote structure
  processed = transformDetailsSummary(processed);

  // Step 5: Wrap unsupported HTML in code blocks
  processed = wrapUnsupportedHtml(processed);

  return processed;
}

/**
 * Transform YAML front matter (---\n...\n---) into a blockquote structure
 * that convertQuotesToToggles will convert into a collapsible toggle block.
 *
 * @param {string} markdown - Raw markdown
 * @returns {string} - Markdown with front matter replaced by toggle-compatible blockquote
 */
function transformFrontMatter(markdown) {
  // Match --- delimited YAML at the very start of the file
  const fmRegex = /^---\n([\s\S]*?)\n---\n?/;
  const match = markdown.match(fmRegex);

  if (!match) {
    return markdown;
  }

  const yamlContent = match[1].trim();
  if (!yamlContent) {
    return markdown.slice(match[0].length);
  }

  // Build blockquote with bold first line (triggers toggle conversion)
  // and yaml code block inside
  const lines = [
    '> **Front Matter**',
    '>',
    '> ```yaml',
    ...yamlContent.split('\n').map(line => `> ${line}`),
    '> ```'
  ];

  return lines.join('\n') + '\n\n' + markdown.slice(match[0].length);
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
 * Convert remaining XML tags (not handled by GFM alert mapping) to markdown headings.
 * Top-level tags become ### headings, nested tags become bold paragraphs or #### headings
 * for content-heavy tags like <action>, <process>, <step>.
 *
 * @param {string} markdown - Markdown after GFM alert transform
 * @returns {string} - Markdown with XML tags converted to headings
 */
function transformXmlTagsToHeadings(markdown) {
  // Tags already handled by GFM alert mapping — skip these
  const alertTags = new Set(['domain', 'decisions', 'specifics', 'deferred']);
  // Standard HTML tags — skip these (handled by wrapUnsupportedHtml or Martian)
  const htmlTags = new Set([
    'br', 'img', 'a', 'em', 'strong', 'code', 'pre',
    'b', 'i', 'u', 's', 'del', 'ins', 'sup', 'sub',
    'hr', 'span', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'details', 'summary'
  ]);

  // Tags that get #### heading treatment when nested (content-heavy)
  const headingNestedTags = new Set(['action', 'process', 'step', 'context', 'execution_context']);

  // Process outermost tags first, then recurse into their content
  return processTagLevel(markdown, alertTags, htmlTags, headingNestedTags, 3);
}

/**
 * Process one level of XML tags, converting them to headings at the given depth.
 *
 * @param {string} text - Text to process
 * @param {Set} alertTags - Tags to skip (handled by GFM alerts)
 * @param {Set} htmlTags - Standard HTML tags to skip
 * @param {Set} headingNestedTags - Tags that get heading treatment when nested
 * @param {number} headingLevel - Current heading level (3 = ###, 4 = ####)
 * @returns {string} - Processed text
 */
function processTagLevel(text, alertTags, htmlTags, headingNestedTags, headingLevel) {
  // Match outermost custom XML tags: <tagname ...>content</tagname>
  // Non-greedy matching with balanced tag awareness
  const tagPattern = /<([\w_]+)(\s[^>]*)?>[\s\S]*?<\/\1>/g;

  return text.replace(tagPattern, (fullMatch, tagName, attrString) => {
    const lowerTag = tagName.toLowerCase();

    // Skip tags handled elsewhere
    if (alertTags.has(lowerTag) || htmlTags.has(lowerTag)) {
      return fullMatch;
    }

    // Extract content between opening and closing tags
    const openTagEnd = fullMatch.indexOf('>') + 1;
    const closeTagStart = fullMatch.lastIndexOf(`</${tagName}>`);
    const content = fullMatch.substring(openTagEnd, closeTagStart).trim();

    // Parse attributes (e.g., type="auto" → (auto))
    const attrSuffix = parseAttributes(attrString);

    // Format the tag name: snake_case → Title Case
    const formattedName = tagName
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Build heading
    const headingPrefix = '#'.repeat(Math.min(headingLevel, 3)); // Notion only supports h1-h3
    let heading;
    if (headingLevel <= 3) {
      heading = attrSuffix
        ? `${headingPrefix} ${formattedName} ${attrSuffix}`
        : `${headingPrefix} ${formattedName}`;
    } else {
      // Beyond h3 — use bold paragraph
      heading = attrSuffix
        ? `**${formattedName}** *${attrSuffix}*`
        : `**${formattedName}**`;
    }

    // Recursively process nested tags in the content
    const processedContent = processTagLevel(
      content,
      alertTags,
      htmlTags,
      headingNestedTags,
      headingLevel + 1
    );

    return `\n${heading}\n\n${processedContent}\n`;
  });
}

/**
 * Parse XML tag attributes into a readable suffix string.
 * e.g., ' type="auto" priority="high"' → '(auto, high)'
 *
 * @param {string|undefined} attrString - Raw attribute string from tag
 * @returns {string} - Formatted suffix or empty string
 */
function parseAttributes(attrString) {
  if (!attrString || !attrString.trim()) {
    return '';
  }

  const attrs = [];
  const attrRegex = /(\w+)="([^"]*)"/g;
  let match;

  while ((match = attrRegex.exec(attrString)) !== null) {
    attrs.push(match[2]);
  }

  return attrs.length > 0 ? `(${attrs.join(', ')})` : '';
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
