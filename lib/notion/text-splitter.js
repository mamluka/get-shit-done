/**
 * Text splitting utilities for Notion's 2000-character rich text limit.
 * Uses Intl.Segmenter for sentence-boundary detection (built-in Node 16+).
 */

/**
 * Split text at sentence boundaries when exceeding maxLength.
 * Falls back to word-boundary splitting for single oversized sentences.
 *
 * @param {string} text - Plain text string to split
 * @param {number} maxLength - Maximum length per chunk (default: 2000)
 * @returns {string[]} - Array of text chunks, each under maxLength
 */
function splitTextAtSentences(text, maxLength = 2000) {
  // Handle empty input
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Handle text under limit
  if (text.length <= maxLength) {
    return [text];
  }

  // Use Intl.Segmenter for sentence boundaries
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const segments = Array.from(segmenter.segment(text));

  const chunks = [];
  let currentChunk = '';

  for (const { segment } of segments) {
    const trimmedSegment = segment.trim();

    // If a single segment exceeds limit, split at word boundaries
    if (trimmedSegment.length > maxLength) {
      // Flush any existing chunk first
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // Split this oversized segment at word boundaries
      const wordChunks = splitAtWordBoundaries(trimmedSegment, maxLength);
      chunks.push(...wordChunks);
    }
    // If adding this segment would exceed limit
    else if (currentChunk && (currentChunk + ' ' + trimmedSegment).length > maxLength) {
      // Flush current chunk
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSegment;
    }
    // Normal case: add segment to current chunk
    else {
      if (currentChunk) {
        currentChunk += ' ' + trimmedSegment;
      } else {
        currentChunk = trimmedSegment;
      }
    }
  }

  // Flush remaining chunk
  if (currentChunk) {
    // Check if remaining chunk itself exceeds limit
    if (currentChunk.length > maxLength) {
      const wordChunks = splitAtWordBoundaries(currentChunk, maxLength);
      chunks.push(...wordChunks);
    } else {
      chunks.push(currentChunk.trim());
    }
  }

  return chunks;
}

/**
 * Split text at word boundaries (fallback for oversized sentences).
 * If a single word exceeds maxLength, splits at character boundaries.
 *
 * @param {string} text - Text to split
 * @param {number} maxLength - Maximum length per chunk
 * @returns {string[]} - Array of chunks split at word boundaries
 */
function splitAtWordBoundaries(text, maxLength) {
  // If text is still > maxLength and has no spaces, split at character boundaries
  if (text.length > maxLength && !text.includes(' ')) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxLength) {
      chunks.push(text.substring(i, i + maxLength));
    }
    return chunks;
  }

  const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
  const segments = Array.from(segmenter.segment(text));

  const chunks = [];
  let currentChunk = '';

  for (const { segment } of segments) {
    // If this single segment exceeds limit, split it character-wise
    if (segment.length > maxLength) {
      // Flush current chunk first
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // Split oversized segment character-wise
      for (let i = 0; i < segment.length; i += maxLength) {
        chunks.push(segment.substring(i, i + maxLength));
      }
    }
    // If adding this segment would exceed limit
    else if ((currentChunk + segment).length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = segment;
    }
    // Normal case
    else {
      currentChunk += segment;
    }
  }

  // Flush remaining chunk
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Process Notion rich_text array, splitting long text elements.
 * Preserves annotations, links, and other properties across splits.
 *
 * @param {Array} richTextArray - Array of Notion rich_text objects
 * @param {number} maxLength - Maximum content length per object (default: 2000)
 * @returns {Array} - Processed array with long elements split
 */
function splitRichText(richTextArray, maxLength = 2000) {
  // Handle empty input
  if (!richTextArray || richTextArray.length === 0) {
    return [];
  }

  const result = [];

  for (const richTextObj of richTextArray) {
    const content = richTextObj.text?.content || richTextObj.plain_text || '';

    // If content is under limit, keep as-is
    if (content.length <= maxLength) {
      result.push(richTextObj);
      continue;
    }

    // Split content at sentence boundaries
    const chunks = splitTextAtSentences(content, maxLength);

    // Create new rich_text objects for each chunk with preserved annotations
    for (const chunk of chunks) {
      result.push({
        type: richTextObj.type,
        text: {
          content: chunk,
          link: richTextObj.text?.link || null
        },
        annotations: { ...richTextObj.annotations },
        plain_text: chunk
      });
    }
  }

  return result;
}

module.exports = {
  splitTextAtSentences,
  splitRichText
};
