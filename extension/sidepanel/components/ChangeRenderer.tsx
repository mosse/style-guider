import React, { useState } from 'react';
import type { Change } from '../../../lib/parser/types.js';

interface ChangeRendererProps {
  change: Change;
}

export function ChangeRenderer({ change }: ChangeRendererProps) {
  const [state, setState] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [showTooltip, setShowTooltip] = useState(false);

  if (state === 'accepted') {
    return <span>{change.replacement}</span>;
  }

  if (state === 'rejected') {
    return <span>{change.original}</span>;
  }

  return (
    <span
      style={styles.container}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span style={styles.original}>{change.original}</span>
      <span style={styles.replacement}>{change.replacement}</span>
      <span style={styles.actions}>
        <button
          style={styles.acceptBtn}
          onClick={() => setState('accepted')}
          title="Accept"
        >
          {'\u2713'}
        </button>
        <button
          style={styles.rejectBtn}
          onClick={() => setState('rejected')}
          title="Reject"
        >
          {'\u2717'}
        </button>
      </span>

      {showTooltip && (
        <span style={styles.tooltip}>
          <span style={styles.reason}>{change.reason}</span>
          {change.citation && (
            <span style={styles.citation}>
              <span style={styles.citationLabel}>From the style guide:</span>
              <span style={styles.citationText}>{change.citation}</span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative' as const,
    display: 'inline',
    cursor: 'pointer',
  },
  original: {
    textDecoration: 'line-through',
    color: 'rgba(0,0,0,0.4)',
  },
  replacement: {
    color: '#1a8917',
    fontWeight: 500,
  },
  actions: {
    display: 'inline-flex',
    gap: '2px',
    margin: '0 2px',
    verticalAlign: 'middle',
  },
  acceptBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    height: '18px',
    border: '1px solid #ddd',
    borderRadius: '3px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '11px',
    padding: 0,
  },
  rejectBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    height: '18px',
    border: '1px solid #ddd',
    borderRadius: '3px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '11px',
    padding: 0,
  },
  tooltip: {
    position: 'absolute' as const,
    bottom: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#333',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '6px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    lineHeight: '1.4',
    maxWidth: '350px',
    width: 'max-content',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    display: 'block',
  },
  reason: {
    display: 'block',
    marginBottom: '6px',
  },
  citation: {
    display: 'block',
    borderLeft: '3px solid #1a8917',
    paddingLeft: '10px',
    marginTop: '6px',
  },
  citationLabel: {
    display: 'block',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#999',
    marginBottom: '4px',
  },
  citationText: {
    display: 'block',
    fontStyle: 'italic',
    fontSize: '12px',
    color: '#ccc',
  },
};
