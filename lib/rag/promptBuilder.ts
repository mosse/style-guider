import type { RetrievedChunk } from '../parser/types.js';

/**
 * Builds the RAG-aware prompt for Claude.
 * Includes retrieved style guide chunks as context and requires
 * verbatim citations for every suggested change.
 */
export function buildAnalysisPrompt(
  userText: string,
  retrievedChunks: RetrievedChunk[]
): string {
  const styleGuideContext = formatChunksAsContext(retrievedChunks);

  return `You are an expert copy editor. Apply ONLY the rules found in the style guide excerpts below. Do not rely on general style knowledge or your training data — use ONLY the provided excerpts as your authority.

<style_guide_context>
${styleGuideContext}
</style_guide_context>

Examine the following draft document and suggest improvements based strictly on the style guide excerpts above:

<draft_document>
${userText}
</draft_document>

Return a JSON array of text segments. Each segment MUST be either:

a) A string containing unchanged text:
   - Preserve all linebreaks (\\n) exactly as they appear
   - Keep all whitespace and punctuation intact
   - Do not combine separate paragraphs

b) An object representing a change, with this exact structure:
   {
     "original": "the original text",
     "replacement": "the suggested improvement",
     "reason": "brief explanation of why this change improves the text",
     "citation": "the EXACT verbatim quote from the style guide context above that supports this change"
   }

CRITICAL RULES FOR CITATIONS:
- The "citation" field MUST contain text copied DIRECTLY from the <style_guide_context> above
- Do NOT paraphrase, summarize, or reword the style guide text
- If you cannot find a specific passage in the style guide context to cite, do NOT make the change
- The citation should be the most relevant excerpt — include enough context to be meaningful

IMPORTANT JSON FORMATTING RULES:
- The entire response must be a valid JSON array (starting with '[' and ending with ']')
- All strings must have properly escaped quotes, backslashes, and control characters
- All property names in objects must be in double quotes
- Each change object must contain exactly four properties: "original", "replacement", "reason", and "citation"
- Do not include trailing commas in arrays or objects
- Make sure all brackets and braces are properly balanced

HANDLING MULTI-PARAGRAPH TEXT:
- For multi-paragraph inputs, process one paragraph at a time
- Preserve paragraph breaks by including them in string segments, not in change objects
- Keep linebreak characters (\\n) intact within string segments

HANDLING QUOTES AND SPECIAL CHARACTERS:
- For text containing quotes, always escape them with a backslash: \\"
- For backslashes in text, escape them with another backslash: \\\\
- When in doubt about escaping, use fewer changes to minimize JSON formatting issues

EDITING STYLE:
- Make changes at the most granular level appropriate (specific words or phrases rather than entire sentences)
- NEVER edit a whole paragraph at once. ALWAYS split a paragraph into multiple small edits
- NEVER include paragraph breaks (\\n\\n) inside edit objects
- Each change object must include all four fields: original, replacement, reason, and citation
- Return ONLY the raw JSON array with no additional formatting or explanation

Example response format (for illustration only — do not rely on these for style rules):
[
  "The committee met on ",
  {
    "original": "January 6, 2021",
    "replacement": "January 6th 2021",
    "reason": "Dates should use ordinal format without comma before year",
    "citation": "Use January 6th rather than January 6. Do not put a comma between the month and year."
  },
  " to discuss the matter. ",
  {
    "original": "7 members",
    "replacement": "seven members",
    "reason": "Single-digit numbers should be spelled out",
    "citation": "Spell out numbers from one to nine; use figures for 10 and above."
  },
  " voted in favour."
]

CRITICAL: BAD RESPONSE FORMAT — DO NOT DO THIS:
[
  {
    "original": "The entire first paragraph with all its text...",
    "replacement": "A completely rewritten paragraph...",
    "reason": "Multiple style changes",
    "citation": "Some vague reference"
  }
]

The above is WRONG because it edits an entire paragraph at once instead of making granular changes.

Remember: Return ONLY the raw JSON array. Verify your JSON is valid before completing your response.`;
}

/**
 * Formats retrieved chunks into the <style_guide_context> XML block.
 */
function formatChunksAsContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk) => {
      const titleAttr = chunk.sectionTitle
        ? ` title="${escapeXmlAttr(chunk.sectionTitle)}"`
        : '';
      return `<section${titleAttr}>\n${chunk.chunkText}\n</section>`;
    })
    .join('\n\n');
}

function escapeXmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
