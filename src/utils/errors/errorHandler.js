import { AnthropicError } from './AnthropicError';

export const handleApiError = async (error, response = null) => {
    // Convert to AnthropicError if it isn't already
    const anthropicError = error instanceof AnthropicError
        ? error
        : AnthropicError.fromApiError(error, response);

    // Log error details (you might want to send this to a logging service)
    console.error('API Error:', {
        name: anthropicError.name,
        message: anthropicError.message,
        code: anthropicError.code,
        details: anthropicError.details,
        timestamp: anthropicError.timestamp,
    });

    // You could add additional error handling here
    // For example, reporting to an error tracking service
    // if (process.env.REACT_APP_SENTRY_DSN) {
    //     Sentry.captureException(anthropicError);
    // }

    return anthropicError;
};

export const isRetryableError = (error) => {
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    return retryableCodes.includes(error.code);
};

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const withRetry = async (fn, maxRetries = 3, baseDelay = 1000) => {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (!isRetryableError(error) || attempt === maxRetries - 1) {
                throw error;
            }

            // Exponential backoff with jitter
            const jitter = Math.random() * 200;
            const delayTime = (baseDelay * Math.pow(2, attempt)) + jitter;
            
            console.warn(`Attempt ${attempt + 1} failed, retrying in ${delayTime}ms`);
            await delay(delayTime);
        }
    }

    throw lastError;
}; 