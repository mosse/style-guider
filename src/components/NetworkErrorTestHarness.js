import React, { useState } from 'react';
import NetworkErrorBoundary from './NetworkErrorBoundary';
import { AnthropicError } from '../utils/errors/AnthropicError';
import './NetworkErrorTestHarness.css';

/**
 * A component that simulates network-related errors to 
 * demonstrate the NetworkErrorBoundary
 */
const ErrorTrigger = ({ onTriggerError }) => {
  return (
    <div className="error-trigger">
      <button 
        className="trigger-button"
        onClick={onTriggerError}
      >
        Trigger Network Error
      </button>
      <p className="trigger-help">
        This button will trigger a simulated network error that will be caught
        by the NetworkErrorBoundary component.
      </p>
    </div>
  );
};

/**
 * NetworkErrorTestHarness Component
 * 
 * A test component to demonstrate the NetworkErrorBoundary 
 * handling network-related errors.
 */
const NetworkErrorTestHarness = () => {
  const [shouldError, setShouldError] = useState(false);
  
  // Function to trigger a network error
  const triggerNetworkError = () => {
    setShouldError(true);
  };

  // Simulate a component that throws a network error
  const ErrorComponent = () => {
    if (shouldError) {
      // Simulate different types of network errors
      const errorType = Math.floor(Math.random() * 3);
      
      if (errorType === 0) {
        // HTTP 503 Service Unavailable error
        throw new AnthropicError(
          "Service unavailable. The server is temporarily unable to handle your request.",
          503,
          {
            originalError: "Service Unavailable",
            response: {
              status: 503,
              statusText: "Service Unavailable"
            }
          }
        );
      } else if (errorType === 1) {
        // Timeout error
        const error = new Error("The request timed out. Please try again later.");
        error.name = "TimeoutError";
        throw error;
      } else {
        // Connection error
        const error = new Error("Failed to fetch. Check your network connection.");
        error.name = "ConnectionError";
        throw error;
      }
    }

    return (
      <div className="success-message">
        <h3>No Network Errors</h3>
        <p>Application is running normally. Click the button to simulate a network error.</p>
      </div>
    );
  };

  // Reset the error state when the error boundary resets
  const handleReset = () => {
    setShouldError(false);
  };

  return (
    <div className="network-test-container">
      <h1>Network Error Boundary Test</h1>
      <p className="description">
        This page demonstrates how the NetworkErrorBoundary component handles
        network-related errors in the Style Guider application.
      </p>

      <div className="network-test-section">
        <h2>Live Network Error Boundary Demo</h2>
        <p>
          The component below is wrapped in a NetworkErrorBoundary. When you trigger
          an error, you'll see how the boundary catches it and displays a user-friendly message.
        </p>

        <div className="demo-container">
          <NetworkErrorBoundary onReset={handleReset}>
            {!shouldError && <ErrorTrigger onTriggerError={triggerNetworkError} />}
            <ErrorComponent />
          </NetworkErrorBoundary>
        </div>
      </div>

      <div className="implementation-notes">
        <h2>How It Works</h2>
        <p>The NetworkErrorBoundary provides specialized handling for connection issues:</p>
        <ul>
          <li>Detects network-related errors through error codes and message patterns</li>
          <li>Shows different messages for offline vs. server unavailable situations</li>
          <li>Tracks retry attempts to help users understand the recovery process</li>
          <li>Provides troubleshooting tips relevant to connection problems</li>
          <li>Automatically detects when a user goes offline and disables the retry button</li>
        </ul>
        <p>
          This specialized handling improves the user experience during network disruptions,
          giving clear guidance on how to resolve the issue.
        </p>
      </div>
    </div>
  );
};

export default NetworkErrorTestHarness; 