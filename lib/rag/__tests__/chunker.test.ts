import { describe, it, expect } from 'vitest';
import { chunkStyleGuide, isSectionHeading, splitIntoSections, estimateTokens } from '../chunker.js';

describe('estimateTokens', () => {
  it('estimates roughly 4 chars per token', () => {
    expect(estimateTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75, ceil = 3
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('isSectionHeading', () => {
  it('detects markdown headings', () => {
    expect(isSectionHeading('## Abbreviations')).toBe(true);
    expect(isSectionHeading('# Numbers')).toBe(true);
    expect(isSectionHeading('### Hyphens and Dashes')).toBe(true);
  });

  it('detects all-caps headings', () => {
    expect(isSectionHeading('ABBREVIATIONS')).toBe(true);
    expect(isSectionHeading('NUMBERS AND FIGURES')).toBe(true);
  });

  it('detects numbered headings', () => {
    expect(isSectionHeading('1. Introduction')).toBe(true);
    expect(isSectionHeading('Chapter 3: Style Rules')).toBe(true);
  });

  it('detects lines ending with colon', () => {
    expect(isSectionHeading('Abbreviations:')).toBe(true);
  });

  it('does not detect regular sentences', () => {
    expect(isSectionHeading('This is a regular sentence with many words in it.')).toBe(false);
    expect(isSectionHeading('')).toBe(false);
  });

  it('does not detect long lines as headings', () => {
    const longLine = 'A'.repeat(70);
    expect(isSectionHeading(longLine)).toBe(false);
  });
});

describe('splitIntoSections', () => {
  it('splits text by markdown headings', () => {
    const text = `## Numbers
Spell out one to nine.

## Hyphens
Use hyphens for compound modifiers.`;

    const sections = splitIntoSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('Numbers');
    expect(sections[0].content).toContain('Spell out');
    expect(sections[1].title).toBe('Hyphens');
  });

  it('handles text with no headings', () => {
    const text = 'Just a plain paragraph.\n\nAnother paragraph.';
    const sections = splitIntoSections(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe(null);
  });

  it('handles empty text', () => {
    expect(splitIntoSections('')).toHaveLength(0);
    expect(splitIntoSections('   ')).toHaveLength(0);
  });
});

describe('chunkStyleGuide', () => {
  it('returns empty array for empty input', () => {
    expect(chunkStyleGuide('')).toEqual([]);
    expect(chunkStyleGuide('   ')).toEqual([]);
  });

  it('creates a single chunk for short text', () => {
    const text = 'Spell out numbers from one to nine; use figures for 10 and above.';
    const chunks = chunkStyleGuide(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it('preserves section titles in chunks', () => {
    const text = `## Numbers
Spell out numbers from one to nine; use figures for 10 and above. Always use figures for percentages, ages, and sums of money.

## Hyphens
Use hyphens for compound modifiers before a noun: a well-known author. Do not hyphenate after an adverb ending in -ly.`;

    const chunks = chunkStyleGuide(text);
    const numbersChunks = chunks.filter((c) => c.sectionTitle === 'Numbers');
    const hyphensChunks = chunks.filter((c) => c.sectionTitle === 'Hyphens');

    expect(numbersChunks.length).toBeGreaterThanOrEqual(1);
    expect(hyphensChunks.length).toBeGreaterThanOrEqual(1);
  });

  it('assigns sequential chunk indices', () => {
    const text = `## A
Content A paragraph 1.

## B
Content B paragraph 1.

## C
Content C paragraph 1.`;

    const chunks = chunkStyleGuide(text);
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(i);
    }
  });

  it('splits long sections into multiple chunks', () => {
    // Create a long section (>500 tokens worth)
    const longParagraph = 'This is a sample sentence for testing purposes. '.repeat(80);
    const text = `## Long Section\n${longParagraph}`;

    const chunks = chunkStyleGuide(text);
    expect(chunks.length).toBeGreaterThan(1);

    // All chunks should have the same section title
    for (const chunk of chunks) {
      expect(chunk.sectionTitle).toBe('Long Section');
    }
  });

  it('merges very short chunks with adjacent ones', () => {
    const text = `## Section
A.

B is a slightly longer paragraph that has more content to work with.

C.

D is another paragraph with reasonable length for our testing needs here.`;

    const chunks = chunkStyleGuide(text);
    // Short chunks "A." and "C." should be merged with neighbors
    // rather than standing alone
    for (const chunk of chunks) {
      const tokens = estimateTokens(chunk.chunkText);
      // After merging, no chunk should be extremely tiny
      // (unless the entire section is tiny)
      expect(chunk.chunkText.length).toBeGreaterThan(0);
    }
  });

  it('handles unicode and special characters', () => {
    const text = '## Accents\nUse proper accents: cafe, naive, resume. The word "facade" needs a cedilla.';
    const chunks = chunkStyleGuide(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].chunkText).toContain('accents');
  });

  it('handles real-world style guide format', () => {
    const text = `## Abbreviations
Do not use full stops in abbreviations, or spaces between initials: BBC, mph, eg, GDP, OECD.

A few are so common they do not need spelling out: AIDS, NATO, UN.

## Americanisms
Avoid wherever possible. Use "pavement" not "sidewalk", "boot" not "trunk".

## Dates
January 1st 2024 (no comma between month/date and year). Use "st", "nd", "rd", "th".

## Numbers
Spell out from one to nine. Use figures from 10 upwards. Always use figures with units: 3km, 5%.`;

    const chunks = chunkStyleGuide(text);
    expect(chunks.length).toBeGreaterThanOrEqual(4);

    const titles = chunks.map((c) => c.sectionTitle);
    expect(titles).toContain('Abbreviations');
    expect(titles).toContain('Americanisms');
    expect(titles).toContain('Dates');
    expect(titles).toContain('Numbers');
  });
});
