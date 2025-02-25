import React from 'react';
import { ParserError } from '../utils/errors/ParserError';
import { AnthropicError } from '../utils/errors/AnthropicError';
import './ErrorDisplay.css';

/**
 * ErrorDisplay Component
 * 
 * A component for displaying different levels of error messages:
 * - User-friendly messages for regular users
 * - Technical details for developers
 * - Debug information in development mode
 */
const ErrorDisplay = ({ error, resetError }) => {
  // Determine the type of error
  const isParserError = error instanceof ParserError;
  const isApiError = error instanceof AnthropicError;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Get the appropriate error message based on the error type
  let errorTitle = 'Something went wrong';
  let userMessage = 'An unexpected error occurred. Please try again.';
  let technicalDetails = null;
  let debugInfo = null;
  
  if (isParserError) {
    errorTitle = 'Response Format Error';
    userMessage = error.getUserMessage();
    technicalDetails = `${error.errorType}: ${error.errorDetail || error.message}`;
    debugInfo = {
      position: error.position,
      context: error.context,
      timestamp: error.timestamp,
      rawResponsePreview: error.rawResponsePreview
    };
  } else if (isApiError) {
    errorTitle = 'API Error';
    userMessage = error.message;
    technicalDetails = `Error Code: ${error.code}`;
    debugInfo = {
      timestamp: error.timestamp,
      details: error.details
    };
  } else if (error) {
    userMessage = error.message || userMessage;
    technicalDetails = error.stack ? error.stack.split('\n')[0] : null;
    debugInfo = {
      stack: error.stack
    };
  }

  return (
    <div className="error-display">
      {/* Level 1: User-friendly message (always shown) */}
      <div className="error-user-level">
        <h3>{errorTitle}</h3>
        <p>{userMessage}</p>
        <button className="error-action-button" onClick={resetError}>
          Try Again
        </button>
      </div>

      {/* Level 2: Technical details (collapsible) */}
      {technicalDetails && (
        <details className="error-technical-level">
          <summary>Technical Details</summary>
          <p>{technicalDetails}</p>
          {isParserError && error.suggestion && (
            <div className="suggestion">
              <strong>Suggestion:</strong> {error.suggestion}
            </div>
          )}
        </details>
      )}

      {/* Level 3: Debug information (only in development mode) */}
      {isDevelopment && debugInfo && (
        <details className="error-debug-level">
          <summary>Debug Information</summary>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};

export default ErrorDisplay; 