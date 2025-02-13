import { ANTHROPIC_CONFIG } from './config';
import { handleApiError, withRetry } from '../../utils/errors/errorHandler';

class AnthropicService {
    constructor() {
        this.apiKey = ANTHROPIC_CONFIG.API_KEY;
        this.apiUrl = ANTHROPIC_CONFIG.API_URL;
        this.model = ANTHROPIC_CONFIG.MODEL;
    }

    async generateStyleGuide(prompt) {
        return withRetry(async () => {
            try {
                const response = await fetch(`${this.apiUrl}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: this.model,
                        max_tokens: 4096,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                    }),
                });

                if (!response.ok) {
                    throw await handleApiError(new Error(response.statusText), response);
                }

                const data = await response.json();
                return data.content[0].text;
            } catch (error) {
                throw await handleApiError(error);
            }
        });
    }

    // Add more methods for different types of requests as needed
}

// Export a singleton instance
export const anthropicService = new AnthropicService(); 