import { describe, it, expect } from 'vitest';
import { verifyCitations, isCitationVerified, normalize } from '../citationVerifier.js';
import type { RetrievedChunk, Segment, Change } from '../../parser/types.js';

const sampleChunks: RetrievedChunk[] = [
  {
    chunkText: 'Spell out numbers from one to nine; use figures for 10 and above. Always use figures for percentages.',
    sectionTitle: 'Numbers',
    similarity: 0.85,
  },
  {
    chunkText: 'Use hyphens for compound modifiers before a noun: a well-known author. Do not hyphenate after an adverb ending in -ly.',
    sectionTitle: 'Hyphens',
    similarity: 0.78,
  },
];

describe('normalize', () => {
  it('collapses whitespace and lowercases', () => {
    expect(normalize('  Hello   World  ')).toBe('hello world');
    expect(normalize('One\n\nTwo')).toBe('one two');
  });
});

describe('isCitationVerified', () => {
  it('returns true for exact substring match', () => {
    expect(
      isCitationVerified('Spell out numbers from one to nine', sampleChunks)
    ).toBe(true);
  });

  it('returns true for case-insensitive match', () => {
    expect(
      isCitationVerified('spell out numbers from one to nine', sampleChunks)
    ).toBe(true);
  });

  it('returns true for whitespace-normalized match', () => {
    expect(
      isCitationVerified('Spell  out  numbers  from  one  to  nine', sampleChunks)
    ).toBe(true);
  });

  it('returns false for paraphrased text', () => {
    expect(
      isCitationVerified('Write out numbers below ten and use digits for ten and above', sampleChunks)
    ).toBe(false);
  });

  it('returns false for completely fabricated citation', () => {
    expect(
      isCitationVerified('Always capitalize the first word of every sentence', sampleChunks)
    ).toBe(false);
  });

  it('returns false for empty citation', () => {
    expect(isCitationVerified('', sampleChunks)).toBe(false);
  });

  it('returns false for very short citation', () => {
    expect(isCitationVerified('use', sampleChunks)).toBe(false);
  });

  it('returns true for fuzzy match with high word overlap', () => {
    // Most words present but slightly different punctuation
    expect(
      isCitationVerified('Use hyphens for compound modifiers before a noun', sampleChunks)
    ).toBe(true);
  });
});

describe('verifyCitations', () => {
  it('keeps changes with verified citations', () => {
    const segments: Segment[] = [
      'The committee had ',
      {
        original: '7 members',
        replacement: 'seven members',
        reason: 'Spell out single-digit numbers',
        citation: 'Spell out numbers from one to nine',
      },
      ' present.',
    ];

    const result = verifyCitations(segments, sampleChunks);
    expect(result.segments).toHaveLength(3);
    expect(result.stats.verifiedCitations).toBe(1);
    expect(result.stats.strippedCitations).toBe(0);
  });

  it('strips changes with no citation', () => {
    const segments: Segment[] = [
      'The ',
      {
        original: 'committee',
        replacement: 'panel',
        reason: 'Better word choice',
        // no citation
      } as Change,
      ' met.',
    ];

    const result = verifyCitations(segments, sampleChunks);
    // The change should be replaced with the original text
    expect(result.segments).toEqual(['The ', 'committee', ' met.']);
    expect(result.stats.strippedCitations).toBe(1);
  });

  it('strips changes with fabricated citations', () => {
    const segments: Segment[] = [
      {
        original: 'big',
        replacement: 'large',
        reason: 'Style preference',
        citation: 'Always prefer "large" over "big" in formal writing.',
      },
    ];

    const result = verifyCitations(segments, sampleChunks);
    expect(result.segments).toEqual(['big']);
    expect(result.stats.strippedCitations).toBe(1);
  });

  it('preserves string segments unchanged', () => {
    const segments: Segment[] = ['Hello world.'];
    const result = verifyCitations(segments, sampleChunks);
    expect(result.segments).toEqual(['Hello world.']);
    expect(result.stats.totalSuggestions).toBe(0);
  });

  it('handles mixed verified and unverified citations', () => {
    const segments: Segment[] = [
      {
        original: '7 items',
        replacement: 'seven items',
        reason: 'Number spelling',
        citation: 'Spell out numbers from one to nine',
      },
      ' and ',
      {
        original: 'big',
        replacement: 'large',
        reason: 'Word choice',
        citation: 'This citation is completely made up.',
      },
    ];

    const result = verifyCitations(segments, sampleChunks);
    expect(result.stats.verifiedCitations).toBe(1);
    expect(result.stats.strippedCitations).toBe(1);
    expect(result.stats.totalSuggestions).toBe(2);
  });
});
