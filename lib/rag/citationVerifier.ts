import type { Segment, Change, RetrievedChunk, CitationStats } from '../parser/types.js';
import { isChange } from '../parser/types.js';

/**
 * Normalizes whitespace for comparison: collapses multiple spaces/newlines
 * into single spaces, trims, and lowercases.
 */
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Checks if a citation is a (fuzzy) substring of any retrieved chunk.
 * Uses normalized text comparison to handle minor whitespace differences.
 *
 * Returns true if the normalized citation appears as a substring of
 * any normalized chunk text, or if the similarity is above the threshold.
 */
function isCitationVerified(
  citation: string,
  chunks: RetrievedChunk[]
): boolean {
  if (!citation || !citation.trim()) return false;

  const normalizedCitation = normalize(citation);
  if (normalizedCitation.length < 10) return false; // Too short to be meaningful

  for (const chunk of chunks) {
    const normalizedChunk = normalize(chunk.chunkText);

    // Exact substring match (normalized)
    if (normalizedChunk.includes(normalizedCitation)) {
      return true;
    }

    // Fuzzy match: check if most words from the citation appear in the chunk
    // This handles minor punctuation or formatting differences
    const citationWords = normalizedCitation.split(' ').filter(w => w.length > 2);
    if (citationWords.length === 0) continue;

    const matchingWords = citationWords.filter(word => normalizedChunk.includes(word));
    const matchRatio = matchingWords.length / citationWords.length;

    if (matchRatio >= 0.9) {
      return true;
    }
  }

  return false;
}

/**
 * Verifies citations in the parsed segments against the retrieved chunks.
 * Strips suggestions whose citations cannot be verified.
 *
 * Returns the filtered segments and citation statistics.
 */
export function verifyCitations(
  segments: Segment[],
  retrievedChunks: RetrievedChunk[]
): { segments: Segment[]; stats: CitationStats } {
  let totalSuggestions = 0;
  let verifiedCitations = 0;
  let strippedCitations = 0;

  const filteredSegments: Segment[] = [];

  for (const segment of segments) {
    if (!isChange(segment)) {
      filteredSegments.push(segment);
      continue;
    }

    totalSuggestions++;

    // If no citation provided, strip the suggestion
    if (!segment.citation) {
      strippedCitations++;
      // Keep the original text instead
      filteredSegments.push(segment.original);
      continue;
    }

    // Verify the citation against retrieved chunks
    if (isCitationVerified(segment.citation, retrievedChunks)) {
      verifiedCitations++;
      filteredSegments.push(segment);
    } else {
      strippedCitations++;
      // Replace with original text
      filteredSegments.push(segment.original);
    }
  }

  return {
    segments: filteredSegments,
    stats: {
      totalSuggestions,
      verifiedCitations,
      strippedCitations,
    },
  };
}

// Export for testing
export { isCitationVerified, normalize };
