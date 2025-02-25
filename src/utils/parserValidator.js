/**
 * Parser Validator Module
 * 
 * This module provides validation logic for the API response parser,
 * including structure checking, segment validation, and error reporting.
 */

/**
 * Validates the overall response structure.
 * 
 * @param {string} response - The response string to validate
 * @returns {Object} Validation result with isValid flag and error details
 */
function validateResponse(response) {
  if (!response || typeof response !== 'string') {
    return {
      isValid: false,
      errorType: 'invalid_input',
      errorDetail: 'Response is empty or not a string',
      position: null
    };
  }

  // Trim whitespace
  const trimmedResponse = response.trim();
  
  // Check for empty response
  if (trimmedResponse.length === 0) {
    return {
      isValid: false,
      errorType: 'empty_response',
      errorDetail: 'Response is empty after trimming whitespace',
      position: null
    };
  }
  
  // Validate JSON array structure
  const structureResult = validateJsonArrayStructure(trimmedResponse);
  if (!structureResult.isValid) {
    return structureResult;
  }
  
  // Validate array segments
  try {
    const parsed = JSON.parse(trimmedResponse);
    
    // Check if it's an array
    if (!Array.isArray(parsed)) {
      return {
        isValid: false,
        errorType: 'not_array',
        errorDetail: 'Response parsed successfully but is not an array',
        position: null
      };
    }
    
    // Check array contents
    if (parsed.length === 0) {
      return {
        isValid: false,
        errorType: 'empty_array',
        errorDetail: 'Response is an empty array',
        position: null
      };
    }
    
    // Validate segment types and structure
    for (let i = 0; i < parsed.length; i++) {
      const segment = parsed[i];
      
      if (typeof segment !== 'string' && typeof segment !== 'object') {
        return {
          isValid: false,
          errorType: 'invalid_segment_type',
          errorDetail: `Array element at index ${i} is not a string or object`,
          position: null
        };
      }
      
      if (typeof segment === 'object' && segment !== null) {
        // Validate change object structure
        if (!segment.original || !segment.replacement || !segment.reason) {
          return {
            isValid: false,
            errorType: 'invalid_change_object',
            errorDetail: `Change object at index ${i} is missing required fields`,
            position: null
          };
        }
        
        // Validate field types
        if (typeof segment.original !== 'string' || 
            typeof segment.replacement !== 'string' || 
            typeof segment.reason !== 'string') {
          return {
            isValid: false,
            errorType: 'invalid_field_type',
            errorDetail: `Change object at index ${i} has fields with incorrect types`,
            position: null
          };
        }
      }
    }
    
    return {
      isValid: true,
      errorType: null,
      errorDetail: null,
      position: null
    };
    
  } catch (error) {
    // This should not happen if structural validation passed
    return {
      isValid: false,
      errorType: 'parse_error',
      errorDetail: `JSON parse error: ${error.message}`,
      position: error.message.match(/position (\d+)/) ? 
        parseInt(error.message.match(/position (\d+)/)[1]) : null
    };
  }
}

/**
 * Validates the JSON array structure of the response without full parsing.
 * 
 * @param {string} response - The response string to validate
 * @returns {Object} Validation result with isValid flag and error details
 */
function validateJsonArrayStructure(response) {
  // Basic bracket validation
  const trimmedResponse = response.trim();
  
  // Check if response starts with [ and ends with ]
  if (!trimmedResponse.startsWith('[')) {
    return {
      isValid: false,
      errorType: 'missing_opening_bracket',
      errorDetail: 'Response does not start with an opening bracket [',
      position: 0,
      suggestion: 'Ensure the response starts with an opening bracket [',
      context: trimmedResponse.substring(0, Math.min(20, trimmedResponse.length))
    };
  }
  
  if (!trimmedResponse.endsWith(']')) {
    return {
      isValid: false,
      errorType: 'missing_closing_bracket',
      errorDetail: 'Response does not end with a closing bracket ]',
      position: trimmedResponse.length,
      suggestion: 'Ensure the response ends with a closing bracket ]',
      context: trimmedResponse.substring(Math.max(0, trimmedResponse.length - 20))
    };
  }
  
  // Bracket balancing check
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < trimmedResponse.length; i++) {
    const char = trimmedResponse[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '[') {
        bracketCount++;
      } else if (char === ']') {
        bracketCount--;
        
        // Check for unbalanced closing brackets
        if (bracketCount < 0) {
          return {
            isValid: false,
            errorType: 'unbalanced_brackets',
            errorDetail: 'Found closing bracket ] without matching opening bracket',
            position: i,
            suggestion: 'Check for balanced brackets in the response',
            context: trimmedResponse.substring(Math.max(0, i - 10), Math.min(trimmedResponse.length, i + 10))
          };
        }
      }
    }
  }
  
  // Check for unbalanced opening brackets
  if (bracketCount > 0) {
    return {
      isValid: false,
      errorType: 'unbalanced_brackets',
      errorDetail: 'Found opening bracket [ without matching closing bracket',
      position: null,
      suggestion: 'Ensure all opening brackets have matching closing brackets',
      context: null
    };
  }
  
  // If we've made it here, the structure is valid (but not necessarily the content)
  return {
    isValid: true,
    errorType: null,
    errorDetail: null,
    position: null
  };
}

/**
 * Validates the presence and type of required fields in change objects.
 * 
 * @param {string} responseString - The response string to validate
 * @returns {Object} Validation result with isValid flag and error details
 */
function validateSegmentStructure(responseString) {
  let response;
  
  try {
    response = JSON.parse(responseString);
  } catch (error) {
    return {
      isValid: false,
      errorType: 'parse_error',
      errorDetail: `JSON parse error: ${error.message}`,
      position: error.message.match(/position (\d+)/) ? 
        parseInt(error.message.match(/position (\d+)/)[1]) : null
    };
  }
  
  if (!Array.isArray(response)) {
    return {
      isValid: false,
      errorType: 'not_array',
      errorDetail: 'Parsed response is not an array',
      position: null
    };
  }
  
  for (let i = 0; i < response.length; i++) {
    const segment = response[i];
    
    // Skip string segments
    if (typeof segment === 'string') {
      continue;
    }
    
    // Validate change objects
    if (typeof segment === 'object' && segment !== null) {
      const missingFields = [];
      
      if (!segment.hasOwnProperty('original')) {
        missingFields.push('original');
      }
      
      if (!segment.hasOwnProperty('replacement')) {
        missingFields.push('replacement');
      }
      
      if (!segment.hasOwnProperty('reason')) {
        missingFields.push('reason');
      }
      
      if (missingFields.length > 0) {
        return {
          isValid: false,
          errorType: 'missing_fields',
          errorDetail: `Change object at index ${i} is missing required fields: ${missingFields.join(', ')}`,
          position: null,
          suggestion: `Ensure change objects include all required fields: original, replacement, and reason`,
          context: JSON.stringify(segment)
        };
      }
      
      // Validate field types
      if (typeof segment.original !== 'string') {
        return {
          isValid: false,
          errorType: 'invalid_field_type',
          errorDetail: `The 'original' field at index ${i} must be a string`,
          position: null
        };
      }
      
      if (typeof segment.replacement !== 'string') {
        return {
          isValid: false,
          errorType: 'invalid_field_type',
          errorDetail: `The 'replacement' field at index ${i} must be a string`,
          position: null
        };
      }
      
      if (typeof segment.reason !== 'string') {
        return {
          isValid: false,
          errorType: 'invalid_field_type',
          errorDetail: `The 'reason' field at index ${i} must be a string`,
          position: null
        };
      }
    } else {
      // Non-string, non-object segment
      return {
        isValid: false,
        errorType: 'invalid_segment_type',
        errorDetail: `Array element at index ${i} is not a string or valid change object`,
        position: null
      };
    }
  }
  
  return {
    isValid: true,
    errorType: null,
    errorDetail: null,
    position: null
  };
}

module.exports = {
  validateResponse,
  validateJsonArrayStructure,
  validateSegmentStructure
}; 