const { cleanAndParseResponse, getParserTelemetry } = require('./src/utils/responseParser');

// The problematic response format with newlines and text fragments as keys
const testResponse = `[
  {
    "original":"Sarah is writing a book and in an on-brand-for-her move she has recruited two other book writers into a writer group to give each other support, feedback, and motivation.\\n\\nI don't think of myself as a writer and I don't normally think of Sarah as one either (we are both tech execs, IMO).",
    "replacement":"Sarah is writing a book. In an on-brand move for her, she has recruited two other book writers into a writers' group to give each other support, feedback and motivation.\\n\\nI do not think of myself as a writer. Nor do I normally think of Sarah as one (we are both technology executives, in my opinion).",
    "reason":"Test reason 1"
  },
  {
    "\\nBut this weekend Sarah's writer group came over to our house for a \\"writer's retreat.\\" They all have nearly finished books.\\n\\nI tried to stay out of their way other than joining them for dinner. Over one of these dinners it came out that a friend of a friend had done a solo writing retreat at our house last year while we were out of town.":"But this weekend Sarah's writers' group came over to our house for a \\"writers' retreat\\". They all had nearly finished books.\\n\\nI tried to stay out of their way, other than joining them for dinner. Over one of these dinners, it came out that a friend of a friend had done a solo writing retreat at our house the previous year while we were away.",
    "reason":"Test reason 2"
  }
]`;

console.log('Testing parser with challenging response format...\n');
console.log('Input:');
console.log(testResponse.substring(0, 150) + '...');

try {
  // Try to parse the challenging format
  const result = cleanAndParseResponse(testResponse);
  
  console.log('\nSuccess! Parsed result:');
  if (Array.isArray(result) && result.length > 0) {
    // Display the first item in a readable format
    console.log(JSON.stringify(result[0], null, 2));
    console.log(`...and ${result.length - 1} more items`);
  } else {
    console.log(result);
  }
  
  console.log('\nParser Telemetry:');
  console.log(getParserTelemetry());
} catch (error) {
  console.error('\nParser error:');
  console.error(error);
} 