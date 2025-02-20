import React from 'react';
import './App.css';
import RootErrorBoundary from './components/RootErrorBoundary';
import StyleGuideGenerator from './components/StyleGuideGenerator';
import InstructionsModal from './components/InstructionsModal';
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <RootErrorBoundary>
      <div className="App">
        <main>
          <StyleGuideGenerator />
          <InstructionsModal />
        </main>
        <Analytics />
      </div>
    </RootErrorBoundary>
  );
}

export default App;
