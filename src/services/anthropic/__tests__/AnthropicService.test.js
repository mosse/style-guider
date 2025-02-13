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
            `${process.env.REACT_APP_ANTHROPIC_API_URL}/messages`,
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.REACT_APP_ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                }),
                body: expect.stringContaining(process.env.REACT_APP_ANTHROPIC_MODEL)
            })
        );
        expect(console.error).not.toHaveBeenCalled();
    });

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