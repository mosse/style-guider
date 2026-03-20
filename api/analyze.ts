import type { VercelRequest, VercelResponse } from '@vercel/node';
import { retrieveRelevantChunks } from '../lib/rag/retriever.js';
import { buildAnalysisPrompt } from '../lib/rag/promptBuilder.js';
import { parseResponse } from '../lib/parser/responseParser.js';
import { verifyCitations } from '../lib/rag/citationVerifier.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, guideId, deviceToken } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or empty "text" field' });
    }

    if (!guideId || typeof guideId !== 'string') {
      return res.status(400).json({ error: 'Missing "guideId" field' });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    // Step 1: Retrieve relevant style guide chunks
    const retrievedChunks = await retrieveRelevantChunks(text, guideId);

    if (retrievedChunks.length === 0) {
      return res.status(200).json({
        segments: [text],
        retrievedChunks: [],
        citationStats: { totalSuggestions: 0, verifiedCitations: 0, strippedCitations: 0 },
        message: 'No relevant style guide sections found for this text',
      });
    }

    // Step 2: Build the prompt
    const prompt = buildAnalysisPrompt(text, retrievedChunks);

    // Step 3: Call Claude API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    try {
      const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
          max_tokens: MAX_TOKENS,
          temperature: 0.3,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!anthropicResponse.ok) {
        const errorData = await anthropicResponse.json().catch(() => ({}));
        throw new Error(
          (errorData as any).error?.message ||
            `Anthropic API error: ${anthropicResponse.statusText}`
        );
      }

      const data = await anthropicResponse.json();
      const rawText = (data as any).content?.[0]?.text;

      if (!rawText) {
        throw new Error('No text content in Anthropic response');
      }

      // Step 4: Parse the response
      const segments = parseResponse(rawText);

      // Step 5: Verify citations
      const { segments: verifiedSegments, stats } = verifyCitations(
        segments,
        retrievedChunks
      );

      return res.status(200).json({
        segments: verifiedSegments,
        retrievedChunks: retrievedChunks.map((c) => ({
          sectionTitle: c.sectionTitle,
          similarity: c.similarity,
          preview: c.chunkText.substring(0, 100) + '...',
        })),
        citationStats: stats,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return res.status(504).json({ error: 'Request timed out' });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
