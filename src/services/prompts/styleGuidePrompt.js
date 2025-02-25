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

6. IMPORTANT JSON FORMATTING RULES:
   - The entire response must be a valid JSON array (starting with '[' and ending with ']')
   - All strings must have properly escaped quotes, backslashes, and control characters
   - All property names in objects must be in double quotes
   - Each change object must contain exactly three properties: "original", "replacement", and "reason"
   - Do not include trailing commas in arrays or objects
   - Make sure all brackets and braces are properly balanced

7. HANDLING MULTI-PARAGRAPH TEXT:
   - For multi-paragraph inputs, process one paragraph at a time
   - Preserve paragraph breaks by including them in string segments, not in change objects
   - For a change that spans multiple paragraphs, create separate change objects for each paragraph
   - Keep linebreak characters (\\n) intact within string segments

8. HANDLING QUOTES AND SPECIAL CHARACTERS:
   - For text containing quotes, always escape them with a backslash: \\"
   - For nested quotes (quotes within quotes), ensure each level is properly escaped
   - Pay special attention to apostrophes and single quotes
   - For backslashes in text, escape them with another backslash: \\\\
   - When in doubt about escaping, use fewer changes to minimize JSON formatting issues

9. IF YOU ENCOUNTER DIFFICULTY formatting as valid JSON:
   - Double-check all quotes and special characters are properly escaped
   - Ensure all brackets and braces are balanced and properly nested
   - If still struggling, simplify the response by making fewer, more significant changes
   - As a last resort, provide simple string segments with minimal changes

Example input 1:
"Four years ago today, on February 13, 2021, Senate Republicans acquitted former president Donald Trump of incitement of insurrection in his second impeachment trial. Although 57 senators, including 7 Republicans, voted to convict Trump for launching the January 6, 2021 attack on the U.S. Capitol, that vote did not reach the threshold of 67 votes—two thirds of the Senate—necessary to convict a president in an impeachment trial."

Example response 1:
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

Example input 2:
"The company announced that it will be implementing new AI technology to improve customer service. They claimed that the new system will reduce wait times by 50%. The spokesperson for the company said 'We are excited about this innovative solution that will transform our customer's experience.'"

Example response 2:
[
   {
      "original": "The company announced that it will be implementing",
      "replacement": "The company announced that it will implement",
      "reason": "The Economist style guide favors concise language; 'will implement' is more direct than 'will be implementing'"
   },
   " new AI technology to improve customer service. ",
   {
      "original": "They claimed",
      "replacement": "It claimed",
      "reason": "The Economist style guide recommends maintaining consistent pronouns; use 'it' for company as a singular entity"
   },
   " that the new system will reduce wait times by 50%. The spokesperson for the company said ",
   {
      "original": "'We are excited about this innovative solution that will transform our customer's experience.'",
      "replacement": "'We are excited about this innovation that will transform our customers' experience.'",
      "reason": "The Economist style guide avoids redundant words like 'solution' and prefers the plural possessive 'customers'' in this context"
   }
]

Example input 3 (with special characters and quotes):
"The CEO stated, \\"Our Q1 results were 'unprecedented' in the company's 20-year history.\\" However, revenue actually decreased by 5% compared to Q1 of the previous year. The CFO explained that \\"special circumstances—including supply chain disruptions—affected our bottom line.\\""

Example response 3:
[
   {
      "original": "The CEO stated, \\"Our Q1 results were 'unprecedented' in the company's 20-year history.\\"",
      "replacement": "The CEO stated, \\"Our first-quarter results were 'unprecedented' in the company's 20-year history.\\"",
      "reason": "The Economist style guide prefers writing out 'first quarter' instead of using 'Q1' abbreviation"
   },
   " However, revenue actually decreased by 5% compared to ",
   {
      "original": "Q1 of the previous year",
      "replacement": "the first quarter of the previous year",
      "reason": "Consistency with Economist style of writing out 'first quarter' instead of abbreviation"
   },
   ". The CFO explained that \\"special circumstances—including supply chain disruptions—affected our bottom line.\\""
]

Example input 4 (multi-paragraph text):
"The healthcare sector faced unprecedented challenges last year. Hospitals were overwhelmed, and staff shortages became critical in many regions.

Despite these difficulties, innovation accelerated. New telemedicine platforms expanded rapidly, and AI diagnostic tools gained regulatory approval."

Example response 4:
[
   {
      "original": "The healthcare sector",
      "replacement": "The health-care sector",
      "reason": "The Economist style guide hyphenates 'health-care' when used as a compound modifier"
   },
   " faced unprecedented challenges last year. ",
   {
      "original": "Hospitals were overwhelmed",
      "replacement": "Hospitals became overwhelmed",
      "reason": "The Economist style guide prefers active constructions over passive voice"
   },
   ", and staff shortages became critical in many regions.\n\n",
   {
      "original": "Despite these difficulties",
      "replacement": "Despite these challenges",
      "reason": "The Economist style guide avoids repetition; 'challenges' was already used, so this provides better variety"
   },
   ", innovation accelerated. New telemedicine platforms expanded rapidly, and AI diagnostic tools gained regulatory approval."
]

IMPORTANT:
- Make changes at the most granular level appropriate (specific words or phrases rather than entire sentences)
- Each change object must include all three fields: original, replacement, and reason
- Preserve all linebreaks and paragraph structure in string segments
- Return ONLY the raw JSON array with no additional formatting or explanation
- Ensure all quotes and special characters are properly escaped in JSON strings, particularly with nested quotes
- Carefully balance all brackets and braces in the JSON structure
- Verify the JSON is valid before completing your response

Remember: Return ONLY the raw JSON array with no additional formatting or explanation.`; 