import { describe, it, expect } from 'vitest';
import { validateResponse, validateJsonArrayStructure } from '../parserValidator.js';

describe('validateJsonArrayStructure', () => {
  it('accepts valid array structure', () => {
    expect(validateJsonArrayStructure('["hello"]').isValid).toBe(true);
    expect(validateJsonArrayStructure('[1, 2, 3]').isValid).toBe(true);
  });

  it('rejects missing opening bracket', () => {
    const result = validateJsonArrayStructure('"hello"]');
    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe('missing_opening_bracket');
  });

  it('rejects missing closing bracket', () => {
    const result = validateJsonArrayStructure('["hello"');
    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe('missing_closing_bracket');
  });

  it('rejects unbalanced brackets', () => {
    const result = validateJsonArrayStructure('[["hello"]');
    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe('unbalanced_brackets');
  });

  it('handles escaped quotes in strings', () => {
    const result = validateJsonArrayStructure('["He said \\"hello\\""]');
    expect(result.isValid).toBe(true);
  });
});

describe('validateResponse', () => {
  it('rejects empty input', () => {
    expect(validateResponse('').isValid).toBe(false);
    expect(validateResponse('   ').isValid).toBe(false);
  });

  it('rejects non-array JSON', () => {
    expect(validateResponse('{"key": "value"}').isValid).toBe(false);
  });

  it('rejects empty array', () => {
    expect(validateResponse('[]').isValid).toBe(false);
  });

  it('accepts array of strings', () => {
    expect(validateResponse('["hello", "world"]').isValid).toBe(true);
  });

  it('accepts array with change objects', () => {
    const input = JSON.stringify([
      { original: 'a', replacement: 'b', reason: 'c' },
    ]);
    expect(validateResponse(input).isValid).toBe(true);
  });

  it('accepts change objects with citation field', () => {
    const input = JSON.stringify([
      { original: 'a', replacement: 'b', reason: 'c', citation: 'd' },
    ]);
    expect(validateResponse(input).isValid).toBe(true);
  });

  it('rejects change objects missing required fields', () => {
    const input = JSON.stringify([{ original: 'a', replacement: 'b' }]);
    const result = validateResponse(input);
    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe('invalid_change_object');
  });

  it('rejects change objects with wrong field types', () => {
    const input = JSON.stringify([{ original: 123, replacement: 'b', reason: 'c' }]);
    const result = validateResponse(input);
    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe('invalid_field_type');
  });

  it('rejects non-string citation field', () => {
    const input = JSON.stringify([
      { original: 'a', replacement: 'b', reason: 'c', citation: 123 },
    ]);
    const result = validateResponse(input);
    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe('invalid_field_type');
  });

  it('rejects invalid segment types', () => {
    const result = validateResponse('[null]');
    expect(result.isValid).toBe(false);
  });

  it('accepts mixed string and object segments', () => {
    const input = JSON.stringify([
      'text',
      { original: 'a', replacement: 'b', reason: 'c' },
      'more text',
    ]);
    expect(validateResponse(input).isValid).toBe(true);
  });
});
