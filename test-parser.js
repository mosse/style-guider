#!/usr/bin/env node
/**
 * Parser Test Runner
 * 
 * A simple CLI tool to test the JSON parser implementation with various test cases.
 */

// Run the test suite
require('./src/utils/parser-test-suite');

console.log('\n\nYou can also test the parser with custom input:');
console.log('node test-parser.js "[{\\"original\\": \\"Test\\", \\"replacement\\": \\"Better test\\", \\"reason\\": \\"More descriptive\\"}]"');

// Check if a custom test string was provided
if (process.argv.length > 2) {
  const { cleanAndParseResponse, getParserTelemetry } = require('./src/utils/responseParser');
  
  console.log('\n\n🧪 CUSTOM TEST CASE:');
  console.log('==================');
  
  const testString = process.argv[2];
  console.log(`Input: ${testString.substring(0, 50)}${testString.length > 50 ? '...' : ''}`);
  
  try {
    const parsed = cleanAndParseResponse(testString);
    console.log('✅ Successfully parsed custom input:');
    console.log(JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.error('❌ Error parsing custom input:');
    console.error(error.message);
    
    if (error.suggestion) {
      console.error(`\nSuggestion: ${error.suggestion}`);
    }
    
    if (error.context) {
      console.error(`\nContext: "${error.context}"`);
    }
  }
  
  // Show telemetry
  console.log('\nParser Telemetry:', getParserTelemetry());
} 