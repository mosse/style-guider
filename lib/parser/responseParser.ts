import type { Segment } from './types.js';
import { validateResponse } from './parserValidator.js';
import { createFallbackFromFragments, evaluateRecoveryPotential } from './parserRecovery.js';

/**
 * Cleans the raw API response by removing markdown formatting,
 * normalizing special characters, and ensuring valid JSON structure.
 */
export function cleanResponse(response: string): string {
  if (!response) return '';

  let cleaned = response;

  // Remove markdown code block formatting
  cleaned = cleaned.replace(/^```json\s+|\s+```$/g, '');
  cleaned = cleaned.replace(/^```\s+|\s+```$/g, '');

  // Normalize smart quotes and dashes
  cleaned = cleaned.replace(/[\u201C\u201D]/g, '"');
  cleaned = cleaned.replace(/[\u2018\u2019]/g, "'");
  cleaned = cleaned.replace(/\u2014/g, '--');
  cleaned = cleaned.replace(/\u2013/g, '-');

  // Remove non-printable characters (keep standard ASCII + whitespace)
  cleaned = cleaned.replace(/[^\x20-\x7E\n\r\t]/g, '');

  const trimmed = cleaned.trim();

  // If it doesn't look like JSON, wrap as a string
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
    const escaped = trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `["${escaped}"]`;
  }

  // Try parsing directly
  try {
    const parsed = JSON.parse(trimmed);
    // If it parsed as an object (not array), wrap it in an array
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
      return `[${trimmed}]`;
    }
    return trimmed;
  } catch {
    // Needs repair
  }

  // Attempt basic structural repairs
  let processed = trimmed;

  if (!processed.startsWith('[')) processed = '[' + processed;
  if (!processed.endsWith(']')) processed = processed + ']';

  // Fix missing commas
  processed = processed.replace(/}(\s*){/g, '},\n$1{');
  processed = processed.replace(/"(\s*){/g, '",\n$1{');
  processed = processed.replace(/}(\s*)"/g, '},\n$1"');

  // Fix unquoted property names
  for (const prop of ['original', 'replacement', 'reason', 'citation']) {
    const regex = new RegExp(`([{,]\\s*)(${prop})(\\s*:)`, 'g');
    processed = processed.replace(regex, '$1"$2"$3');
  }

  // Fix trailing commas
  processed = processed.replace(/,(\s*)\]/g, '\n]');

  // Verify the result
  try {
    JSON.parse(processed);
    return processed;
  } catch {
    // If repair didn't work, try extracting change objects
    const objectPattern = /{[^{}]*"original"[^{}]*"replacement"[^{}]*"reason"[^{}]*}/g;
    const objects = trimmed.match(objectPattern) || [];
    if (objects.length > 0) {
      return '[' + objects.join(',\n') + ']';
    }

    // Last resort: wrap as string
    const escaped = trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `["${escaped}"]`;
  }
}

/**
 * Validates and attempts to repair the cleaned response.
 */
function validateAndRepair(cleanedResponse: string): {
  isValid: boolean;
  response: string;
  usedFallback?: boolean;
  validationResult?: any;
} {
  const validationResult = validateResponse(cleanedResponse);

  if (validationResult.isValid) {
    return { isValid: true, response: cleanedResponse };
  }

  // Check recovery potential
  const recovery = evaluateRecoveryPotential(cleanedResponse);

  if (recovery.recoverabilityScore >= 50) {
    try {
      const fallback = createFallbackFromFragments(cleanedResponse);
      if (Array.isArray(fallback) && fallback.length > 0) {
        return {
          isValid: true,
          response: JSON.stringify(fallback),
          usedFallback: true,
        };
      }
    } catch {
      // Recovery failed
    }
  }

  return { isValid: false, validationResult };
}

/**
 * Main entry point: cleans, validates, repairs, and parses an API response.
 * Returns an array of Segments (strings and Change objects).
 */
export function parseResponse(response: string): Segment[] {
  if (!response || typeof response !== 'string' || response.trim() === '') {
    throw new Error('Empty or invalid response');
  }

  // Step 1: Clean
  const cleaned = cleanResponse(response);

  // Step 2: Validate and repair
  const result = validateAndRepair(cleaned);

  if (!result.isValid) {
    throw new Error(
      `Failed to parse response: ${result.validationResult?.errorDetail ?? 'unknown error'}`
    );
  }

  // Step 3: Parse
  try {
    return JSON.parse(result.response) as Segment[];
  } catch (error: any) {
    throw new Error(`JSON parse failed after validation: ${error.message}`);
  }
}
