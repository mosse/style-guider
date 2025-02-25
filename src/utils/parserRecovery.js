/**
 * Parser Recovery Module
 * 
 * This module provides functions for recovering from malformed JSON responses
 * by extracting valid fragments and attempting repairs on common syntax errors.
 */

/**
 * Extracts valid fragments (JSON objects and strings) from a malformed response.
 * 
 * @param {string} response - The malformed response string
 * @returns {Array} Array of extracted valid fragments (objects and strings)
 */
function extractValidFragments(response) {
  const fragments = [];
  let currentFragment = '';
  let inString = false;
  let inObject = false;
  let objectDepth = 0;
  let escapeNext = false;
  
  // Helper to try parsing a potential object fragment
  const tryParseObject = (text) => {
    try {
      // Clean up the fragment before parsing
      let cleanText = text.trim();
      
      // If it doesn't look like an object, return null
      if (!cleanText.startsWith('{') || !cleanText.endsWith('}')) {
        return null;
      }
      
      // Try to fix unquoted property names before parsing
      const propertyNames = ['original', 'replacement', 'reason'];
      let fixedText = cleanText;
      
      propertyNames.forEach(prop => {
        const unquotedRegex = new RegExp(`(\\{|,)\\s*(${prop})\\s*:`, 'g');
        fixedText = fixedText.replace(unquotedRegex, `$1 "${prop}":`);
      });
      
      // Try to parse it
      const parsed = JSON.parse(fixedText);
      
      // Check if it's a valid change object with required fields
      if (parsed && 
          typeof parsed === 'object' && 
          parsed.original && 
          parsed.replacement && 
          parsed.reason) {
        return parsed;
      }
      
      return null;
    } catch (e) {
      return null;
    }
  };
  
  // Process character by character
  for (let i = 0; i < response.length; i++) {
    const char = response[i];
    
    // Handle escape sequences
    if (escapeNext) {
      currentFragment += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      currentFragment += char;
      escapeNext = true;
      continue;
    }
    
    // Handle string context
    if (char === '"' && !inObject) {
      if (!inString) {
        // Starting a potential string fragment
        inString = true;
        currentFragment = '"';
      } else {
        // Ending a string fragment
        currentFragment += '"';
        
        // Try to parse it as a JSON string
        try {
          const parsedString = JSON.parse(currentFragment);
          if (typeof parsedString === 'string' && parsedString.trim().length > 0) {
            fragments.push(parsedString);
          }
        } catch (e) {
          // Not a valid JSON string, ignore
        }
        
        inString = false;
        currentFragment = '';
      }
      continue;
    }
    
    // Handle object context
    if (!inString && char === '{') {
      if (!inObject) {
        inObject = true;
        objectDepth = 1;
        currentFragment = '{';
      } else {
        objectDepth++;
        currentFragment += char;
      }
      continue;
    }
    
    if (!inString && inObject && char === '}') {
      objectDepth--;
      currentFragment += char;
      
      if (objectDepth === 0) {
        // We've completed an object, try to parse it
        const parsedObject = tryParseObject(currentFragment);
        if (parsedObject) {
          fragments.push(parsedObject);
        }
        
        inObject = false;
        currentFragment = '';
      }
      continue;
    }
    
    // Accumulate the current character
    if (inString || inObject) {
      currentFragment += char;
    }
  }
  
  // Handle any remaining fragment (could happen with malformed input)
  if (inObject) {
    // Try to salvage a partial object by adding a closing brace
    const partialObject = tryParseObject(currentFragment + '}');
    if (partialObject) {
      fragments.push(partialObject);
    }
  }
  
  return fragments;
}

/**
 * Attempts to repair common JSON syntax errors in a response.
 * 
 * @param {string} response - The potentially malformed response string
 * @returns {string} The repaired response string
 */
function attemptJsonRepair(response) {
  let repaired = response.trim();
  
  // Ensure the response is wrapped in array brackets
  if (!repaired.startsWith('[')) {
    repaired = '[' + repaired;
  }
  
  if (!repaired.endsWith(']')) {
    repaired = repaired + ']';
  }
  
  // Fix missing commas between objects or strings
  repaired = repaired.replace(/}(\s*){/g, '},\n$1{');
  repaired = repaired.replace(/"(\s*){/g, '",\n$1{');
  repaired = repaired.replace(/}(\s*)"/g, '},\n$1"');
  
  // Fix trailing commas (last item in array should not have a comma)
  repaired = repaired.replace(/,(\s*)\]/g, '\n]');
  
  // Add quotes around unquoted property names (for the three required fields)
  // More robust regex that handles various whitespace patterns
  repaired = repaired.replace(/([{,]\s*)(original)(\s*:)/g, '$1"$2"$3');
  repaired = repaired.replace(/([{,]\s*)(replacement)(\s*:)/g, '$1"$2"$3');
  repaired = repaired.replace(/([{,]\s*)(reason)(\s*:)/g, '$1"$2"$3');
  
  return repaired;
}

/**
 * Creates a fallback array from fragments when main parsing fails.
 * First tries to repair the JSON, and if that fails, extracts fragments.
 * 
 * @param {string} response - The malformed response string
 * @returns {Array} Array of recovered segments (strings and objects)
 */
function createFallbackFromFragments(response) {
  // First try to repair the JSON
  try {
    const repaired = attemptJsonRepair(response);
    return JSON.parse(repaired);
  } catch (error) {
    // If repair failed, extract fragments
    const fragments = extractValidFragments(response);
    
    if (fragments.length > 0) {
      // If we have fragments, use them
      return fragments;
    } else {
      // Last resort: return the raw text as a single string segment
      return [response.trim()];
    }
  }
}

/**
 * Estimates the chance of successful recovery based on response characteristics.
 * 
 * @param {string} response - The response string to evaluate
 * @returns {Object} Recovery prognosis including likelihood and identified issues
 */
function evaluateRecoveryPotential(response) {
  const prognosis = {
    recoverabilityScore: 0,
    identifiedIssues: [],
    recommendedApproach: null
  };
  
  // Check for key indicators of recoverable content
  const hasOpeningBracket = response.trim().startsWith('[');
  const hasClosingBracket = response.trim().endsWith(']');
  const hasChangeObjects = response.includes('"original"') || 
                          response.includes('original:') ||
                          ((response.includes('"replacement"') || response.includes('replacement:')) && 
                          (response.includes('"reason"') || response.includes('reason:')));
  
  // Increment score based on positive indicators
  if (hasOpeningBracket) prognosis.recoverabilityScore += 20;
  if (hasClosingBracket) prognosis.recoverabilityScore += 20;
  if (hasChangeObjects) prognosis.recoverabilityScore += 30;
  
  // Identify specific issues
  if (!hasOpeningBracket) {
    prognosis.identifiedIssues.push('missing_opening_bracket');
  }
  
  if (!hasClosingBracket) {
    prognosis.identifiedIssues.push('missing_closing_bracket');
  }
  
  if (!hasChangeObjects) {
    prognosis.identifiedIssues.push('no_change_objects_detected');
  }
  
  // Check for unbalanced quotes
  const quoteCount = (response.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    prognosis.identifiedIssues.push('unbalanced_quotes');
    prognosis.recoverabilityScore -= 15;
  }
  
  // Check for common syntax errors
  if (response.match(/}(\s*){/)) {
    prognosis.identifiedIssues.push('missing_comma_between_objects');
    prognosis.recoverabilityScore -= 5;
  }
  
  if (response.match(/original:|replacement:|reason:/)) {
    prognosis.identifiedIssues.push('unquoted_property_names');
    prognosis.recoverabilityScore += 5; // This is actually easier to fix, so add points
  }
  
  // Recommend an approach based on recoverability score
  if (prognosis.recoverabilityScore >= 50) {
    prognosis.recommendedApproach = 'json_repair';
  } else if (prognosis.recoverabilityScore >= 20) {
    prognosis.recommendedApproach = 'fragment_extraction';
  } else {
    prognosis.recommendedApproach = 'raw_text_fallback';
  }
  
  return prognosis;
}

module.exports = {
  extractValidFragments,
  attemptJsonRepair,
  createFallbackFromFragments,
  evaluateRecoveryPotential
}; 