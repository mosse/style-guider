const { getStyleGuidePrompt } = require('../services/prompts/styleGuidePrompt');
const { cleanAndParseResponse } = require('./responseParser');

// Simple test text
const testText = "The company's CEO announced that they will launch the new product in Q4. He said \"This innovation will revolutionize the industry.\"";

// Generate the prompt
const prompt = getStyleGuidePrompt(testText);
console.log('Generated Prompt:');
console.log(prompt);

// Simulated LLM response (what we'd expect from the model with our new prompt)
const simulatedResponse = `[
  {
    "original": "The company's CEO",
    "replacement": "The company's chief executive",
    "reason": "The Economist style guide prefers writing out titles in full rather than using acronyms"
  },
  " announced that ",
  {
    "original": "they",
    "replacement": "it",
    "reason": "The Economist style guide treats companies as singular entities"
  },
  " will launch the new product in ",
  {
    "original": "Q4",
    "replacement": "the fourth quarter",
    "reason": "The Economist style guide prefers writing out quarters rather than abbreviations"
  },
  ". He said \\"This innovation will revolutionize the industry.\\""
]`;

// Test parsing the response
try {
  const parsed = cleanAndParseResponse(simulatedResponse);
  console.log('Successfully parsed response:');
  console.log(JSON.stringify(parsed, null, 2));
} catch (error) {
  console.error('Error parsing response:', error);
  console.error('Error message:', error.message);
} 