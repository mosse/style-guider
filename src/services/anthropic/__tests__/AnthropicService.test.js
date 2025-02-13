import { anthropicService } from '../AnthropicService';
import { AnthropicError } from '../../../utils/errors/AnthropicError';

// Mock fetch globally
global.fetch = jest.fn();

describe('AnthropicService', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
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
            expect.stringContaining('/messages'),
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                })
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
}); 