export class AnthropicError extends Error {
    constructor(message, code, details = null) {
        super(message);
        this.name = 'AnthropicError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    static fromApiError(error, response = null) {
        const code = response?.status || 500;
        const details = {
            originalError: error.message,
            response: response ? {
                status: response.status,
                statusText: response.statusText,
            } : null,
        };

        return new AnthropicError(
            this.getErrorMessage(code, error.message),
            code,
            details
        );
    }

    static getErrorMessage(code, defaultMessage) {
        const errorMessages = {
            400: 'Invalid request to Anthropic API',
            401: 'Unauthorized: Please check your API key',
            403: 'Forbidden: You don\'t have permission to access this resource',
            404: 'Resource not found',
            429: 'Rate limit exceeded. Please try again later',
            500: 'Anthropic API internal server error',
            503: 'Anthropic API service unavailable',
            504: 'Gateway timeout: The server took too long to respond. This may happen for complex requests.'
        };

        return errorMessages[code] || defaultMessage || 'An unexpected error occurred';
    }
} 