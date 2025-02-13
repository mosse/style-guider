import { anthropicService } from '../AnthropicService';
import { AnthropicError } from '../../../utils/errors/AnthropicError';

// Mock fetch globally
global.fetch = jest.fn();

describe('AnthropicService', () => {
    const originalEnv = process.env;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        
        // Mock console methods
        console.error = jest.fn();
        console.warn = jest.fn();
        
        // Ensure env variables are set for each test
        process.env = {
            ...originalEnv,
            REACT_APP_ANTHROPIC_API_KEY: 'test-api-key',
            REACT_APP_ANTHROPIC_API_URL: 'https://api.anthropic.com/v1',
            REACT_APP_ANTHROPIC_MODEL: 'claude-3-sonnet-20240229'
        };
    });

    afterEach(() => {
        // Restore original env and console methods after each test
        process.env = originalEnv;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
    });

    /**
     * Tests the happy path where the API call is successful.
     * Verifies:
     * - Correct API endpoint and parameters are used
     * - API key and model are properly included
     * - Response is correctly parsed
     * - No errors are logged
     */
    it('should successfully generate a style guide', async () => {
        const mockResponse = {
            content: [{ text: 'Generated style guide content' }]
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        const result = await anthropicService.generateStyleGuide('Test prompt');
        
        expect(result).toBe('Generated style guide content');
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(
            'http://localhost:3001/api/anthropic/messages',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json'
                }),
                body: expect.stringContaining(process.env.REACT_APP_ANTHROPIC_MODEL)
            })
        );
        expect(console.error).not.toHaveBeenCalled();
    });

    /**
     * Tests the retry mechanism for rate limit errors (429).
     * Verifies:
     * - Service retries after a rate limit error
     * - Succeeds on the second attempt
     * - Properly logs the initial error
     * - Logs a warning about the retry
     * - Returns successful response after retry
     */
    it('should handle API errors with retry', async () => {
        // Mock a rate limit error followed by a success
        global.fetch
            .mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Rate Limited'
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    content: [{ text: 'Success after retry' }]
                })
            });

        const result = await anthropicService.generateStyleGuide('Test prompt');

        expect(result).toBe('Success after retry');
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(console.error).toHaveBeenCalledWith(
            'API Error:',
            expect.objectContaining({
                code: 429,
                name: 'AnthropicError'
            })
        );
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Attempt 1 failed')
        );
    });

    /**
     * Tests handling of non-retryable errors (e.g., 400 Bad Request).
     * Verifies:
     * - Error is not retried
     * - Proper error type is thrown
     * - Error is logged exactly once
     * - Error contains correct status code and details
     */
    it('should throw AnthropicError for non-retryable errors', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            statusText: 'Bad Request'
        });

        await expect(anthropicService.generateStyleGuide('Test prompt'))
            .rejects
            .toThrow(AnthropicError);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith(
            'API Error:',
            expect.objectContaining({
                code: 400,
                name: 'AnthropicError'
            })
        );
        // Should only log once since it's not retryable
        expect(console.error).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests handling of network-level errors (e.g., connection failures).
     * Verifies:
     * - Network errors are retried the maximum number of times
     * - Each attempt is logged
     * - Warnings are issued for retry attempts
     * - Final error is properly transformed into an AnthropicError
     * - Error details include the original network error
     */
    it('should handle network errors with retries', async () => {
        // Mock three consecutive network errors
        global.fetch
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Network error'));

        await expect(anthropicService.generateStyleGuide('Test prompt'))
            .rejects
            .toThrow(AnthropicError);

        // Should try 3 times (initial + 2 retries)
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(console.error).toHaveBeenCalledTimes(3);
        expect(console.warn).toHaveBeenCalledTimes(2);
        expect(console.error).toHaveBeenLastCalledWith(
            'API Error:',
            expect.objectContaining({
                code: 500,
                name: 'AnthropicError',
                details: expect.objectContaining({
                    originalError: 'Network error'
                })
            })
        );
    });

    /**
     * Tests the retry limit for rate limiting errors.
     * Verifies:
     * - Service stops retrying after maximum attempts
     * - Each attempt is properly logged
     * - Warning messages are issued for each retry
     * - Final error maintains the rate limit status
     * - Total number of attempts matches retry configuration
     */
    it('should respect max retries limit for rate limiting', async () => {
        // Mock 3 consecutive 429 errors
        global.fetch
            .mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Rate Limited'
            })
            .mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Rate Limited'
            })
            .mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Rate Limited'
            });

        await expect(anthropicService.generateStyleGuide('Test prompt'))
            .rejects
            .toThrow(AnthropicError);

        // Should try 3 times total (initial + 2 retries)
        expect(fetch).toHaveBeenCalledTimes(3);
        // Should warn about the 2 retry attempts
        expect(console.warn).toHaveBeenCalledTimes(2);
        // Should log an error for each failed attempt
        expect(console.error).toHaveBeenCalledTimes(3);
        // Verify the last error was rate limiting
        expect(console.error).toHaveBeenLastCalledWith(
            'API Error:',
            expect.objectContaining({
                code: 429,
                name: 'AnthropicError'
            })
        );
    });

    /**
     * Tests environment variable validation.
     * Verifies:
     * - Service fails fast if API key is missing
     * - Appropriate error message is thrown
     * - Error occurs during service initialization
     * This prevents making API calls without proper configuration
     */
    it('should throw error if API key is missing', () => {
        // Temporarily remove API key
        const { REACT_APP_ANTHROPIC_API_KEY, ...envWithoutKey } = process.env;
        process.env = envWithoutKey;

        expect(() => {
            // Re-import to trigger validation
            jest.isolateModules(() => {
                require('../AnthropicService');
            });
        }).toThrow('Missing required environment variable: REACT_APP_ANTHROPIC_API_KEY');
    });
}); 