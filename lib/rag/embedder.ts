import type { Chunk, EmbeddedChunk } from '../parser/types.js';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3-lite';
const BATCH_SIZE = 20;

interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { total_tokens: number };
}

/**
 * Calls the Voyage AI API to generate embeddings for a batch of texts.
 */
async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
      input_type: 'document',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Voyage API error (${response.status}): ${errorBody}`
    );
  }

  const data: VoyageEmbeddingResponse = await response.json();

  // Sort by index to maintain order
  const sorted = [...data.data].sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}

/**
 * Embeds an array of chunks using Voyage AI.
 * Batches requests to stay within API limits.
 * Prepends section title to chunk text for better embedding quality.
 */
export async function embedChunks(
  chunks: Chunk[],
  apiKey?: string
): Promise<EmbeddedChunk[]> {
  const key = apiKey ?? process.env.VOYAGE_API_KEY;
  if (!key) {
    throw new Error('Missing VOYAGE_API_KEY environment variable');
  }

  if (chunks.length === 0) return [];

  // Prepare texts with section title prefix
  const texts = chunks.map((chunk) => {
    const prefix = chunk.sectionTitle ? `[${chunk.sectionTitle}] ` : '';
    return prefix + chunk.chunkText;
  });

  // Process in batches
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatch(batch, key);
    allEmbeddings.push(...embeddings);
  }

  // Combine chunks with their embeddings
  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: allEmbeddings[i],
  }));
}

/**
 * Embeds a single query text for similarity search.
 * Uses input_type: 'query' for better retrieval performance.
 */
export async function embedQuery(
  text: string,
  apiKey?: string
): Promise<number[]> {
  const key = apiKey ?? process.env.VOYAGE_API_KEY;
  if (!key) {
    throw new Error('Missing VOYAGE_API_KEY environment variable');
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: [text],
      input_type: 'query',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Voyage API error (${response.status}): ${errorBody}`
    );
  }

  const data: VoyageEmbeddingResponse = await response.json();
  return data.data[0].embedding;
}
