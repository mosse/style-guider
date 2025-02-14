import React from 'react';
import './App.css';
import RootErrorBoundary from './components/RootErrorBoundary';
import StyleGuideGenerator from './components/StyleGuideGenerator';

function App() {
  return (
    <RootErrorBoundary>
      <div className="App">
        <main>
          <StyleGuideGenerator />
        </main>
      </div>
    </RootErrorBoundary>
  );
}

export default App;
