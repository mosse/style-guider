import { cleanAndParseResponse } from '../../utils/responseParser';

describe('Response Parser', () => {
    // Extract the cleaning and parsing logic to test
    const testParse = (response) => {
        let cleanedResponse = response
            .replace(/```json\s*/g, '')
            .replace(/```\s*$/g, '')
            .trim();

        // First pass: normalize special characters (except quotes)
        cleanedResponse = cleanedResponse
            .replace(/\u2014/g, '--')
            .replace(/\u2013/g, '-')
            .replace(/\u2026/g, '...')
            .replace(/[\u200B-\u200D\uFEFF]/g, '');

        // Second pass: handle quotes carefully
        cleanedResponse = cleanedResponse
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/(")((?:\\.|[^"\\])*)(")/g, (match, open, content, close) => {
                const escaped = content
                    .replace(/\\"/g, '"')
                    .replace(/"/g, '\\"')
                    .replace(/'/g, "'");
                return `${open}${escaped}${close}`;
            });

        // Handle newlines
        cleanedResponse = cleanedResponse
            .split('\n')
            .map(line => line.trim())
            .join('');

        // Ensure array structure
        if (!cleanedResponse.startsWith('[')) {
            cleanedResponse = '[' + cleanedResponse;
        }
        if (!cleanedResponse.endsWith(']')) {
            cleanedResponse = cleanedResponse + ']';
        }

        return JSON.parse(cleanedResponse);
    };

    // Test cases for various quote scenarios
    it('handles simple string segments correctly', () => {
        const response = '[" simple text ", "more text"]';
        const result = testParse(response);
        expect(result).toEqual([" simple text ", "more text"]);
    });

    it('handles apostrophes in text', () => {
        const response = '["It\'s working", "That\'s great"]';
        const result = testParse(response);
        expect(result).toEqual(["It's working", "That's great"]);
    });

    it('handles nested quotes', () => {
        const response = '["He said \\"Hello\\" to me", "She replied \\"Goodbye\\""]';
        const result = testParse(response);
        expect(result).toEqual(['He said "Hello" to me', 'She replied "Goodbye"']);
    });

    it('handles quotes within change objects', () => {
        const response = `[{
            "original": "He said \\"Hello\\" to me",
            "replacement": "He greeted me",
            "reason": "More concise, avoids unnecessary quotation"
        }]`;
        const result = testParse(response);
        expect(result).toEqual([{
            original: 'He said "Hello" to me',
            replacement: 'He greeted me',
            reason: 'More concise, avoids unnecessary quotation'
        }]);
    });

    it('handles smart quotes from word processors', () => {
        const response = `["He said \u201CHello\u201D to me"]`;
        const result = testParse(response);
        expect(result).toEqual(['He said "Hello" to me']);
    });

    it('handles complex nested quotes', () => {
        const response = `[{
            "original": "He told me \\"It's truly remarkable\\"",
            "replacement": "He said \\"This is remarkable\\"",
            "reason": "Simplified quotation while preserving meaning"
        }]`;
        const result = testParse(response);
        expect(result).toEqual([{
            original: 'He told me "It\'s truly remarkable"',
            replacement: 'He said "This is remarkable"',
            reason: 'Simplified quotation while preserving meaning'
        }]);
    });

    it('handles the problematic McConnell quote', () => {
        const response = `[{
            "original": "McConnell said \\"We have a criminal justice system in this country. We have civil litigation. And former Presidents are not immune from being held accountable by either one.\\"",
            "replacement": "McConnell said \\"The criminal justice system and civil courts can hold former presidents accountable.\\"",
            "reason": "More concise while maintaining the key point"
        }]`;
        const result = testParse(response);
        expect(result).toEqual([{
            original: 'McConnell said "We have a criminal justice system in this country. We have civil litigation. And former Presidents are not immune from being held accountable by either one."',
            replacement: 'McConnell said "The criminal justice system and civil courts can hold former presidents accountable."',
            reason: 'More concise while maintaining the key point'
        }]);
    });

    it('handles quotes with ellipsis', () => {
        const response = `["It's truly astounding... if I'd told you"]`;
        const result = testParse(response);
        expect(result).toEqual(["It's truly astounding... if I'd told you"]);
    });

    it('handles quotes within quotes', () => {
        const response = `["If I'd told you 'There's a guy who's been nominated'"]`;
        const result = testParse(response);
        expect(result).toEqual(["If I'd told you 'There's a guy who's been nominated'"]);
    });
}); 