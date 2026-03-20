import { describe, it, expect, vi, beforeEach } from 'vitest';
import { embedChunks, embedQuery } from '../embedder.js';
import type { Chunk } from '../../parser/types.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockEmbeddingResponse = (count: number) => ({
  data: Array.from({ length: count }, (_, i) => ({
    embedding: new Array(512).fill(0.1),
    index: i,
  })),
  usage: { total_tokens: count * 10 },
});

beforeEach(() => {
  vi.stubEnv('VOYAGE_API_KEY', 'test-key');
  mockFetch.mockReset();
});

describe('embedChunks', () => {
  it('returns empty array for empty input', async () => {
    const result = await embedChunks([]);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('embeds chunks and returns with embeddings', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEmbeddingResponse(2)),
    });

    const chunks: Chunk[] = [
      { sectionTitle: 'Numbers', chunkText: 'Spell out one to nine.', chunkIndex: 0 },
      { sectionTitle: 'Hyphens', chunkText: 'Use hyphens.', chunkIndex: 1 },
    ];

    const result = await embedChunks(chunks, 'test-key');

    expect(result).toHaveLength(2);
    expect(result[0].embedding).toHaveLength(512);
    expect(result[0].chunkText).toBe('Spell out one to nine.');
    expect(result[1].sectionTitle).toBe('Hyphens');
  });

  it('prepends section title to text for embedding', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEmbeddingResponse(1)),
    });

    const chunks: Chunk[] = [
      { sectionTitle: 'Numbers', chunkText: 'Use figures.', chunkIndex: 0 },
    ];

    await embedChunks(chunks, 'test-key');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input[0]).toBe('[Numbers] Use figures.');
  });

  it('batches large sets of chunks', async () => {
    // 25 chunks should result in 2 batches (20 + 5)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEmbeddingResponse(20)),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEmbeddingResponse(5)),
      });

    const chunks: Chunk[] = Array.from({ length: 25 }, (_, i) => ({
      sectionTitle: null,
      chunkText: `Chunk ${i}`,
      chunkIndex: i,
    }));

    const result = await embedChunks(chunks, 'test-key');
    expect(result).toHaveLength(25);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    const chunks: Chunk[] = [
      { sectionTitle: null, chunkText: 'Test.', chunkIndex: 0 },
    ];

    await expect(embedChunks(chunks, 'test-key')).rejects.toThrow('Voyage API error (401)');
  });

  it('throws when no API key provided', async () => {
    vi.stubEnv('VOYAGE_API_KEY', '');
    await expect(embedChunks([{ sectionTitle: null, chunkText: 'Test.', chunkIndex: 0 }])).rejects.toThrow(
      'Missing VOYAGE_API_KEY'
    );
  });
});

describe('embedQuery', () => {
  it('embeds a single query text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ embedding: new Array(512).fill(0.2), index: 0 }],
          usage: { total_tokens: 5 },
        }),
    });

    const result = await embedQuery('test query', 'test-key');
    expect(result).toHaveLength(512);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input_type).toBe('query');
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited'),
    });

    await expect(embedQuery('test', 'test-key')).rejects.toThrow('Voyage API error (429)');
  });
});
