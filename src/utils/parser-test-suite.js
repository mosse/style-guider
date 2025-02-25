/**
 * Parser Test Suite
 * 
 * This module provides a comprehensive set of tests for the response parser,
 * including normal cases, error cases, and recovery scenarios.
 */
const { cleanAndParseResponse, cleanResponse } = require('./responseParser');
const { validateResponse, validateJsonArrayStructure, validateSegmentStructure } = require('./parserValidator');
const { createFallbackFromFragments, attemptJsonRepair, extractValidFragments } = require('./parserRecovery');
const { ParserError } = require('./errors/ParserError');

//-----------------------------------------------------------------------------
// Test Example Data
//-----------------------------------------------------------------------------

// Valid responses
const validResponses = {
  simple: `[
    "This is unchanged text. ",
    {
      "original": "This is the original text.",
      "replacement": "This is the improved text.",
      "reason": "The replacement is more concise."
    },
    " More unchanged text."
  ]`,
  
  withNestedQuotes: `[
    "He said, \\"This statement is important.\\" ",
    {
      "original": "We must act quickly.",
      "replacement": "We should act promptly.",
      "reason": "The term 'promptly' is more formal than 'quickly'."
    }
  ]`,
  
  withMultiParagraph: `[
    {
      "original": "The first paragraph.",
      "replacement": "The improved first paragraph.",
      "reason": "More descriptive opening."
    },
    "\\n\\nThe second paragraph remains unchanged."
  ]`,
  
  withNestedQuotesInRaw: `[
    "But this weekend Sarah's writer group came over to our house for a \\"writer's retreat.\\" They all have nearly finished books."
  ]`
};

// Malformed responses that should be recoverable
const recoverableResponses = {
  missingOpeningBracket: `
    "This is unchanged text. ",
    {
      "original": "This is the original text.",
      "replacement": "This is the improved text.",
      "reason": "The replacement is more concise."
    },
    " More unchanged text."
  ]`,
  
  missingClosingBracket: `[
    "This is unchanged text. ",
    {
      "original": "This is the original text.",
      "replacement": "This is the improved text.",
      "reason": "The replacement is more concise."
    },
    " More unchanged text."
  `,
  
  missingCommas: `[
    "This is unchanged text. "
    {
      "original": "This is the original text.",
      "replacement": "This is the improved text.",
      "reason": "The replacement is more concise."
    }
    " More unchanged text."
  ]`,
  
  unquotedPropertyNames: `[
    "This is unchanged text. ",
    {
      original: "This is the original text.",
      replacement: "This is the improved text.",
      reason: "The replacement is more concise."
    },
    " More unchanged text."
  ]`,
  
  extraTrailingComma: `[
    "This is unchanged text. ",
    {
      "original": "This is the original text.",
      "replacement": "This is the improved text.",
      "reason": "The replacement is more concise."
    },
  ]`
};

// Severely malformed responses that need fragment recovery
const fragmentRecoveryResponses = {
  partialResponse: `[
    "This is unchanged text. ",
    {
      "original": "This is the original text.",
      "replacement": "This is the improved text.",
      "reason": "The replacement is more concise."
    },
    " More unchanged text.
  ]`,
  
  unclosedObject: `[
    "This is unchanged text. ",
    {
      "original": "This is the original text.",
      "replacement": "This is the improved text.",
      "reason": "The replacement is more concise."
    " More unchanged text."
  ]`,
  
  malformedButContainsValidObjects: `
    This response is not valid JSON but contains extractable objects:
    
    {
      "original": "This is the original text.",
      "replacement": "This is the improved text.",
      "reason": "The replacement is more concise."
    }
    
    "This is a valid string segment"
    
    {
      "original": "Another original.",
      "replacement": "Another replacement.",
      "reason": "Another reason."
    }
  `
};

//-----------------------------------------------------------------------------
// Test Functions
//-----------------------------------------------------------------------------

/**
 * Run a full suite of tests
 */
function runTests() {
  console.log('🧪 PARSER TEST SUITE');
  console.log('====================\n');
  
  let passCount = 0;
  let failCount = 0;
  
  // Test validation functions
  try {
    console.log('TESTING VALIDATOR FUNCTIONS:');
    console.log('---------------------------');
    testValidationFunctions();
    passCount++;
    console.log('✅ Validator functions test passed\n');
  } catch (error) {
    failCount++;
    console.error('❌ Validator functions test failed:', error.message);
    console.error(error);
    console.log('\n');
  }
  
  // Test repair functions
  try {
    console.log('TESTING REPAIR FUNCTIONS:');
    console.log('------------------------');
    testRepairFunctions();
    passCount++;
    console.log('✅ Repair functions test passed\n');
  } catch (error) {
    failCount++;
    console.error('❌ Repair functions test failed:', error.message);
    console.error(error);
    console.log('\n');
  }
  
  // Test fragment recovery
  try {
    console.log('TESTING FRAGMENT RECOVERY:');
    console.log('-------------------------');
    testFragmentRecovery();
    passCount++;
    console.log('✅ Fragment recovery test passed\n');
  } catch (error) {
    failCount++;
    console.error('❌ Fragment recovery test failed:', error.message);
    console.error(error);
    console.log('\n');
  }
  
  // Test valid parsing
  try {
    console.log('TESTING VALID PARSING:');
    console.log('---------------------');
    testValidParsing();
    passCount++;
    console.log('✅ Valid parsing test passed\n');
  } catch (error) {
    failCount++;
    console.error('❌ Valid parsing test failed:', error.message);
    console.error(error);
    console.log('\n');
  }
  
  // Test end-to-end recovery pipeline
  try {
    console.log('TESTING END-TO-END RECOVERY:');
    console.log('---------------------------');
    testEndToEndRecovery();
    passCount++;
    console.log('✅ End-to-end recovery test passed\n');
  } catch (error) {
    failCount++;
    console.error('❌ End-to-end recovery test failed:', error.message);
    console.error(error);
    console.log('\n');
  }
  
  // Summary
  console.log('\nTEST SUMMARY:');
  console.log('=============');
  console.log(`Total: ${passCount + failCount}, Passed: ${passCount}, Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 All tests passed! The parser implementation is working correctly.');
  } else {
    console.log(`\n⚠️ Some tests failed. Please review the errors above.`);
  }
}

/**
 * Test validation functions
 */
function testValidationFunctions() {
  // Test valid structures
  Object.entries(validResponses).forEach(([name, response]) => {
    const result = validateJsonArrayStructure(response);
    console.log(`- Validating ${name} response: ${result.isValid ? 'VALID' : 'INVALID'}`);
    if (!result.isValid) {
      throw new Error(`Validation failed for valid response '${name}': ${result.errorDetail}`);
    }
  });
  
  // Test structural validation for invalid responses
  const missingOpeningBracketResult = validateJsonArrayStructure('{"key": "value"}]');
  if (missingOpeningBracketResult.isValid) {
    throw new Error('Validation incorrectly passed for response with missing opening bracket');
  }
  console.log(`- Validating missing opening bracket: ${missingOpeningBracketResult.isValid ? 'VALID' : 'INVALID'} (Expected: INVALID)`);
  
  const missingClosingBracketResult = validateJsonArrayStructure('[{"key": "value"}');
  if (missingClosingBracketResult.isValid) {
    throw new Error('Validation incorrectly passed for response with missing closing bracket');
  }
  console.log(`- Validating missing closing bracket: ${missingClosingBracketResult.isValid ? 'VALID' : 'INVALID'} (Expected: INVALID)`);
  
  const unbalancedResult = validateJsonArrayStructure('[{"key": "value"]}]');
  if (unbalancedResult.isValid) {
    throw new Error('Validation incorrectly passed for response with unbalanced brackets');
  }
  console.log(`- Validating unbalanced brackets: ${unbalancedResult.isValid ? 'VALID' : 'INVALID'} (Expected: INVALID)`);
  
  // Test segment structure validation
  Object.entries(validResponses).forEach(([name, response]) => {
    const result = validateSegmentStructure(response);
    console.log(`- Validating segment structure for ${name} response: ${result.isValid ? 'VALID' : 'INVALID'}`);
    if (!result.isValid) {
      throw new Error(`Segment validation failed for valid response '${name}': ${result.errorDetail}`);
    }
  });
}

/**
 * Test repair functions
 */
function testRepairFunctions() {
  // Test repair of recoverable responses
  Object.entries(recoverableResponses).forEach(([name, response]) => {
    const repairedResponse = attemptJsonRepair(response);
    try {
      console.log(`- Repairing ${name} response...`);
      const parsed = JSON.parse(repairedResponse);
      console.log(`  ✓ Successfully repaired and parsed`);
      
      // Additional validation: Check if the structure makes sense
      if (!Array.isArray(parsed)) {
        throw new Error(`Repaired ${name} response did not produce an array`);
      }
      
      // Output the repaired response for inspection
      console.log(`  Repaired response: ${repairedResponse.substring(0, 50)}...`);
    } catch (error) {
      throw new Error(`Repair failed for ${name} response: ${error.message}`);
    }
  });
}

/**
 * Test fragment recovery
 */
function testFragmentRecovery() {
  // Test fragment extraction from severely malformed responses
  Object.entries(fragmentRecoveryResponses).forEach(([name, response]) => {
    console.log(`- Recovering fragments from ${name} response...`);
    const fragments = extractValidFragments(response);
    
    if (fragments.length === 0) {
      throw new Error(`Failed to extract any fragments from ${name} response`);
    }
    
    console.log(`  ✓ Extracted ${fragments.length} fragments`);
    
    // Validate the fragments
    fragments.forEach((fragment, i) => {
      if (typeof fragment === 'object') {
        if (!fragment.original || !fragment.replacement || !fragment.reason) {
          throw new Error(`Extracted object fragment is missing required fields: ${JSON.stringify(fragment)}`);
        }
        console.log(`  Fragment ${i+1}: Change object with original="${fragment.original.substring(0, 20)}..."`);
      } else {
        console.log(`  Fragment ${i+1}: String "${fragment.substring(0, 20)}..."`);
      }
    });
  });
}

/**
 * Test parsing of valid responses
 */
function testValidParsing() {
  // Test parsing of valid responses
  Object.entries(validResponses).forEach(([name, response]) => {
    try {
      console.log(`- Parsing ${name} response...`);
      const parsed = cleanAndParseResponse(response);
      console.log(`  ✓ Successfully parsed with ${parsed.length} segments`);
      
      // Validate the parsed result
      parsed.forEach((segment, i) => {
        if (typeof segment === 'object') {
          if (!segment.original || !segment.replacement || !segment.reason) {
            throw new Error(`Parsed object segment is missing required fields: ${JSON.stringify(segment)}`);
          }
          console.log(`  Segment ${i+1}: Change object with original="${segment.original.substring(0, 20)}..."`);
        } else {
          console.log(`  Segment ${i+1}: String "${segment.substring(0, 20)}..."`);
        }
      });
    } catch (error) {
      throw new Error(`Parsing failed for valid ${name} response: ${error.message}`);
    }
  });
}

/**
 * Test end-to-end recovery pipeline
 */
function testEndToEndRecovery() {
  // Test end-to-end processing of recoverable responses
  Object.entries(recoverableResponses).forEach(([name, response]) => {
    try {
      console.log(`- Processing recoverable ${name} response...`);
      const parsed = cleanAndParseResponse(response);
      console.log(`  ✓ Successfully processed with ${parsed.length} segments`);
    } catch (error) {
      throw new Error(`End-to-end processing failed for recoverable ${name} response: ${error.message}`);
    }
  });
  
  // Test end-to-end processing of fragment recovery responses
  Object.entries(fragmentRecoveryResponses).forEach(([name, response]) => {
    try {
      console.log(`- Processing fragment recovery ${name} response...`);
      const parsed = cleanAndParseResponse(response);
      console.log(`  ✓ Successfully processed with ${parsed.length} segments (using fragment recovery)`);
    } catch (error) {
      console.error(`  Failed to process fragment recovery ${name} response: ${error.message}`);
      console.error(`  This may be expected for severely malformed responses`);
      
      // Check if the error is a ParserError with helpful details
      if (error instanceof ParserError) {
        console.log(`  ✓ Generated proper ParserError with type ${error.errorType}`);
        console.log(`  ✓ Error includes suggestion: ${error.suggestion}`);
      } else {
        throw new Error(`Generated incorrect error type for fragment recovery ${name} response`);
      }
    }
  });
}

// Run the tests
runTests(); 