import { describe, it, expect } from 'vitest';
import { buildAnalysisPrompt } from '../promptBuilder.js';
import type { RetrievedChunk } from '../../parser/types.js';

const sampleChunks: RetrievedChunk[] = [
  {
    chunkText: 'Spell out numbers from one to nine.',
    sectionTitle: 'Numbers',
    similarity: 0.9,
  },
  {
    chunkText: 'Use hyphens for compound modifiers.',
    sectionTitle: 'Hyphens',
    similarity: 0.8,
  },
];

describe('buildAnalysisPrompt', () => {
  it('includes user text in draft_document tags', () => {
    const prompt = buildAnalysisPrompt('Test input text.', sampleChunks);
    expect(prompt).toContain('<draft_document>');
    expect(prompt).toContain('Test input text.');
    expect(prompt).toContain('</draft_document>');
  });

  it('includes style guide context with section tags', () => {
    const prompt = buildAnalysisPrompt('Test.', sampleChunks);
    expect(prompt).toContain('<style_guide_context>');
    expect(prompt).toContain('<section title="Numbers">');
    expect(prompt).toContain('Spell out numbers from one to nine.');
    expect(prompt).toContain('<section title="Hyphens">');
    expect(prompt).toContain('</style_guide_context>');
  });

  it('requires citation field in instructions', () => {
    const prompt = buildAnalysisPrompt('Test.', sampleChunks);
    expect(prompt).toContain('"citation"');
    expect(prompt).toContain('EXACT verbatim quote');
    expect(prompt).toContain('do NOT make the change');
  });

  it('includes JSON formatting rules', () => {
    const prompt = buildAnalysisPrompt('Test.', sampleChunks);
    expect(prompt).toContain('valid JSON array');
    expect(prompt).toContain('original');
    expect(prompt).toContain('replacement');
    expect(prompt).toContain('reason');
  });

  it('includes granularity instructions', () => {
    const prompt = buildAnalysisPrompt('Test.', sampleChunks);
    expect(prompt).toContain('granular level');
    expect(prompt).toContain('NEVER edit a whole paragraph');
  });

  it('handles chunks without section titles', () => {
    const chunks: RetrievedChunk[] = [
      { chunkText: 'Some rule.', sectionTitle: null, similarity: 0.7 },
    ];
    const prompt = buildAnalysisPrompt('Test.', chunks);
    expect(prompt).toContain('<section>');
    expect(prompt).toContain('Some rule.');
  });

  it('escapes XML special characters in section titles', () => {
    const chunks: RetrievedChunk[] = [
      { chunkText: 'Rule text.', sectionTitle: 'Q&A "Section"', similarity: 0.7 },
    ];
    const prompt = buildAnalysisPrompt('Test.', chunks);
    expect(prompt).toContain('Q&amp;A &quot;Section&quot;');
  });

  it('includes example response format', () => {
    const prompt = buildAnalysisPrompt('Test.', sampleChunks);
    expect(prompt).toContain('Example response format');
  });

  it('includes bad example warning', () => {
    const prompt = buildAnalysisPrompt('Test.', sampleChunks);
    expect(prompt).toContain('BAD RESPONSE FORMAT');
  });
});
