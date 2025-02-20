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
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
        .replace(/[—]/g, '--');               // Additional em dash variant

    // Second pass: handle quotes carefully
    cleanedResponse = cleanedResponse
        // First normalize all smart quotes to straight quotes, including in the JSON structure
        .replace(/[""]/g, '"')                // Replace all curly double quotes
        .replace(/['']/g, "'")                // Replace all curly single quotes
        // Then handle nested quotes in content
        .replace(/(")((?:\\.|[^"\\])*)(")/g, (match, open, content, close) => {
            // Properly escape quotes in the content while preserving already escaped ones
            const escaped = content
                .replace(/\\"/g, '\\"')        // Preserve already escaped quotes
                .replace(/(?<!\\)"/g, '\\"')   // Escape unescaped quotes
                .replace(/'/g, "'");           // Normalize any remaining single quotes
            return `${open}${escaped}${close}`;
        });

    // Handle newlines - preserve them in the JSON strings but remove them between JSON elements
    cleanedResponse = cleanedResponse
        .split(/(\{[^}]*\}|\[[^\]]*\]|"(?:\\.|[^"\\])*"|\s+)/g)
        .map(part => {
            if (part.trim() === '') {
                return ' ';
            }
            return part;
        })
        .join('')
        .trim();

    // Ensure valid array structure
    if (!cleanedResponse.startsWith('[')) {
        cleanedResponse = '[' + cleanedResponse;
    }
    if (!cleanedResponse.endsWith(']')) {
        cleanedResponse = cleanedResponse + ']';
    }

    try {
        // Parse and validate the response
        let parsed;
        try {
            parsed = JSON.parse(cleanedResponse);
        } catch (jsonError) {
            // Get context around the error position
            const position = parseInt(jsonError.message.match(/position (\d+)/)?.[1]);
            if (!isNaN(position)) {
                const start = Math.max(0, position - 50);
                const end = Math.min(cleanedResponse.length, position + 50);
                const context = cleanedResponse.substring(start, end);
                const pointer = ' '.repeat(Math.min(50, position - start)) + '^';
                
                console.error('JSON Parse Error Context:');
                console.error('Snippet:', context);
                console.error('Position:', pointer);
                console.error('Original Error:', jsonError.message);
                console.error('Cleaned Response:', cleanedResponse);
            }
            throw jsonError;
        }

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
        console.error('Response Parser Error:', {
            error: err.message,
            type: err.name,
            cleanedResponseLength: cleanedResponse.length,
            cleanedResponsePreview: cleanedResponse.substring(0, 300) + '...'
        });
        
        throw err;
    }
}; 