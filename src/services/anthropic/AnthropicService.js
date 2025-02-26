import { ANTHROPIC_CONFIG } from './config';
import { handleApiError, withRetry } from '../../utils/errors/errorHandler';

class AnthropicService {
    constructor() {
        this.apiKey = ANTHROPIC_CONFIG.API_KEY;
        this.model = ANTHROPIC_CONFIG.MODEL;
        // Use relative URL in production, localhost in development
        this.apiUrl = process.env.NODE_ENV === 'production' 
            ? '/api/anthropic'
            : 'http://localhost:3001/api/anthropic';
    }

    async generateStyleGuide(prompt) {
        return withRetry(async () => {
            try {
                const response = await fetch(`${this.apiUrl}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: this.model,
                        max_tokens: 4096,
                        temperature: 0.5,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                    }),
                });

                if (!response.ok) {
                    // Create error with response info but don't handle it yet
                    throw new Error(response.statusText, { cause: response });
                }

                const data = await response.json();
                return data.content[0].text;
            } catch (error) {
                // Handle all errors in one place
                const response = error.cause;
                throw await handleApiError(error, response);
            }
        });
    }

    // Add more methods for different types of requests as needed
}

// Export a singleton instance
export const anthropicService = new AnthropicService(); 