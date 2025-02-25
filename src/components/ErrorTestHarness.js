import React, { useState } from 'react';
import ErrorDisplay from './ErrorDisplay';
import { ParserError } from '../utils/errors/ParserError';
import { AnthropicError } from '../utils/errors/AnthropicError';
import './ErrorTestHarness.css';

/**
 * ErrorTestHarness Component
 * 
 * A test component to demonstrate different error handling scenarios
 * in the Style Guider application.
 */
const ErrorTestHarness = () => {
  const [displayedErrors, setDisplayedErrors] = useState([]);

  // Creates a sample parser error
  const createParserError = () => {
    const rawResponse = `[
      "Here is some text.",
      {original: "This is a mistake", replacement: "This is correct", reason: "Grammar"}
      "More text."
    ]`;

    return new ParserError("JSON parsing error: Unexpected token 'M'", {
      errorType: 'json_syntax_error',
      errorDetail: 'Unexpected token in JSON at position 124',
      position: 124,
      context: '}, "More text',
      suggestion: 'Check for missing commas between array elements',
      rawResponse
    });
  };

  // Creates a sample API error
  const createApiError = () => {
    return new AnthropicError(
      "Rate limit exceeded. Please try again later",
      429,
      {
        originalError: "Too many requests",
        response: {
          status: 429,
          statusText: "Too Many Requests"
        }
      }
    );
  };

  // Creates a sample network error
  const createNetworkError = () => {
    const error = new Error("Failed to fetch. The network connection was lost.");
    error.name = "NetworkError";
    return error;
  };

  // Handles resetting an error
  const handleResetError = (index) => {
    setDisplayedErrors(prev => prev.filter((_, i) => i !== index));
  };

  // Adds an error to the display
  const addError = (errorCreator) => {
    setDisplayedErrors(prev => [...prev, errorCreator()]);
  };

  return (
    <div className="error-test-container">
      <h1>Error Handling UI Examples</h1>
      <p className="description">
        This page demonstrates the different types of error displays in the Style Guider application.
        Click the buttons below to see examples of different error types.
      </p>

      <div className="test-controls">
        <button 
          className="test-button parser-error" 
          onClick={() => addError(createParserError)}
        >
          Show Parser Error
        </button>
        <button 
          className="test-button api-error" 
          onClick={() => addError(createApiError)}
        >
          Show API Error
        </button>
        <button 
          className="test-button network-error" 
          onClick={() => addError(createNetworkError)}
        >
          Show Network Error
        </button>
        <button 
          className="test-button reset-all" 
          onClick={() => setDisplayedErrors([])}
        >
          Reset All
        </button>
      </div>

      <div className="errors-showcase">
        {displayedErrors.length === 0 && (
          <div className="no-errors">
            No errors displayed. Click the buttons above to see error examples.
          </div>
        )}

        {displayedErrors.map((error, index) => (
          <div key={index} className="error-example">
            <h3 className="error-type">
              {error instanceof ParserError ? 'Parser Error' : 
               error instanceof AnthropicError ? 'API Error' : 'Network Error'}
            </h3>
            <ErrorDisplay 
              error={error} 
              resetError={() => handleResetError(index)} 
            />
          </div>
        ))}
      </div>

      <div className="implementation-notes">
        <h2>Implementation Details</h2>
        <p>The error handling system in Style Guider implements a tiered approach:</p>
        <ol>
          <li><strong>Level 1:</strong> User-friendly messages that explain the issue in plain language</li>
          <li><strong>Level 2:</strong> Technical details for developers (collapsible)</li>
          <li><strong>Level 3:</strong> Debug information available only in development mode</li>
        </ol>
        <p>This approach ensures that users get relevant information while developers can access the details needed for troubleshooting.</p>
      </div>
    </div>
  );
};

export default ErrorTestHarness; 