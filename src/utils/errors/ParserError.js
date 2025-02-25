/**
 * ParserError Class
 * 
 * A specialized error class for handling parsing errors with detailed context
 * to aid debugging and improve user feedback when API responses fail to parse.
 */

/**
 * Maximum length for the raw response in the error object to avoid excessive memory usage.
 * @type {number}
 */
const MAX_RAW_RESPONSE_LENGTH = 1000;

class ParserError extends Error {
  /**
   * Create a new ParserError
   * 
   * @param {string} message - The error message
   * @param {object} options - Options object
   * @param {string} options.errorType - The type of parsing error
   * @param {string} options.errorDetail - Detailed explanation of the error
   * @param {number|null} options.position - Position in the string where the error occurred (if known)
   * @param {string|null} options.context - The surrounding text where the error occurred
   * @param {string|null} options.suggestion - Suggested fix for the error
   * @param {string|null} options.rawResponse - The raw response that caused the error
   */
  constructor(message, {
    errorType = 'unknown',
    errorDetail = null,
    position = null,
    context = null,
    suggestion = null,
    rawResponse = null
  } = {}) {
    super(message);
    
    this.name = 'ParserError';
    this.errorType = errorType;
    this.errorDetail = errorDetail;
    this.position = position;
    this.context = context;
    this.suggestion = suggestion;
    this.timestamp = new Date().toISOString();
    
    // Store a truncated version of the raw response for debugging
    if (rawResponse) {
      this.rawResponsePreview = rawResponse.length > MAX_RAW_RESPONSE_LENGTH
        ? rawResponse.substring(0, MAX_RAW_RESPONSE_LENGTH) + '... [truncated]'
        : rawResponse;
    } else {
      this.rawResponsePreview = null;
    }
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParserError);
    }
  }
  
  /**
   * Create a ParserError from validation result
   * 
   * @param {object} validationResult - The result from a validation function
   * @param {string} rawResponse - The raw response that was validated
   * @returns {ParserError} A new ParserError with details from the validation result
   */
  static fromValidationResult(validationResult, rawResponse) {
    const message = `Parsing error: ${validationResult.errorDetail || 'Invalid response structure'}`;
    
    return new ParserError(message, {
      errorType: validationResult.errorType || 'validation_failed',
      errorDetail: validationResult.errorDetail,
      position: validationResult.position,
      context: validationResult.context,
      suggestion: validationResult.suggestion || 'Check the API response format',
      rawResponse
    });
  }
  
  /**
   * Create a ParserError from a JSON.parse error
   * 
   * @param {Error} jsonError - The error thrown by JSON.parse
   * @param {string} rawResponse - The raw response that caused the error
   * @returns {ParserError} A new ParserError with details from the JSON parse error
   */
  static fromJsonError(jsonError, rawResponse) {
    const positionMatch = jsonError.message.match(/position (\d+)/);
    const position = positionMatch ? parseInt(positionMatch[1]) : null;
    
    // Extract context around the error position
    let context = null;
    if (position !== null && rawResponse) {
      const start = Math.max(0, position - 20);
      const end = Math.min(rawResponse.length, position + 20);
      context = rawResponse.substring(start, end);
    }
    
    return new ParserError(`JSON parsing error: ${jsonError.message}`, {
      errorType: 'json_syntax_error',
      errorDetail: jsonError.message,
      position,
      context,
      suggestion: 'Check for syntax errors like missing quotes, commas, or brackets',
      rawResponse
    });
  }
  
  /**
   * Creates a user-friendly message for display in UI
   * 
   * @returns {string} A user-friendly error message
   */
  getUserMessage() {
    const messages = {
      'missing_opening_bracket': 'The response is missing an opening bracket [',
      'missing_closing_bracket': 'The response is missing a closing bracket ]',
      'unbalanced_brackets': 'The response has unbalanced brackets',
      'unclosed_string': 'There is an unclosed string in the response',
      'empty_response': 'The AI returned an empty response',
      'invalid_change_object': 'A change object is missing required fields',
      'not_array': 'The response is not a valid array of changes',
      'json_syntax_error': 'The response contains invalid JSON syntax',
      'validation_failed': 'The response format is invalid',
      'unknown': 'An unexpected error occurred while processing the AI response'
    };
    
    let baseMessage = messages[this.errorType] || this.message;
    
    // Add suggestion if available
    if (this.suggestion) {
      baseMessage += `. ${this.suggestion}`;
    }
    
    return baseMessage;
  }
  
  /**
   * Logs detailed error information for debugging
   */
  logDetails() {
    console.error(`[ParserError] ${this.timestamp} - ${this.errorType}: ${this.message}`);
    
    if (this.errorDetail) {
      console.error(`Detail: ${this.errorDetail}`);
    }
    
    if (this.position !== null) {
      console.error(`Position: ${this.position}`);
    }
    
    if (this.context) {
      console.error(`Context: "${this.context}"`);
    }
    
    if (this.suggestion) {
      console.error(`Suggestion: ${this.suggestion}`);
    }
    
    console.error('Stack:', this.stack);
    
    if (this.rawResponsePreview) {
      console.error('Raw Response Preview:', this.rawResponsePreview);
    }
  }
}

module.exports = { ParserError }; 