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
  cleaned = cleaned.replace(/[^\x20-\x7E\s]/g, ''); // Replace all non-printable ASCII and non-whitespace

  // Handle the response based on its structure
  const trimmed = cleaned.trim();
  
  // Special case handling for JSON format where string is used as a key
  // Detect if this is a response with text fragments as object keys
  if (trimmed.match(/^\[\{"\n?[^"]+":/) || trimmed.match(/^\[\{"[^"]+\\n/)) {
    try {
      // Attempt to normalize the format
      let normalizedResponse = [];
      
      // First try parsing directly (in case it's valid JSON as-is)
      try {
        const parsed = JSON.parse(trimmed);
        
        // Check if we need to transform object key structure
        // where the original text is the key and replacement is the value
        if (parsed.length > 0 && Object.keys(parsed[0]).some(key => key.includes('\n') || key.startsWith('\n'))) {
          parsed.forEach(item => {
            // Extract the first key-value pair which should be original-replacement
            const keys = Object.keys(item);
            if (keys.length > 0) {
              const original = keys[0];
              const replacement = item[original];
              let reason = '';
              
              // Check if there's a reason property
              if (item.reason) {
                reason = item.reason;
              } else if (typeof replacement === 'object' && replacement.reason) {
                reason = replacement.reason;
              }
              
              // Create a properly formatted change object
              normalizedResponse.push({
                original: original,
                replacement: typeof replacement === 'string' ? replacement : JSON.stringify(replacement),
                reason: reason
              });
            }
          });
          
          return JSON.stringify(normalizedResponse);
        }
        
        return trimmed; // It's valid JSON as-is
      } catch (e) {
        // Continue with other normalization attempts
      }
      
      // Try a manual approach for malformed JSON with this pattern
      const segments = trimmed.match(/\{"\n?[^"}]+":[^}]+\}/g) || [];
      
      if (segments.length > 0) {
        segments.forEach(segment => {
          try {
            // Extract the key (original text) and value (replacement)
            const keyMatch = segment.match(/^\{"([^"]+)":/);
            const valueMatch = segment.match(/:"([^"]+)"/);
            const reasonMatch = segment.match(/"reason":"([^"]+)"/);
            
            if (keyMatch && keyMatch[1]) {
              const original = keyMatch[1];
              const replacement = valueMatch && valueMatch[1] ? valueMatch[1] : '';
              const reason = reasonMatch && reasonMatch[1] ? reasonMatch[1] : '';
              
              normalizedResponse.push({
                original,
                replacement,
                reason
              });
            }
          } catch (segmentError) {
            // Skip malformed segments
          }
        });
        
        if (normalizedResponse.length > 0) {
          return JSON.stringify(normalizedResponse);
        }
      }
    } catch (e) {
      // If special handling fails, continue with standard approach
    }
  }
  
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
  let processed = trimmed;

  // Ensure array wrapper
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
  
  // Fix unquoted property names - specifically target known fields
  processed = processed.replace(/([{,]\s*)(original)(\s*:)/g, '$1"$2"$3');
  processed = processed.replace(/([{,]\s*)(replacement)(\s*:)/g, '$1"$2"$3');
  processed = processed.replace(/([{,]\s*)(reason)(\s*:)/g, '$1"$2"$3');
  
  // Fix trailing commas
  processed = processed.replace(/,(\s*)\]/g, '\n]');
  
  // Enhanced handling of nested quotes and change objects
  // Approach: More careful scan for balanced structures
  
  // First, ensure we don't have single-character text fragments
  // (which can happen due to processing errors with complex text)
  processed = processed.replace(/",\s*"([,:;.!?])",/g, '"$1",');

  // Helper function to check if a string is balanced regarding JSON structure
  const isBalanced = (str) => {
    const stack = [];
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (escape) {
        escape = false;
        continue;
      }
      
      if (char === '\\') {
        escape = true;
        continue;
      }
      
      if (char === '"' && !inString) {
        inString = true;
      } else if (char === '"' && inString) {
        inString = false;
      } else if (!inString) {
        if (char === '{' || char === '[') {
          stack.push(char);
        } else if (char === '}') {
          if (stack.pop() !== '{') return false;
        } else if (char === ']') {
          if (stack.pop() !== '[') return false;
        }
      }
    }
    
    return stack.length === 0 && !inString;
  };
  
  // If the processed response is still not balanced, try a more aggressive approach
  if (!isBalanced(processed)) {
    // Extract potential change objects (they have a specific structure)
    const changeObjectPattern = /{[^{}]*"original"[^{}]*"replacement"[^{}]*"reason"[^{}]*}/g;
    const textPattern = /"[^"]+"/g;
    
    let potentialObjects = processed.match(changeObjectPattern) || [];
    let textSegments = processed.match(textPattern) || [];
    
    // Filter out segments that are part of objects
    textSegments = textSegments.filter(text => {
      return !potentialObjects.some(obj => obj.includes(text));
    });
    
    // Reconstruct the array with proper formatting
    if (potentialObjects.length > 0 || textSegments.length > 0) {
      // Alternate between objects and text (simplified approach)
      const allSegments = [...potentialObjects, ...textSegments].sort((a, b) => {
        return processed.indexOf(a) - processed.indexOf(b);
      });
      
      processed = '[' + allSegments.join(',\n') + ']';
    }
  }
  
  // Final safety check: try to parse, revert to simpler approach if needed
  try {
    JSON.parse(processed);
  } catch (e) {
    // If all else fails, extract just the change objects and use them
    try {
      const objectPattern = /{[^{}]*"original"[^{}]*"replacement"[^{}]*"reason"[^{}]*}/g;
      const changeObjects = trimmed.match(objectPattern) || [];
      
      if (changeObjects.length > 0) {
        return '[' + changeObjects.join(',\n') + ']';
      }
    } catch (e2) {
      // Last resort: just wrapping in an array if all else fails
      return `["${trimmed.replace(/"/g, '\\"')}"]`;
    }
  }
  
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