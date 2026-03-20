import React, { useEffect, useState } from 'react';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [backendUrl, setBackendUrl] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }).then((response) => {
      setBackendUrl(response.backendUrl || '');
      setDeviceToken(response.deviceToken || '');
    });
  }, []);

  async function handleSave() {
    await chrome.runtime.sendMessage({
      type: 'SET_BACKEND_URL',
      url: backendUrl.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Settings</h2>

      <div style={styles.field}>
        <label style={styles.label}>Backend URL</label>
        <input
          type="url"
          value={backendUrl}
          onChange={(e) => setBackendUrl(e.target.value)}
          placeholder="https://your-app.vercel.app"
          style={styles.input}
        />
        <p style={styles.hint}>
          The URL of your Style Guider API server.
        </p>
      </div>

      <button style={styles.saveBtn} onClick={handleSave}>
        {saved ? 'Saved!' : 'Save'}
      </button>

      <div style={styles.divider} />

      <div style={styles.field}>
        <label style={styles.label}>Device Token</label>
        <div style={styles.tokenDisplay}>{deviceToken}</div>
        <p style={styles.hint}>
          This identifies your style guides on the server. It is generated
          automatically and stored locally.
        </p>
      </div>

      <button style={styles.closeBtn} onClick={onClose}>
        Done
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    borderBottom: '1px solid #eee',
    background: '#fafafa',
  },
  heading: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
    margin: '0 0 16px 0',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
  },
  hint: {
    fontSize: '11px',
    color: '#999',
    marginTop: '4px',
    lineHeight: '1.4',
  },
  saveBtn: {
    padding: '8px 20px',
    background: '#1a8917',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  divider: {
    height: '1px',
    background: '#eee',
    margin: '16px 0',
  },
  tokenDisplay: {
    padding: '8px 12px',
    background: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#666',
    wordBreak: 'break-all' as const,
  },
  closeBtn: {
    width: '100%',
    padding: '10px',
    background: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#666',
  },
};
