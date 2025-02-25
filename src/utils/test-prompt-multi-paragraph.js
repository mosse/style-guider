const { getStyleGuidePrompt } = require('../services/prompts/styleGuidePrompt');
const { cleanAndParseResponse } = require('./responseParser');

// Multi-paragraph test text
const testText = `The healthcare sector faced unprecedented challenges last year. Hospitals were overwhelmed, and staff shortages became critical in many regions.

Despite these difficulties, innovation accelerated. New telemedicine platforms expanded rapidly, and AI diagnostic tools gained regulatory approval.

The CEO of MedTech Inc. said, "We've seen 10 years of digital transformation in just one year."`;

// Generate the prompt
const prompt = getStyleGuidePrompt(testText);
console.log('Generated Prompt for Multi-paragraph Text:');
console.log('------------------------------------------------');
console.log(testText);
console.log('------------------------------------------------');

// Simulated LLM response
const simulatedResponse = `[
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
  ", and staff shortages became critical in many regions.\\n\\n",
  {
    "original": "Despite these difficulties",
    "replacement": "Despite these challenges",
    "reason": "The Economist style guide avoids repetition; 'challenges' was already used, so this provides better variety"
  },
  ", innovation accelerated. New telemedicine platforms expanded rapidly, and AI diagnostic tools gained regulatory approval.\\n\\nThe CEO of MedTech Inc. said, \\"We've seen ",
  {
    "original": "10",
    "replacement": "ten",
    "reason": "The Economist style guide recommends spelling out numbers under 10"
  },
  " years of digital transformation in just one year.\\""
]`;

// Test parsing the response
try {
  const parsed = cleanAndParseResponse(simulatedResponse);
  console.log('Successfully parsed multi-paragraph response:');
  console.log(JSON.stringify(parsed, null, 2));
  
  // Reconstruct the text to verify preservation of structure
  let reconstructed = '';
  parsed.forEach(segment => {
    if (typeof segment === 'string') {
      reconstructed += segment;
    } else {
      reconstructed += segment.replacement;
    }
  });
  
  console.log('\nReconstructed text:');
  console.log('------------------------------------------------');
  console.log(reconstructed);
  console.log('------------------------------------------------');
} catch (error) {
  console.error('Error parsing response:', error);
  console.error('Error message:', error.message);
} 