import React from 'react';
import { ChangeRenderer } from './ChangeRenderer.js';
import type { Segment, CitationStats } from '../../../lib/parser/types.js';
import { isChange } from '../../../lib/parser/types.js';

interface AnalysisResultsProps {
  segments: Segment[];
  citationStats?: CitationStats;
  onClose: () => void;
}

export function AnalysisResults({ segments, citationStats, onClose }: AnalysisResultsProps) {
  const changeCount = segments.filter(isChange).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>
          {changeCount} suggestion{changeCount !== 1 ? 's' : ''}
        </span>
        <button style={styles.closeBtn} onClick={onClose}>Close</button>
      </div>

      <div style={styles.content}>
        {segments.map((segment, i) => {
          if (typeof segment === 'string') {
            return <span key={i}>{segment}</span>;
          }
          if (isChange(segment)) {
            return <ChangeRenderer key={i} change={segment} />;
          }
          return null;
        })}
      </div>

      {citationStats && (
        <div style={styles.stats}>
          {citationStats.verifiedCitations} of {citationStats.totalSuggestions} suggestions
          have verified citations
          {citationStats.strippedCitations > 0 && (
            <span> ({citationStats.strippedCitations} removed for missing citations)</span>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '1px solid #eee',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1a8917',
  },
  closeBtn: {
    padding: '4px 12px',
    background: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#666',
  },
  content: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: '15px',
    lineHeight: '1.6',
    color: 'rgba(0,0,0,0.84)',
  },
  stats: {
    marginTop: '16px',
    paddingTop: '8px',
    borderTop: '1px solid #eee',
    fontSize: '12px',
    color: '#999',
    textAlign: 'center' as const,
  },
};
