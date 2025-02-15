/**
 * Cleans and parses the API response, handling various quote and special character scenarios.
 * @param {string} response - The raw response from the API
 * @returns {Array} The parsed array of text segments and change objects
 * @throws {Error} If the response cannot be parsed into valid JSON
 */
export const cleanAndParseResponse = (response) => {
    // Clean the response by removing any markdown formatting
    let cleanedResponse = response
        .replace(/```json\s*/g, '')  // Remove opening markdown
        .replace(/```\s*$/g, '')     // Remove closing markdown
        .trim();

    // First pass: normalize special characters (except quotes)
    cleanedResponse = cleanedResponse
        .replace(/\u2014/g, '--')             // Em dashes
        .replace(/\u2013/g, '-')              // En dashes
        .replace(/\u2026/g, '...')            // Ellipsis
        .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width spaces

    // Second pass: handle quotes carefully
    cleanedResponse = cleanedResponse
        // First normalize all smart quotes to their straight equivalents
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        // Then escape quotes in JSON string values
        .replace(/(")((?:\\.|[^"\\])*)(")/g, (match, open, content, close) => {
            // Properly escape quotes in the content while preserving already escaped ones
            const escaped = content
                .replace(/\\"/g, '"')  // Temporarily unescape any escaped quotes
                .replace(/"/g, '\\"')  // Escape all quotes
                .replace(/'/g, "'");   // Normalize any remaining single quotes
            return `${open}${escaped}${close}`;
        });

    // Handle newlines carefully - preserve empty lines that are part of the content
    cleanedResponse = cleanedResponse
        .split('\n')
        .map(line => line.trim())
        .join('');  // Join without filtering to preserve structure

    // Ensure valid array structure
    if (!cleanedResponse.startsWith('[')) {
        cleanedResponse = '[' + cleanedResponse;
    }
    if (!cleanedResponse.endsWith(']')) {
        cleanedResponse = cleanedResponse + ']';
    }

    try {
        // Parse and validate the response
        const parsed = JSON.parse(cleanedResponse);
        
        if (!Array.isArray(parsed)) {
            throw new Error('Response is not an array');
        }

        // Validate each segment
        parsed.forEach((segment, index) => {
            if (typeof segment !== 'string' && typeof segment !== 'object') {
                throw new Error(`Invalid segment type at index ${index}`);
            }
            if (typeof segment === 'object' && (!segment.original || !segment.replacement || !segment.reason)) {
                throw new Error(`Missing required fields in change object at index ${index}`);
            }
        });

        return parsed;
    } catch (err) {
        // Add context to the error
        console.error('JSON Parse Error:', err);
        console.error('Cleaned Response:', cleanedResponse);
        
        // Try to identify the problematic part of the JSON
        const position = parseInt(err.message.match(/position (\d+)/)?.[1]);
        if (!isNaN(position)) {
            const context = cleanedResponse.substring(Math.max(0, position - 50), Math.min(cleanedResponse.length, position + 50));
            console.error('Error context:', context);
            console.error('Error position:', '^'.padStart(51, ' '));
        }
        
        throw new Error(`Failed to parse API response: ${err.message}`);
    }
}; 