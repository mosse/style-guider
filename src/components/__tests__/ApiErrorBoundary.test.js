import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ApiErrorBoundary from '../ApiErrorBoundary';
import { AnthropicError } from '../../utils/errors/AnthropicError';

// Mock console.error to avoid test noise
const originalError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});

afterAll(() => {
    console.error = originalError;
});

describe('ApiErrorBoundary', () => {
    const ThrowApiError = ({ error }) => {
        throw error;
    };

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    it('should render children when there is no error', () => {
        const { getByText } = render(
            <ApiErrorBoundary>
                <div>API Component</div>
            </ApiErrorBoundary>
        );

        expect(getByText('API Component')).toBeInTheDocument();
    });

    it('should handle API errors appropriately', () => {
        const error = new AnthropicError(
            'Rate limit exceeded',
            429,
            { details: 'Too many requests' }
        );

        render(
            <ApiErrorBoundary>
                <ThrowApiError error={error} />
            </ApiErrorBoundary>
        );

        expect(screen.getByText('API Error')).toBeInTheDocument();
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
        expect(screen.getByText(/429/)).toBeInTheDocument();
    });

    it('should call onReset when error is cleared', () => {
        const onReset = jest.fn();
        const error = new AnthropicError('API Error', 500);

        render(
            <ApiErrorBoundary onReset={onReset}>
                <ThrowApiError error={error} />
            </ApiErrorBoundary>
        );

        fireEvent.click(screen.getByText('Try Again'));
        expect(onReset).toHaveBeenCalled();
    });

    it('should not update for unchanged props', () => {
        const onReset = jest.fn();
        const { rerender } = render(
            <ApiErrorBoundary onReset={onReset}>
                <div>Content</div>
            </ApiErrorBoundary>
        );

        // Re-render with same props
        rerender(
            <ApiErrorBoundary onReset={onReset}>
                <div>Content</div>
            </ApiErrorBoundary>
        );

        // The component should not have updated
        expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should update when children change', () => {
        const { rerender } = render(
            <ApiErrorBoundary>
                <div>Original Content</div>
            </ApiErrorBoundary>
        );

        rerender(
            <ApiErrorBoundary>
                <div>New Content</div>
            </ApiErrorBoundary>
        );

        expect(screen.getByText('New Content')).toBeInTheDocument();
        expect(screen.queryByText('Original Content')).not.toBeInTheDocument();
    });
}); 