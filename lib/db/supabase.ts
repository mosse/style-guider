import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { StyleGuide, EmbeddedChunk, RetrievedChunk } from '../parser/types.js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    }
    client = createClient(url, key);
  }
  return client;
}

export async function createStyleGuide(
  name: string,
  deviceToken: string,
  chunks: EmbeddedChunk[]
): Promise<StyleGuide> {
  const db = getSupabaseClient();

  // Insert the style guide
  const { data: guide, error: guideError } = await db
    .from('style_guides')
    .insert({ name, device_token: deviceToken, chunk_count: chunks.length })
    .select()
    .single();

  if (guideError || !guide) {
    throw new Error(`Failed to create style guide: ${guideError?.message}`);
  }

  // Insert all chunks with embeddings
  const chunkRows = chunks.map((chunk) => ({
    guide_id: guide.id,
    section_title: chunk.sectionTitle,
    chunk_text: chunk.chunkText,
    chunk_index: chunk.chunkIndex,
    embedding: chunk.embedding,
  }));

  const { error: chunksError } = await db
    .from('style_guide_chunks')
    .insert(chunkRows);

  if (chunksError) {
    // Clean up the guide if chunk insertion fails
    await db.from('style_guides').delete().eq('id', guide.id);
    throw new Error(`Failed to store chunks: ${chunksError.message}`);
  }

  return {
    id: guide.id,
    name: guide.name,
    deviceToken: guide.device_token,
    chunkCount: guide.chunk_count,
    createdAt: guide.created_at,
  };
}

export async function listStyleGuides(deviceToken: string): Promise<StyleGuide[]> {
  const db = getSupabaseClient();

  const { data, error } = await db
    .from('style_guides')
    .select('id, name, device_token, chunk_count, created_at')
    .eq('device_token', deviceToken)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list style guides: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    deviceToken: row.device_token,
    chunkCount: row.chunk_count,
    createdAt: row.created_at,
  }));
}

export async function deleteStyleGuide(id: string): Promise<void> {
  const db = getSupabaseClient();

  const { error } = await db
    .from('style_guides')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete style guide: ${error.message}`);
  }
}

export async function findSimilarChunks(
  guideId: string,
  queryEmbedding: number[],
  limit: number = 10,
  similarityThreshold: number = 0.3
): Promise<RetrievedChunk[]> {
  const db = getSupabaseClient();

  // Use Supabase's RPC for vector similarity search
  const { data, error } = await db.rpc('match_style_guide_chunks', {
    query_embedding: queryEmbedding,
    match_guide_id: guideId,
    match_threshold: similarityThreshold,
    match_count: limit,
  });

  if (error) {
    throw new Error(`Failed to search chunks: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    chunkText: row.chunk_text,
    sectionTitle: row.section_title,
    similarity: row.similarity,
  }));
}
