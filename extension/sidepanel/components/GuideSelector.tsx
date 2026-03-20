import React, { useEffect, useState } from 'react';

interface Guide {
  id: string;
  name: string;
  chunkCount: number;
  createdAt: string;
}

export function GuideSelector() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGuides();
  }, []);

  async function loadGuides() {
    setLoading(true);
    setError(null);

    try {
      const [guidesResponse, settingsResponse] = await Promise.all([
        chrome.runtime.sendMessage({ type: 'LIST_GUIDES' }),
        chrome.runtime.sendMessage({ type: 'GET_ACTIVE_GUIDE' }),
      ]);

      if (guidesResponse.error) throw new Error(guidesResponse.error);

      setGuides(guidesResponse.guides || []);
      setActiveGuideId(settingsResponse.activeGuideId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(guideId: string) {
    setActiveGuideId(guideId);
    await chrome.runtime.sendMessage({ type: 'SET_ACTIVE_GUIDE', guideId });
  }

  async function handleDelete(guideId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    try {
      await chrome.runtime.sendMessage({ type: 'DELETE_GUIDE', guideId });
      if (activeGuideId === guideId) {
        setActiveGuideId(null);
        await chrome.runtime.sendMessage({ type: 'SET_ACTIVE_GUIDE', guideId: null });
      }
      setGuides((prev) => prev.filter((g) => g.id !== guideId));
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div style={styles.loading}>Loading style guides...</div>;
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>{error}</p>
        <button onClick={loadGuides} style={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  if (guides.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyText}>No style guides uploaded yet.</p>
        <p style={styles.emptyHint}>Upload a style guide to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <label style={styles.label}>Active Style Guide</label>
      <div style={styles.guideList}>
        {guides.map((guide) => (
          <div
            key={guide.id}
            style={{
              ...styles.guideItem,
              ...(activeGuideId === guide.id ? styles.activeGuide : {}),
            }}
            onClick={() => handleSelect(guide.id)}
          >
            <div style={styles.guideInfo}>
              <div style={styles.guideName}>{guide.name}</div>
              <div style={styles.guideMeta}>
                {guide.chunkCount} chunks
              </div>
            </div>
            <button
              style={styles.deleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(guide.id, guide.name);
              }}
              title="Delete"
            >
              {'\u2715'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  guideList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  guideItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  activeGuide: {
    borderColor: '#1a8917',
    background: '#f0f7f0',
  },
  guideInfo: {
    flex: 1,
  },
  guideName: {
    fontSize: '14px',
    fontWeight: 500,
  },
  guideMeta: {
    fontSize: '12px',
    color: '#999',
    marginTop: '2px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#999',
    fontSize: '14px',
  },
  error: {
    padding: '12px',
    background: '#ffebee',
    borderRadius: '6px',
    color: '#d32f2f',
    fontSize: '13px',
  },
  retryBtn: {
    marginTop: '8px',
    padding: '6px 14px',
    background: '#d32f2f',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '20px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '4px',
  },
  emptyHint: {
    fontSize: '13px',
    color: '#999',
  },
};
