import React, { useState } from 'react';
import { GuideSelector } from './GuideSelector.js';
import { GuideUpload } from './GuideUpload.js';
import { Settings } from './Settings.js';

type View = 'main' | 'upload' | 'settings';

export function App() {
  const [view, setView] = useState<View>('main');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setRefreshKey((k) => k + 1);
    setView('main');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Style Guider</h1>
        <button
          style={styles.settingsBtn}
          onClick={() => setView(view === 'settings' ? 'main' : 'settings')}
          title="Settings"
        >
          {view === 'settings' ? '\u2715' : '\u2699'}
        </button>
      </header>

      {view === 'settings' && <Settings onClose={() => setView('main')} />}

      {view === 'upload' && (
        <GuideUpload
          onComplete={handleUploadComplete}
          onCancel={() => setView('main')}
        />
      )}

      {view === 'main' && (
        <div style={styles.main}>
          <GuideSelector key={refreshKey} />
          <button
            style={styles.uploadBtn}
            onClick={() => setView('upload')}
          >
            + Upload Style Guide
          </button>
          <div style={styles.instructions}>
            <p style={styles.instructionText}>
              Select text on any webpage and click the "Style Check" button to get
              suggestions based on your active style guide.
            </p>
            <p style={styles.instructionText}>
              Each suggestion includes a verbatim citation from your style guide.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '2px solid #1a8917',
    background: 'white',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a8917',
    margin: 0,
  },
  settingsBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px',
  },
  main: {
    padding: '20px',
    flex: 1,
  },
  uploadBtn: {
    width: '100%',
    padding: '10px',
    marginTop: '12px',
    background: 'white',
    border: '2px dashed #ccc',
    borderRadius: '8px',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  },
  instructions: {
    marginTop: '24px',
    padding: '16px',
    background: '#f0f7f0',
    borderRadius: '8px',
    borderLeft: '3px solid #1a8917',
  },
  instructionText: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#555',
    marginBottom: '8px',
  },
};
