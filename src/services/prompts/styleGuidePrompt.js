export const getStyleGuidePrompt = (inputText) => `You are tasked with improving a draft document by applying the principles contained in a specific Style Guide. Follow these steps carefully:

1. First, review your knowledge of The Economist Style Guide.

2. Next, examine the Draft Document:
<draft_document>
${inputText}
</draft_document>

3. Analyze the draft document against the style guide. Pay close attention to:
   - Writing style (e.g., active vs. passive voice, sentence structure)
   - Tone and voice
   - Formatting and layout
   - Use of terminology and jargon
   - Grammar and punctuation rules specific to the style guide

4. Consider how the text can be improved to better align with the style guide. Think about:
   - Rewording sentences to match the preferred style
   - Adjusting formatting to meet guidelines
   - Replacing or defining jargon if necessary
   - Correcting any grammatical, punctuation or other stylistic errors

5. Return a JSON array of text segments. Each segment MUST be either:
   a) A string containing unchanged text:
      - Preserve all linebreaks (\\n) exactly as they appear
      - Keep all whitespace and punctuation intact
      - Do not combine separate paragraphs
   
   b) An object representing a change, with this exact structure:
      {
        "original": "the original text",
        "replacement": "the suggested improvement",
        "reason": "brief explanation of why this change improves style guide adherence"
      }

Example input:
"Four years ago today, on February 13, 2021, Senate Republicans acquitted former president Donald Trump of incitement of insurrection in his second impeachment trial. Although 57 senators, including 7 Republicans, voted to convict Trump for launching the January 6, 2021 attack on the U.S. Capitol, that vote did not reach the threshold of 67 votes—two thirds of the Senate—necessary to convict a president in an impeachment trial."

Example response:
[
   "Four years ago today, on February 13, 2021, ",
   {
      "original": "Senate Republicans acquitted former president Donald Trump",
      "replacement": "Senate Republicans acquitted Donald Trump",
      "reason": "The Economist style guide advises against using 'former president' as a title - use the person's name directly"
   },
   " of ",
   {
      "original": "incitement of insurrection",
      "replacement": "inciting insurrection",
      "reason": "The Economist favors active, direct language over nominal constructions"
   },
   " in his second impeachment trial. ",
   {
      "original": "Although 57 senators, including 7 Republicans,",
      "replacement": "Although 57 senators, including seven Republicans,",
      "reason": "The Economist style guide recommends spelling out single-digit numbers"
   },
   " voted to convict Trump for ",
   {
      "original": "launching the January 6, 2021 attack",
      "replacement": "launching the January 6th 2021 attack",
      "reason": "The Economist style guide uses 'th' for dates and removes comma between date and year"
   },
   " on the ",
   {
      "original": "U.S.",
      "replacement": "American",
      "reason": "The Economist prefers 'American' to 'U.S.' in most contexts"
   },
   " Capitol, that vote did not reach the threshold of 67 votes—",
   {
      "original": "two thirds",
      "replacement": "two-thirds",
      "reason": "The Economist hyphenates compound modifiers"
   },
   " of the Senate—necessary to convict a president in an impeachment trial."
]

IMPORTANT:
- Make changes at the most granular level appropriate (specific words or phrases rather than entire sentences)
- Each change object must include all three fields: original, replacement, and reason
- Preserve all linebreaks and paragraph structure in string segments
- Return ONLY the raw JSON array with no additional formatting or explanation
- Ensure all quotes and special characters are properly escaped in JSON strings. Pay particular attention to quotes.

Remember: Return ONLY the raw JSON array with no additional formatting or explanation.`; 