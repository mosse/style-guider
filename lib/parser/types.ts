export interface Change {
  original: string;
  replacement: string;
  reason: string;
  citation?: string;
}

export type Segment = string | Change;

export interface AnalysisResult {
  segments: Segment[];
  retrievedChunks: RetrievedChunk[];
  citationStats: CitationStats;
}

export interface RetrievedChunk {
  chunkText: string;
  sectionTitle: string | null;
  similarity: number;
}

export interface CitationStats {
  totalSuggestions: number;
  verifiedCitations: number;
  strippedCitations: number;
}

export interface StyleGuide {
  id: string;
  name: string;
  deviceToken: string;
  chunkCount: number;
  createdAt: string;
}

export interface Chunk {
  sectionTitle: string | null;
  chunkText: string;
  chunkIndex: number;
}

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

export function isChange(segment: Segment): segment is Change {
  return (
    typeof segment === 'object' &&
    segment !== null &&
    'original' in segment &&
    'replacement' in segment &&
    'reason' in segment
  );
}
