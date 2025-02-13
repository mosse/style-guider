import { useState, useCallback } from 'react';
import { anthropicService } from '../services/anthropic/AnthropicService';

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
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        generateStyleGuide,
        loading,
        error,
    };
}; 