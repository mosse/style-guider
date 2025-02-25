const { cleanAndParseResponse, getParserTelemetry } = require('./src/utils/responseParser');

// The exact API response format provided by the user
const apiResponse = `[{"original":"Sarah is writing a book and in an on-brand-for-her move she has recruited two other book writers into a writer group to give each other support, feedback, and motivation.\\n\\nI don't think of myself as a writer and I don't normally think of Sarah as one either (we are both tech execs, IMO).","replacement":"Sarah is writing a book. In an on-brand move for her, she has recruited two other book writers into a writers' group to give each other support, feedback and motivation.\\n\\nI do not think of myself as a writer. Nor do I normally think of Sarah as one (we are both technology executives, in my opinion).","reason":"The Economist style guide advises using clear, concise language without superfluous/informal phrasing. It also recommends using 'technology' instead of 'tech' and pluralizing nouns like 'writers' group' with an apostrophe."},{"\nBut this weekend Sarah's writer group came over to our house for a \\"writer's retreat.\\" They all have nearly finished books.\\n\\nI tried to stay out of their way other than joining them for dinner. Over one of these dinners it came out that a friend of a friend had done a solo writing retreat at our house last year while we were out of town.":"But this weekend Sarah's writers' group came over to our house for a \\"writers' retreat\\". They all had nearly finished books.\\n\\nI tried to stay out of their way, other than joining them for dinner. Over one of these dinners, it came out that a friend of a friend had done a solo writing retreat at our house the previous year while we were away.","reason":"The Economist style guide advises pluralizing nouns like 'writers' group' with apostrophes. It also prefers avoiding contractions like 'were out' and instead using clearer language like 'were away'. Additionally, it advises not using vague constructions like 'last year' when a more specific term like 'the previous year' is possible."},{"\nThis friend of a friend has a Pulitzer. I must have known this, and I'm surprised to have forgotten it because normally I am a shameless name dropper. Things like Pulitzer winners in our house usually stick.":"This friend of a friend has won a Pulitzer prize. I must have known this and am surprised to have forgotten it, because normally I shamelessly drop names. Pulitzer prizewinners in our house usually stick in my mind.","reason":"The Economist style guide prefers the more specific phrasing 'Pulitzer prize' over just 'Pulitzer'. It also advises avoiding informal phrasing like 'stick' and contractions like 'I'm' in favor of clearer language. Additionally, it recommends not using sentence fragments like 'Things like Pulitzer winners in our house usually stick'."}]`;

console.log('Testing parser with real API response format...\n');

try {
  // Parse the API response
  const result = cleanAndParseResponse(apiResponse);
  
  console.log('Success! Parser extracted these change objects:');
  console.log('Total change objects found:', Array.isArray(result) ? result.length : 0);
  
  if (Array.isArray(result) && result.length > 0) {
    // Display all change objects in a readable format
    result.forEach((item, index) => {
      if (typeof item === 'object' && item.original) {
        console.log(`\n=== Change Object ${index + 1} ===`);
        console.log('Original:', item.original.substring(0, 100) + (item.original.length > 100 ? '...' : ''));
        console.log('Replacement:', item.replacement.substring(0, 100) + (item.replacement.length > 100 ? '...' : ''));
      } else {
        console.log(`\n=== Text Segment ${index + 1} ===`);
        console.log(typeof item === 'string' ? 
          (item.substring(0, 100) + (item.length > 100 ? '...' : '')) : 
          JSON.stringify(item));
      }
    });
  }
  
  console.log('\nParser Telemetry:');
  console.log(getParserTelemetry());
} catch (error) {
  console.error('\nParser error:');
  console.error(error);
} 