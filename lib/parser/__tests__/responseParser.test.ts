import { describe, it, expect } from 'vitest';
import { parseResponse, cleanResponse } from '../responseParser.js';
import { isChange } from '../types.js';

describe('cleanResponse', () => {
  it('returns empty string for empty input', () => {
    expect(cleanResponse('')).toBe('');
  });

  it('removes markdown code block formatting', () => {
    const input = '```json\n["hello"]\n```';
    expect(cleanResponse(input)).toBe('["hello"]');
  });

  it('normalizes smart quotes', () => {
    const input = '[\u201CHello\u201D]';
    const cleaned = cleanResponse(input);
    expect(cleaned).toContain('"Hello"');
  });

  it('wraps non-JSON text as a string array', () => {
    const result = cleanResponse('Just plain text');
    expect(result).toContain('Just plain text');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(['Just plain text']);
  });

  it('returns valid JSON as-is', () => {
    const input = '["text", {"original": "a", "replacement": "b", "reason": "c"}]';
    expect(cleanResponse(input)).toBe(input);
  });

  it('fixes missing commas between objects', () => {
    const input = '[{"original":"a","replacement":"b","reason":"c"}{"original":"d","replacement":"e","reason":"f"}]';
    const result = cleanResponse(input);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
  });

  it('fixes unquoted property names', () => {
    const input = '[{original:"a", replacement:"b", reason:"c"}]';
    const result = cleanResponse(input);
    const parsed = JSON.parse(result);
    expect(parsed[0].original).toBe('a');
  });

  it('fixes trailing commas', () => {
    const input = '["hello",]';
    const result = cleanResponse(input);
    const parsed = JSON.parse(result);
    expect(parsed[0]).toBe('hello');
  });

  it('adds missing array brackets', () => {
    const input = '{"original":"a","replacement":"b","reason":"c"}';
    const result = cleanResponse(input);
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('handles citation field in property name fix', () => {
    const input = '[{original:"a", replacement:"b", reason:"c", citation:"d"}]';
    const result = cleanResponse(input);
    const parsed = JSON.parse(result);
    expect(parsed[0].citation).toBe('d');
  });
});

describe('parseResponse', () => {
  it('throws for empty input', () => {
    expect(() => parseResponse('')).toThrow('Empty or invalid response');
    expect(() => parseResponse('   ')).toThrow('Empty or invalid response');
  });

  it('parses valid JSON array with strings', () => {
    const input = '["Hello world."]';
    const result = parseResponse(input);
    expect(result).toEqual(['Hello world.']);
  });

  it('parses valid JSON array with change objects', () => {
    const input = JSON.stringify([
      'The committee had ',
      { original: '7 members', replacement: 'seven members', reason: 'Spell out numbers' },
      ' present.',
    ]);

    const result = parseResponse(input);
    expect(result).toHaveLength(3);
    expect(typeof result[0]).toBe('string');
    expect(isChange(result[1])).toBe(true);
  });

  it('parses change objects with citation field', () => {
    const input = JSON.stringify([
      {
        original: '7',
        replacement: 'seven',
        reason: 'Number spelling',
        citation: 'Spell out one to nine.',
      },
    ]);

    const result = parseResponse(input);
    expect(result).toHaveLength(1);
    const change = result[0];
    expect(isChange(change)).toBe(true);
    if (isChange(change)) {
      expect(change.citation).toBe('Spell out one to nine.');
    }
  });

  it('handles markdown-wrapped JSON', () => {
    const input = '```json\n["Hello"]\n```';
    const result = parseResponse(input);
    expect(result).toEqual(['Hello']);
  });

  it('recovers from missing commas between objects', () => {
    const input =
      '[{"original":"a","replacement":"b","reason":"c"}{"original":"d","replacement":"e","reason":"f"}]';
    const result = parseResponse(input);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('recovers from malformed JSON via fragment extraction', () => {
    const input =
      '["Some text" {"original":"old","replacement":"new","reason":"test"} "more text"';
    const result = parseResponse(input);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('handles smart quotes in response', () => {
    const input = '[\u201CHello world.\u201D]';
    const result = parseResponse(input);
    expect(result).toHaveLength(1);
  });

  it('handles response with control characters', () => {
    const input = '["Hello\x00 world"]';
    const result = parseResponse(input);
    expect(result).toHaveLength(1);
  });

  it('handles mixed valid and recovery segments', () => {
    const input = JSON.stringify([
      'Unchanged text. ',
      { original: 'old', replacement: 'new', reason: 'test', citation: 'style rule' },
      ' More text.',
    ]);

    const result = parseResponse(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('Unchanged text. ');
    expect(result[2]).toBe(' More text.');
  });

  it('handles change objects without citation (backward compat)', () => {
    const input = JSON.stringify([
      { original: 'a', replacement: 'b', reason: 'c' },
    ]);

    const result = parseResponse(input);
    expect(result).toHaveLength(1);
    if (isChange(result[0])) {
      expect(result[0].citation).toBeUndefined();
    }
  });
});
