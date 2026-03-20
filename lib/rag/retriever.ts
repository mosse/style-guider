import { embedQuery } from './embedder.js';
import { findSimilarChunks } from '../db/supabase.js';
import type { RetrievedChunk } from '../parser/types.js';

const DEFAULT_TOP_K = 10;
const DEFAULT_SIMILARITY_THRESHOLD = 0.3;

export interface RetrievalOptions {
  topK?: number;
  similarityThreshold?: number;
  voyageApiKey?: string;
}

/**
 * Retrieves the most relevant style guide chunks for a given user text.
 *
 * 1. Embeds the user text using Voyage AI
 * 2. Queries Supabase pgvector for similar chunks
 * 3. Returns chunks sorted by similarity (highest first)
 */
export async function retrieveRelevantChunks(
  userText: string,
  guideId: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const {
    topK = DEFAULT_TOP_K,
    similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
    voyageApiKey,
  } = options;

  // Step 1: Embed the user text
  const queryEmbedding = await embedQuery(userText, voyageApiKey);

  // Step 2: Search for similar chunks in Supabase
  const chunks = await findSimilarChunks(
    guideId,
    queryEmbedding,
    topK,
    similarityThreshold
  );

  return chunks;
}
