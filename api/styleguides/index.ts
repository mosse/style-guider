import type { VercelRequest, VercelResponse } from '@vercel/node';
import { chunkStyleGuide } from '../../lib/rag/chunker.js';
import { embedChunks } from '../../lib/rag/embedder.js';
import { createStyleGuide, listStyleGuides } from '../../lib/db/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      return await handleCreate(req, res);
    }

    if (req.method === 'GET') {
      return await handleList(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Style guide API error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

async function handleCreate(req: VercelRequest, res: VercelResponse) {
  const { name, text, deviceToken } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "name" field' });
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or empty "text" field' });
  }

  if (!deviceToken || typeof deviceToken !== 'string') {
    return res.status(400).json({ error: 'Missing "deviceToken" field' });
  }

  // Step 1: Chunk the style guide text
  const chunks = chunkStyleGuide(text);

  if (chunks.length === 0) {
    return res.status(400).json({ error: 'No valid content found in style guide text' });
  }

  // Step 2: Embed all chunks
  const embeddedChunks = await embedChunks(chunks);

  // Step 3: Store in Supabase
  const guide = await createStyleGuide(name, deviceToken, embeddedChunks);

  return res.status(201).json({
    id: guide.id,
    name: guide.name,
    chunkCount: guide.chunkCount,
    createdAt: guide.createdAt,
  });
}

async function handleList(req: VercelRequest, res: VercelResponse) {
  const deviceToken = req.query.deviceToken as string;

  if (!deviceToken) {
    return res.status(400).json({ error: 'Missing "deviceToken" query parameter' });
  }

  const guides = await listStyleGuides(deviceToken);

  return res.status(200).json({ guides });
}
