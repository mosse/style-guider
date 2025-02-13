import { useState, useCallback } from 'react';
import { anthropicService } from '../services/anthropic/AnthropicService';
import { AnthropicError } from '../utils/errors/AnthropicError';

export const useAnthropicApi = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateStyleGuide = useCallback(async (prompt) => {
        setLoading(true);
        setError(null);
        try {
            const response = await anthropicService.generateStyleGuide(prompt);
            return response;
        } catch (err) {
            const error = err instanceof AnthropicError ? err : new AnthropicError(err.message);
            setError({
                message: error.message,
                code: error.code,
                details: error.details,
                timestamp: error.timestamp
            });
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        generateStyleGuide,
        loading,
        error,
        clearError,
    };
}; 