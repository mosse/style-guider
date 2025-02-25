import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import RootErrorBoundary from './components/RootErrorBoundary';
import StyleGuideGenerator from './components/StyleGuideGenerator';
import InstructionsModal from './components/InstructionsModal';
import LoadingSpinner from './components/LoadingSpinner';
import { Analytics } from '@vercel/analytics/react';

// Only import test harness components in development mode
const ErrorTestHarness = process.env.NODE_ENV === 'development' 
  ? React.lazy(() => import('./components/ErrorTestHarness')) 
  : null;
const NetworkErrorTestHarness = process.env.NODE_ENV === 'development' 
  ? React.lazy(() => import('./components/NetworkErrorTestHarness')) 
  : null;

function App() {
  // Determine if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <RootErrorBoundary>
      <Router>
        <div className="App">
          {/* Only show navigation bar in development mode */}
          {isDevelopment && (
            <nav className="app-nav">
              <div className="nav-container">
                <Link to="/" className="nav-logo">Style Guider</Link>
                <div className="nav-links">
                  <Link to="/" className="nav-link">Home</Link>
                  <Link to="/error-tests" className="nav-link">Error Tests</Link>
                  <Link to="/network-tests" className="nav-link">Network Tests</Link>
                </div>
              </div>
            </nav>
          )}

          <main>
            <React.Suspense fallback={
              <div className="suspense-loading">
                <LoadingSpinner />
                <p>Loading test environment...</p>
              </div>
            }>
              <Routes>
                <Route path="/" element={<StyleGuideGenerator />} />
                {/* Only include test harness routes in development mode */}
                {isDevelopment && (
                  <>
                    <Route path="/error-tests" element={<ErrorTestHarness />} />
                    <Route path="/network-tests" element={<NetworkErrorTestHarness />} />
                  </>
                )}
              </Routes>
            </React.Suspense>
            <InstructionsModal />
          </main>
          <Analytics />
        </div>
      </Router>
    </RootErrorBoundary>
  );
}

export default App;
