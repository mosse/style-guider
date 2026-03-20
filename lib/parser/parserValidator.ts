import type { Segment } from './types.js';

export interface ValidationResult {
  isValid: boolean;
  errorType: string | null;
  errorDetail: string | null;
  position: number | null;
  suggestion?: string;
  context?: string;
}

/**
 * Validates the overall response structure.
 */
export function validateResponse(response: string): ValidationResult {
  if (!response || typeof response !== 'string') {
    return {
      isValid: false,
      errorType: 'invalid_input',
      errorDetail: 'Response is empty or not a string',
      position: null,
    };
  }

  const trimmed = response.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      errorType: 'empty_response',
      errorDetail: 'Response is empty after trimming whitespace',
      position: null,
    };
  }

  // Validate JSON array structure (brackets, balancing)
  const structureResult = validateJsonArrayStructure(trimmed);
  if (!structureResult.isValid) {
    return structureResult;
  }

  // Parse and validate contents
  try {
    const parsed = JSON.parse(trimmed);

    if (!Array.isArray(parsed)) {
      return {
        isValid: false,
        errorType: 'not_array',
        errorDetail: 'Response parsed successfully but is not an array',
        position: null,
      };
    }

    if (parsed.length === 0) {
      return {
        isValid: false,
        errorType: 'empty_array',
        errorDetail: 'Response is an empty array',
        position: null,
      };
    }

    // Validate each segment
    for (let i = 0; i < parsed.length; i++) {
      const segment = parsed[i];

      if (segment === null || (typeof segment !== 'string' && typeof segment !== 'object')) {
        return {
          isValid: false,
          errorType: 'invalid_segment_type',
          errorDetail: `Array element at index ${i} is not a string or object`,
          position: null,
        };
      }

      if (typeof segment === 'object') {
        // Validate change object: must have original, replacement, reason
        // May optionally have citation
        if (!segment.original || !segment.replacement || !segment.reason) {
          return {
            isValid: false,
            errorType: 'invalid_change_object',
            errorDetail: `Change object at index ${i} is missing required fields`,
            position: null,
          };
        }

        if (
          typeof segment.original !== 'string' ||
          typeof segment.replacement !== 'string' ||
          typeof segment.reason !== 'string'
        ) {
          return {
            isValid: false,
            errorType: 'invalid_field_type',
            errorDetail: `Change object at index ${i} has fields with incorrect types`,
            position: null,
          };
        }

        // Validate optional citation field type
        if (segment.citation !== undefined && typeof segment.citation !== 'string') {
          return {
            isValid: false,
            errorType: 'invalid_field_type',
            errorDetail: `The 'citation' field at index ${i} must be a string`,
            position: null,
          };
        }
      }
    }

    return {
      isValid: true,
      errorType: null,
      errorDetail: null,
      position: null,
    };
  } catch (error: any) {
    return {
      isValid: false,
      errorType: 'parse_error',
      errorDetail: `JSON parse error: ${error.message}`,
      position: error.message.match(/position (\d+)/)
        ? parseInt(error.message.match(/position (\d+)/)[1])
        : null,
    };
  }
}

/**
 * Validates JSON array structure without full parsing.
 * Checks bracket balancing and basic structure.
 */
export function validateJsonArrayStructure(response: string): ValidationResult {
  const trimmed = response.trim();

  if (!trimmed.startsWith('[')) {
    return {
      isValid: false,
      errorType: 'missing_opening_bracket',
      errorDetail: 'Response does not start with [',
      position: 0,
      suggestion: 'Ensure the response starts with [',
      context: trimmed.substring(0, 20),
    };
  }

  if (!trimmed.endsWith(']')) {
    return {
      isValid: false,
      errorType: 'missing_closing_bracket',
      errorDetail: 'Response does not end with ]',
      position: trimmed.length,
      suggestion: 'Ensure the response ends with ]',
      context: trimmed.substring(Math.max(0, trimmed.length - 20)),
    };
  }

  // Bracket balancing
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '[') bracketCount++;
      else if (char === ']') {
        bracketCount--;
        if (bracketCount < 0) {
          return {
            isValid: false,
            errorType: 'unbalanced_brackets',
            errorDetail: 'Found ] without matching [',
            position: i,
            context: trimmed.substring(Math.max(0, i - 10), Math.min(trimmed.length, i + 10)),
          };
        }
      }
    }
  }

  if (bracketCount > 0) {
    return {
      isValid: false,
      errorType: 'unbalanced_brackets',
      errorDetail: 'Found [ without matching ]',
      position: null,
    };
  }

  return { isValid: true, errorType: null, errorDetail: null, position: null };
}
