import { describe, it, expect } from 'vitest';
import {
  extractValidFragments,
  attemptJsonRepair,
  createFallbackFromFragments,
  evaluateRecoveryPotential,
} from '../parserRecovery.js';
import { isChange } from '../types.js';

describe('extractValidFragments', () => {
  it('extracts string fragments', () => {
    const input = '"Hello" "World"';
    const fragments = extractValidFragments(input);
    expect(fragments).toContain('Hello');
    expect(fragments).toContain('World');
  });

  it('extracts valid change objects', () => {
    const input = '{"original":"old","replacement":"new","reason":"test"}';
    const fragments = extractValidFragments(input);
    expect(fragments).toHaveLength(1);
    expect(isChange(fragments[0])).toBe(true);
  });

  it('extracts change objects with citation', () => {
    const input = '{"original":"a","replacement":"b","reason":"c","citation":"d"}';
    const fragments = extractValidFragments(input);
    expect(fragments).toHaveLength(1);
    if (isChange(fragments[0])) {
      expect(fragments[0].citation).toBe('d');
    }
  });

  it('handles unquoted property names', () => {
    const input = '{original:"old",replacement:"new",reason:"test"}';
    const fragments = extractValidFragments(input);
    expect(fragments).toHaveLength(1);
  });

  it('skips invalid fragments', () => {
    const input = '{"invalid": true} "valid string"';
    const fragments = extractValidFragments(input);
    // Should only get the string, not the incomplete object
    expect(fragments.some((f) => f === 'valid string')).toBe(true);
  });

  it('handles partial object at end', () => {
    const input = '{"original":"a","replacement":"b","reason":"c"';
    const fragments = extractValidFragments(input);
    // Should try to salvage with closing brace
    expect(fragments).toHaveLength(1);
  });

  it('returns empty array for garbage input', () => {
    const fragments = extractValidFragments('not json at all');
    expect(fragments).toEqual([]);
  });
});

describe('attemptJsonRepair', () => {
  it('adds missing brackets', () => {
    const input = '"hello"';
    const result = attemptJsonRepair(input);
    expect(result.startsWith('[')).toBe(true);
    expect(result.endsWith(']')).toBe(true);
  });

  it('fixes missing commas', () => {
    const input = '[{"original":"a","replacement":"b","reason":"c"}{"original":"d","replacement":"e","reason":"f"}]';
    const result = attemptJsonRepair(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('fixes trailing commas', () => {
    const input = '["hello",]';
    const result = attemptJsonRepair(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('fixes unquoted property names', () => {
    const input = '[{original:"a",replacement:"b",reason:"c"}]';
    const result = attemptJsonRepair(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('fixes unquoted citation property name', () => {
    const input = '[{original:"a",replacement:"b",reason:"c",citation:"d"}]';
    const result = attemptJsonRepair(input);
    const parsed = JSON.parse(result);
    expect(parsed[0].citation).toBe('d');
  });
});

describe('createFallbackFromFragments', () => {
  it('repairs and parses when possible', () => {
    const input = '{"original":"a","replacement":"b","reason":"c"}';
    const result = createFallbackFromFragments(input);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it('falls back to fragment extraction', () => {
    const input = '{"original":"a","replacement":"b","reason":"c" bad json here';
    const result = createFallbackFromFragments(input);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('returns raw text as last resort', () => {
    const input = 'completely invalid input';
    const result = createFallbackFromFragments(input);
    expect(result).toEqual(['completely invalid input']);
  });
});

describe('evaluateRecoveryPotential', () => {
  it('gives high score for well-structured content', () => {
    const input = '[{"original":"a","replacement":"b","reason":"c"}]';
    const result = evaluateRecoveryPotential(input);
    expect(result.recoverabilityScore).toBeGreaterThanOrEqual(50);
    expect(result.recommendedApproach).toBe('json_repair');
  });

  it('gives low score for unstructured content', () => {
    const input = 'This is just plain text with no JSON structure.';
    const result = evaluateRecoveryPotential(input);
    expect(result.recoverabilityScore).toBeLessThan(50);
  });

  it('identifies unbalanced quotes', () => {
    const input = '["hello';
    const result = evaluateRecoveryPotential(input);
    expect(result.identifiedIssues).toContain('unbalanced_quotes');
  });

  it('identifies missing brackets', () => {
    const input = '{"original":"a","replacement":"b","reason":"c"}';
    const result = evaluateRecoveryPotential(input);
    expect(result.identifiedIssues).toContain('missing_opening_bracket');
    expect(result.identifiedIssues).toContain('missing_closing_bracket');
  });

  it('identifies unquoted property names as fixable', () => {
    const input = '[{original:"a",replacement:"b",reason:"c"}]';
    const result = evaluateRecoveryPotential(input);
    expect(result.identifiedIssues).toContain('unquoted_property_names');
  });
});
