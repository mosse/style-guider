import type { Segment, Change } from './types.js';

/**
 * Extracts valid fragments (JSON objects and strings) from a malformed response.
 */
export function extractValidFragments(response: string): Segment[] {
  const fragments: Segment[] = [];
  let currentFragment = '';
  let inString = false;
  let inObject = false;
  let objectDepth = 0;
  let escapeNext = false;

  const tryParseObject = (text: string): Change | null => {
    try {
      let cleanText = text.trim();
      if (!cleanText.startsWith('{') || !cleanText.endsWith('}')) return null;

      // Fix unquoted property names
      let fixedText = cleanText;
      for (const prop of ['original', 'replacement', 'reason', 'citation']) {
        const regex = new RegExp(`(\\{|,)\\s*(${prop})\\s*:`, 'g');
        fixedText = fixedText.replace(regex, `$1 "${prop}":`);
      }

      const parsed = JSON.parse(fixedText);

      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.original === 'string' &&
        typeof parsed.replacement === 'string' &&
        typeof parsed.reason === 'string'
      ) {
        return parsed as Change;
      }
      return null;
    } catch {
      return null;
    }
  };

  for (let i = 0; i < response.length; i++) {
    const char = response[i];

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

    // String context (outside objects)
    if (char === '"' && !inObject) {
      if (!inString) {
        inString = true;
        currentFragment = '"';
      } else {
        currentFragment += '"';
        try {
          const parsed = JSON.parse(currentFragment);
          if (typeof parsed === 'string' && parsed.trim().length > 0) {
            fragments.push(parsed);
          }
        } catch {
          // Not a valid JSON string
        }
        inString = false;
        currentFragment = '';
      }
      continue;
    }

    // Object context
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
        const parsed = tryParseObject(currentFragment);
        if (parsed) fragments.push(parsed);
        inObject = false;
        currentFragment = '';
      }
      continue;
    }

    if (inString || inObject) {
      currentFragment += char;
    }
  }

  // Try to salvage partial object
  if (inObject) {
    const parsed = tryParseObject(currentFragment + '}');
    if (parsed) fragments.push(parsed);
  }

  return fragments;
}

/**
 * Attempts to repair common JSON syntax errors.
 */
export function attemptJsonRepair(response: string): string {
  let repaired = response.trim();

  if (!repaired.startsWith('[')) repaired = '[' + repaired;
  if (!repaired.endsWith(']')) repaired = repaired + ']';

  // Fix missing commas between elements
  repaired = repaired.replace(/}(\s*){/g, '},\n$1{');
  repaired = repaired.replace(/"(\s*){/g, '",\n$1{');
  repaired = repaired.replace(/}(\s*)"/g, '},\n$1"');

  // Fix trailing commas
  repaired = repaired.replace(/,(\s*)\]/g, '\n]');

  // Fix unquoted property names
  for (const prop of ['original', 'replacement', 'reason', 'citation']) {
    const regex = new RegExp(`([{,]\\s*)(${prop})(\\s*:)`, 'g');
    repaired = repaired.replace(regex, '$1"$2"$3');
  }

  return repaired;
}

/**
 * Creates a fallback array from fragments when main parsing fails.
 * Tries repair first, then falls back to fragment extraction.
 */
export function createFallbackFromFragments(response: string): Segment[] {
  // First try repair
  try {
    const repaired = attemptJsonRepair(response);
    return JSON.parse(repaired);
  } catch {
    // Extract valid fragments
    const fragments = extractValidFragments(response);
    if (fragments.length > 0) return fragments;
    // Last resort: return raw text
    return [response.trim()];
  }
}

/**
 * Evaluates the likelihood of successfully recovering a malformed response.
 */
export function evaluateRecoveryPotential(response: string): {
  recoverabilityScore: number;
  identifiedIssues: string[];
  recommendedApproach: 'json_repair' | 'fragment_extraction' | 'raw_text_fallback';
} {
  let score = 0;
  const issues: string[] = [];

  const trimmed = response.trim();

  if (trimmed.startsWith('[')) score += 20;
  else issues.push('missing_opening_bracket');

  if (trimmed.endsWith(']')) score += 20;
  else issues.push('missing_closing_bracket');

  const hasChangeObjects =
    response.includes('"original"') ||
    response.includes('"replacement"') ||
    response.includes('"reason"');

  if (hasChangeObjects) score += 30;
  else issues.push('no_change_objects_detected');

  // Unbalanced quotes
  const quoteCount = (response.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    issues.push('unbalanced_quotes');
    score -= 15;
  }

  if (response.match(/}(\s*){/)) {
    issues.push('missing_comma_between_objects');
    score -= 5;
  }

  if (response.match(/original:|replacement:|reason:/)) {
    issues.push('unquoted_property_names');
    score += 5;
  }

  let approach: 'json_repair' | 'fragment_extraction' | 'raw_text_fallback';
  if (score >= 50) approach = 'json_repair';
  else if (score >= 20) approach = 'fragment_extraction';
  else approach = 'raw_text_fallback';

  return { recoverabilityScore: score, identifiedIssues: issues, recommendedApproach: approach };
}
