import type { Chunk } from '../parser/types.js';

// We use a simple approximation: ~4 chars per token for English text.
// For precise counting, js-tiktoken can be used, but this is fast and sufficient for chunking.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const MIN_CHUNK_TOKENS = 100;
const MAX_CHUNK_TOKENS = 500;
const OVERLAP_TOKENS = 50;

/**
 * Detects whether a line is a section heading.
 * Heuristics:
 * - Markdown headings (## ...)
 * - Short lines (<60 chars) that are uppercase or title-case, followed by content
 * - Numbered headings (1. ..., Chapter 1: ...)
 * - Lines ending with a colon that are short
 */
function isSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Markdown headings
  if (/^#{1,4}\s+\S/.test(trimmed)) return true;

  // All-caps line (at least 3 chars, no lowercase)
  if (trimmed.length >= 3 && trimmed.length < 60 && /^[A-Z][A-Z\s\d,&'-]+$/.test(trimmed)) return true;

  // Numbered headings: "1.", "1.1", "Chapter 1:", etc.
  if (/^(\d+\.?\d*\.?\s+|Chapter\s+\d+)/i.test(trimmed) && trimmed.length < 80) return true;

  // Short line ending with colon (likely a heading)
  if (trimmed.length < 60 && trimmed.endsWith(':')) return true;

  // Title-case short line (most words capitalized, not a full sentence)
  if (trimmed.length < 60 && !trimmed.endsWith('.') && !trimmed.endsWith(',')) {
    const words = trimmed.split(/\s+/);
    if (words.length >= 1 && words.length <= 8) {
      const capitalizedWords = words.filter(w => /^[A-Z]/.test(w));
      if (capitalizedWords.length / words.length >= 0.6) return true;
    }
  }

  return false;
}

/**
 * Strips markdown heading markers from a heading line.
 */
function cleanHeading(line: string): string {
  return line.trim()
    .replace(/^#+\s+/, '')      // Remove markdown #
    .replace(/:$/, '')           // Remove trailing colon
    .trim();
}

interface Section {
  title: string | null;
  content: string;
}

/**
 * Splits text into sections based on detected headings.
 */
function splitIntoSections(text: string): Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [];
  let currentTitle: string | null = null;
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isSectionHeading(line)) {
      // Save previous section if it has content
      if (currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        if (content) {
          sections.push({ title: currentTitle, content });
        }
      }
      currentTitle = cleanHeading(line);
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentContent.length > 0) {
    const content = currentContent.join('\n').trim();
    if (content) {
      sections.push({ title: currentTitle, content });
    }
  }

  // If no sections were detected, treat entire text as one section
  if (sections.length === 0 && text.trim()) {
    sections.push({ title: null, content: text.trim() });
  }

  return sections;
}

/**
 * Splits a section's content into paragraph-based chunks.
 * Respects token limits and adds overlap between chunks.
 */
function chunkSection(section: Section): Chunk[] {
  const paragraphs = section.content.split(/\n\s*\n/).filter(p => p.trim());
  const chunks: Chunk[] = [];
  let currentChunkParagraphs: string[] = [];
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // If a single paragraph exceeds max, split it by sentences
    if (paragraphTokens > MAX_CHUNK_TOKENS) {
      // Flush current buffer first
      if (currentChunkParagraphs.length > 0) {
        chunks.push({
          sectionTitle: section.title,
          chunkText: currentChunkParagraphs.join('\n\n'),
          chunkIndex: 0, // Will be assigned later
        });
        currentChunkParagraphs = [];
        currentTokens = 0;
      }

      // Split long paragraph by sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+\s*/g) || [paragraph];
      let sentenceBuffer: string[] = [];
      let sentenceTokens = 0;

      for (const sentence of sentences) {
        const sTokens = estimateTokens(sentence);
        if (sentenceTokens + sTokens > MAX_CHUNK_TOKENS && sentenceBuffer.length > 0) {
          chunks.push({
            sectionTitle: section.title,
            chunkText: sentenceBuffer.join(''),
            chunkIndex: 0,
          });
          sentenceBuffer = [];
          sentenceTokens = 0;
        }
        sentenceBuffer.push(sentence);
        sentenceTokens += sTokens;
      }

      if (sentenceBuffer.length > 0) {
        chunks.push({
          sectionTitle: section.title,
          chunkText: sentenceBuffer.join(''),
          chunkIndex: 0,
        });
      }
      continue;
    }

    // If adding this paragraph would exceed max, flush
    if (currentTokens + paragraphTokens > MAX_CHUNK_TOKENS && currentChunkParagraphs.length > 0) {
      chunks.push({
        sectionTitle: section.title,
        chunkText: currentChunkParagraphs.join('\n\n'),
        chunkIndex: 0,
      });
      currentChunkParagraphs = [];
      currentTokens = 0;
    }

    currentChunkParagraphs.push(paragraph);
    currentTokens += paragraphTokens;
  }

  // Flush remaining
  if (currentChunkParagraphs.length > 0) {
    chunks.push({
      sectionTitle: section.title,
      chunkText: currentChunkParagraphs.join('\n\n'),
      chunkIndex: 0,
    });
  }

  return chunks;
}

/**
 * Merges chunks that are too small with their neighbors.
 */
function mergeSmallChunks(chunks: Chunk[]): Chunk[] {
  if (chunks.length <= 1) return chunks;

  const merged: Chunk[] = [];
  let i = 0;

  while (i < chunks.length) {
    const chunk = chunks[i];
    const tokens = estimateTokens(chunk.chunkText);

    if (tokens < MIN_CHUNK_TOKENS && i + 1 < chunks.length) {
      // Merge with next chunk if same section
      const next = chunks[i + 1];
      if (chunk.sectionTitle === next.sectionTitle) {
        merged.push({
          sectionTitle: chunk.sectionTitle,
          chunkText: chunk.chunkText + '\n\n' + next.chunkText,
          chunkIndex: 0,
        });
        i += 2;
        continue;
      }
    }

    merged.push(chunk);
    i++;
  }

  return merged;
}

/**
 * Adds overlap between consecutive chunks in the same section.
 */
function addOverlap(chunks: Chunk[]): Chunk[] {
  if (chunks.length <= 1) return chunks;

  const overlapChars = OVERLAP_TOKENS * 4; // approximate

  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;

    const prev = chunks[i - 1];
    if (prev.sectionTitle !== chunk.sectionTitle) return chunk;

    // Take the last ~overlapChars from the previous chunk
    const prevText = prev.chunkText;
    const overlapText = prevText.slice(-overlapChars);

    // Find a clean break point (sentence or paragraph boundary)
    const breakPoint = overlapText.search(/[.!?]\s+/);
    const cleanOverlap = breakPoint >= 0 ? overlapText.slice(breakPoint + 1).trim() : '';

    if (!cleanOverlap) return chunk;

    return {
      ...chunk,
      chunkText: cleanOverlap + '\n\n' + chunk.chunkText,
    };
  });
}

/**
 * Main chunking function. Takes raw style guide text and returns
 * an array of chunks with section metadata.
 */
export function chunkStyleGuide(text: string): Chunk[] {
  if (!text || !text.trim()) return [];

  // Step 1: Split into sections
  const sections = splitIntoSections(text);

  // Step 2: Chunk each section
  let allChunks: Chunk[] = [];
  for (const section of sections) {
    const sectionChunks = chunkSection(section);
    allChunks.push(...sectionChunks);
  }

  // Step 3: Merge small chunks
  allChunks = mergeSmallChunks(allChunks);

  // Step 4: Add overlap
  allChunks = addOverlap(allChunks);

  // Step 5: Assign chunk indices
  allChunks = allChunks.map((chunk, i) => ({
    ...chunk,
    chunkIndex: i,
  }));

  return allChunks;
}

// Export internals for testing
export { isSectionHeading, splitIntoSections, estimateTokens };
