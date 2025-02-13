import React from 'react';
import './App.css';
import RootErrorBoundary from './components/RootErrorBoundary';
import ApiErrorBoundary from './components/ApiErrorBoundary';
import { useState } from 'react';

function LoadingSpinner() {
  return (
    <div className="spinner-container">
      <div className="spinner"></div>
      <div className="spinner-text">Formatting text...</div>
    </div>
  );
}

function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setOutputText(''); // Clear previous output
    
    // Mock server call
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
      setOutputText(inputText);
    } catch (error) {
      console.error('Error formatting text:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RootErrorBoundary>
      <div className="App">
        <header className="App-header">
          <h1>Style Guider</h1>
        </header>
        <main>
          <ApiErrorBoundary>
            <div className="container">
              <h1>Medium-Style Formatter</h1>
              <div className="editor-container">
                <div className="input-container">
                  <textarea
                    className="input-area"
                    placeholder="Paste your text here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <button 
                    className="submit-button"
                    onClick={handleSubmit}
                    disabled={isLoading || !inputText.trim()}
                  >
                    Format Text
                  </button>
                </div>
                <div className="output-area">
                  {isLoading ? (
                    <LoadingSpinner />
                  ) : outputText ? (
                    outputText.split('\n\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))
                  ) : (
                    <div className="empty-state">
                      Formatted text will appear here
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ApiErrorBoundary>
        </main>
      </div>
    </RootErrorBoundary>
  );
}

export default App;
