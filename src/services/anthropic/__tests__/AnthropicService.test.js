import { anthropicService } from '../AnthropicService';
import { AnthropicError } from '../../../utils/errors/AnthropicError';

// Mock fetch globally
global.fetch = jest.fn();

describe('AnthropicService', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        
        // Ensure env variables are set for each test
        process.env = {
            ...originalEnv,
            REACT_APP_ANTHROPIC_API_KEY: 'test-api-key',
            REACT_APP_ANTHROPIC_API_URL: 'https://api.anthropic.com/v1',
            REACT_APP_ANTHROPIC_MODEL: 'claude-3-sonnet-20240229'
        };
    });

    afterEach(() => {
        // Restore original env after each test
        process.env = originalEnv;
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
    });

    it('should handle network errors', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(anthropicService.generateStyleGuide('Test prompt'))
            .rejects
            .toThrow(AnthropicError);

        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries limit', async () => {
        // Mock 4 consecutive 429 errors
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

        expect(fetch).toHaveBeenCalledTimes(3); // Default max retries is 3
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