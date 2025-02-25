/**
 * Response Parser Module
 * 
 * This module is responsible for cleaning, validating, and parsing API responses
 * from LLM services. It handles various edge cases and provides robust error 
 * handling and recovery mechanisms.
 */

const { validateResponse } = require('./parserValidator');
const { ParserError } = require('./errors/ParserError');
const { createFallbackFromFragments, evaluateRecoveryPotential } = require('./parserRecovery');

// Telemetry data for tracking parser performance
const parserTelemetry = {
  totalAttempts: 0,
  successCount: 0,
  fallbackSuccessCount: 0,
  failureCount: 0
};

/**
 * Cleans the raw API response text by removing markdown formatting,
 * normalizing special characters, and ensuring valid structure.
 * 
 * @param {string} response - The raw response text from the API
 * @returns {string} The cleaned response text
 */
function cleanResponse(response) {
  if (!response) return '';

  let cleaned = response;

  // Remove markdown code block formatting if present
  cleaned = cleaned.replace(/^```json\s+|\s+```$/g, '');
  cleaned = cleaned.replace(/^```\s+|\s+```$/g, '');

  // Normalize special characters
  cleaned = cleaned.replace(/["]/g, '"'); // Smart quotes
  cleaned = cleaned.replace(/["]/g, '"');
  cleaned = cleaned.replace(/[']/g, "'"); // Smart apostrophes
  cleaned = cleaned.replace(/[']/g, "'");
  cleaned = cleaned.replace(/—/g, '--'); // Em dash
  cleaned = cleaned.replace(/–/g, '-');  // En dash

  // Remove control characters that cause JSON parsing to fail
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Handle the response based on its structure
  const trimmed = cleaned.trim();
  
  // Case 1: Raw text (not JSON)
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
    // This is likely raw text - escape all quotes and wrap in JSON array
    const escapedText = trimmed.replace(/"/g, '\\"');
    return `["${escapedText}"]`;
  }
  
  // Case 2: Looks like it might be valid JSON - try to parse it directly
  try {
    JSON.parse(trimmed);
    return trimmed; // It's valid JSON, return as is
  } catch (e) {
    // Not valid JSON, continue with repairs
  }
  
  // Case 3: JSON-like but needs repair
  // Ensure array wrapper
  let processed = trimmed;
  if (!processed.startsWith('[')) {
    processed = '[' + processed;
  }
  if (!processed.endsWith(']')) {
    processed = processed + ']';
  }
  
  // Fix missing commas
  processed = processed.replace(/}(\s*){/g, '},\n$1{');
  processed = processed.replace(/"(\s*){/g, '",\n$1{');
  processed = processed.replace(/}(\s*)"/g, '},\n$1"');
  
  // Fix unquoted property names
  processed = processed.replace(/([{,]\s*)(original)(\s*:)/g, '$1"$2"$3');
  processed = processed.replace(/([{,]\s*)(replacement)(\s*:)/g, '$1"$2"$3');
  processed = processed.replace(/([{,]\s*)(reason)(\s*:)/g, '$1"$2"$3');
  
  // Fix trailing commas
  processed = processed.replace(/,(\s*)\]/g, '\n]');
  
  // Fix nested quotes - this is the most complex part
  // We'll use a simpler approach that handles the most common cases
  
  // Look for string literals and ensure internal quotes are escaped
  const stringRegex = /"((?:\\.|[^"\\])*)"/g;
  processed = processed.replace(stringRegex, (match, content) => {
    // Escape any unescaped quotes in the content
    const escapedContent = content.replace(/([^\\])"/g, '$1\\"');
    return `"${escapedContent}"`;
  });
  
  return processed;
}

/**
 * Validates and attempts to repair the cleaned response if needed.
 * 
 * @param {string} cleanedResponse - The cleaned response string
 * @returns {Object} An object with validation status and repaired response
 */
function validateAndRepair(cleanedResponse) {
  // Validate the cleaned response
  const validationResult = validateResponse(cleanedResponse);
  
  if (validationResult.isValid) {
    return {
      isValid: true,
      response: cleanedResponse
    };
  }
  
  // If not valid, check recovery potential
  const recoveryPotential = evaluateRecoveryPotential(cleanedResponse);
  
  if (recoveryPotential.recoverabilityScore >= 50) {
    // High chance of recovery - try fallback parsing
    try {
      const fallbackArray = createFallbackFromFragments(cleanedResponse);
      
      if (Array.isArray(fallbackArray) && fallbackArray.length > 0) {
        // Successfully recovered something
        return {
          isValid: true,
          response: JSON.stringify(fallbackArray),
          usedFallback: true,
          recoveryApproach: recoveryPotential.recommendedApproach
        };
      }
    } catch (error) {
      // Recovery failed, continue to error
    }
  }
  
  // Return the validation failure
  return {
    isValid: false,
    validationResult,
    recoveryPotential
  };
}

/**
 * Cleans and parses the API response, implementing multi-stage parsing
 * with error handling and recovery.
 * 
 * @param {string} response - The raw response text from the API
 * @returns {Array} An array of parsed text segments and change objects
 * @throws {ParserError} If the response cannot be parsed
 */
function cleanAndParseResponse(response) {
  parserTelemetry.totalAttempts++;
  
  try {
    if (!response || typeof response !== 'string' || response.trim() === '') {
      throw new ParserError('Empty or invalid response', {
        errorType: 'empty_response',
        suggestion: 'Check API connection and prompt configuration'
      });
    }

    // Step 1: Clean the response
    const cleanedResponse = cleanResponse(response);
    
    // Step 2: Validate and attempt repair if needed
    const validationResult = validateAndRepair(cleanedResponse);
    
    if (!validationResult.isValid) {
      // Create a detailed error from the validation result
      throw ParserError.fromValidationResult(
        validationResult.validationResult, 
        response
      );
    }
    
    // Step 3: Parse the validated/repaired response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(validationResult.response);
      
      // Record success
      if (validationResult.usedFallback) {
        parserTelemetry.fallbackSuccessCount++;
      } else {
        parserTelemetry.successCount++;
      }
      
      return parsedResponse;
    } catch (jsonError) {
      // If JSON.parse fails despite validation, something unexpected happened
      throw ParserError.fromJsonError(jsonError, response);
    }
  } catch (error) {
    // Handle parsing failures and record telemetry
    parserTelemetry.failureCount++;
    
    // Rethrow ParserErrors as-is, wrap other errors
    if (error instanceof ParserError) {
      // Log the error details for debugging
      error.logDetails();
      throw error;
    } else {
      // Wrap generic errors in ParserError
      const parserError = new ParserError(`Unexpected parser error: ${error.message}`, {
        errorType: 'unexpected_error',
        errorDetail: error.message,
        rawResponse: response,
        suggestion: 'This may be a bug in the parser implementation'
      });
      parserError.logDetails();
      throw parserError;
    }
  }
}

/**
 * Gets the current parser telemetry data.
 * 
 * @returns {Object} Parser telemetry statistics
 */
function getParserTelemetry() {
  const successRate = parserTelemetry.totalAttempts > 0 
    ? ((parserTelemetry.successCount + parserTelemetry.fallbackSuccessCount) / parserTelemetry.totalAttempts) * 100 
    : 0;
  
  return {
    ...parserTelemetry,
    successRate: successRate.toFixed(2) + '%',
    primarySuccessRate: (parserTelemetry.successCount / parserTelemetry.totalAttempts * 100).toFixed(2) + '%',
    fallbackSuccessRate: (parserTelemetry.fallbackSuccessCount / parserTelemetry.totalAttempts * 100).toFixed(2) + '%',
  };
}

module.exports = {
  cleanAndParseResponse,
  cleanResponse,
  validateAndRepair,
  getParserTelemetry
}; 