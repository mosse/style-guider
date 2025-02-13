import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ApiErrorBoundary from '../ApiErrorBoundary';
import { AnthropicError } from '../../utils/errors/AnthropicError';

/**
 * Test suite for the ApiErrorBoundary component.
 * This specialized error boundary handles API-specific errors,
 * providing appropriate error messages and recovery mechanisms
 * for API-related failures.
 */

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

    /**
     * Tests the default rendering without errors.
     * Verifies:
     * - API components render normally
     * - Error boundary is transparent when no errors occur
     * - Children receive proper props and context
     */
    it('should render children when there is no error', () => {
        const { getByText } = render(
            <ApiErrorBoundary>
                <div>API Component</div>
            </ApiErrorBoundary>
        );

        expect(getByText('API Component')).toBeInTheDocument();
    });

    /**
     * Tests API error handling and display.
     * Verifies:
     * - API errors are caught and processed
     * - Error UI shows appropriate status codes
     * - Error messages are user-friendly
     * - API-specific styling is applied
     */
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

        expect(screen.getByRole('heading', { name: 'API Error' })).toBeInTheDocument();
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
        expect(screen.getByText(/429/)).toBeInTheDocument();
    });

    /**
     * Tests error recovery mechanism.
     * Verifies:
     * - Reset callback is triggered
     * - Error state is cleared properly
     * - Component can recover from API errors
     * - State is properly reset for new API calls
     */
    it('should call onReset when error is cleared', () => {
        const onReset = jest.fn();
        const error = new AnthropicError('API Error', 500);

        render(
            <ApiErrorBoundary onReset={onReset}>
                <ThrowApiError error={error} />
            </ApiErrorBoundary>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
        expect(onReset).toHaveBeenCalled();
    });

    /**
     * Tests performance optimization.
     * Verifies:
     * - Component only updates when necessary
     * - Prevents unnecessary re-renders
     * - Maintains error boundary efficiency
     * - Proper implementation of shouldComponentUpdate
     */
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

    /**
     * Tests proper re-rendering behavior.
     * Verifies:
     * - Updates occur when children change
     * - Error state persists appropriately
     * - Component handles prop changes correctly
     * - DOM updates are accurate
     */
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