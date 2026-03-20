import React, { useState, useRef } from 'react';

interface GuideUploadProps {
  onComplete: () => void;
  onCancel: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function GuideUpload({ onComplete, onCancel }: GuideUploadProps) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [state, setState] = useState<UploadState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [chunkCount, setChunkCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    setText(content);

    // Auto-fill name from filename if empty
    if (!name) {
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setName(fileName);
    }
  }

  async function handleUpload() {
    if (!name.trim() || !text.trim()) return;

    setState('uploading');
    setStatusMessage('Uploading and processing style guide...');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPLOAD_GUIDE',
        name: name.trim(),
        text: text.trim(),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setChunkCount(response.chunkCount || 0);
      setState('success');
      setStatusMessage(`Style guide uploaded successfully! ${response.chunkCount} sections indexed.`);

      // Auto-set as active guide
      await chrome.runtime.sendMessage({
        type: 'SET_ACTIVE_GUIDE',
        guideId: response.id,
      });

      setTimeout(onComplete, 1500);
    } catch (err: any) {
      setState('error');
      setStatusMessage(err.message || 'Upload failed');
    }
  }

  const canSubmit = name.trim() && text.trim() && state !== 'uploading';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Upload Style Guide</h2>
        <button style={styles.cancelBtn} onClick={onCancel}>{'\u2715'}</button>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., AP Style Guide"
          style={styles.input}
          disabled={state === 'uploading'}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Style Guide Text</label>
        <div style={styles.inputOptions}>
          <button
            style={styles.fileBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={state === 'uploading'}
          >
            Choose File (.txt, .md)
          </button>
          <span style={styles.orText}>or paste below</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.text"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the full text of your style guide here..."
          style={styles.textarea}
          disabled={state === 'uploading'}
        />
        {text && (
          <div style={styles.charCount}>
            {text.length.toLocaleString()} characters
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          style={{
            ...styles.status,
            background: state === 'error' ? '#ffebee' : state === 'success' ? '#e8f5e9' : '#e3f2fd',
            color: state === 'error' ? '#d32f2f' : state === 'success' ? '#1a8917' : '#1565c0',
          }}
        >
          {statusMessage}
        </div>
      )}

      <button
        style={{
          ...styles.submitBtn,
          opacity: canSubmit ? 1 : 0.5,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
        onClick={handleUpload}
        disabled={!canSubmit}
      >
        {state === 'uploading' ? 'Processing...' : 'Upload & Index'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  heading: {
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#999',
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
    fontSize: '14px',
    outline: 'none',
  },
  inputOptions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  fileBtn: {
    padding: '6px 14px',
    background: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  orText: {
    fontSize: '12px',
    color: '#999',
  },
  textarea: {
    width: '100%',
    minHeight: '200px',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'monospace',
    resize: 'vertical' as const,
    outline: 'none',
  },
  charCount: {
    fontSize: '11px',
    color: '#999',
    marginTop: '4px',
    textAlign: 'right' as const,
  },
  status: {
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '12px',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    background: '#1a8917',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
  },
};
