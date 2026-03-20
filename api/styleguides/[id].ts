import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteStyleGuide } from '../../lib/db/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing style guide ID' });
  }

  try {
    if (req.method === 'DELETE') {
      await deleteStyleGuide(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Style guide delete error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
