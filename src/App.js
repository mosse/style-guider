import React from 'react';
import './App.css';
import RootErrorBoundary from './components/RootErrorBoundary';
import StyleGuideGenerator from './components/StyleGuideGenerator';
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <RootErrorBoundary>
      <div className="App">
        <main>
          <StyleGuideGenerator />
        </main>
        <Analytics />
      </div>
    </RootErrorBoundary>
  );
}

export default App;
