import React from 'react';
import './App.css';
import RootErrorBoundary from './components/RootErrorBoundary';
import StyleGuideGenerator from './components/StyleGuideGenerator';

function App() {
  return (
    <RootErrorBoundary>
      <div className="App">
        <header className="App-header">
          <h1>Style Guider</h1>
          <p>Generate comprehensive style guides from your text using AI</p>
        </header>
        <main>
          <StyleGuideGenerator />
        </main>
      </div>
    </RootErrorBoundary>
  );
}

export default App;
